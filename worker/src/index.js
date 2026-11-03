import pool from './db.js';
import { checkSite } from './checks.js';
import { sendAlert } from './mailer.js';
import { pruneOldChecks } from './retention.js';

const INTERVAL_MIN = Number(process.env.CHECK_INTERVAL_MINUTES || 5);
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000; // once a day
const CONSECUTIVE_THRESHOLD = 2; //checks must agree before we alert

async function runOnce() {
  const { rows: sites } = await pool.query('select id, name, url from sites');

  for (const site of sites) {
    // how many consecutive non-up checks immediately precede this one
    const { rows: recent } = await pool.query(
      'select status from checks where site_id = $1 order by checked_at desc limit 10',
      [site.id]
    );
    let downStreak = 0;
    for (const row of recent) {
      if (row.status !== 'up') downStreak++;
      else break;
    }

    const result = await checkSite(site.url);

    await pool.query(
      `insert into checks (site_id, status, http_status, response_ms, ssl_days_remaining, error)
       values ($1, $2, $3, $4, $5, $6)`,
      [site.id, result.status, result.httpStatus, result.responseMs, result.sslDaysRemaining, result.error]
    );

    if (result.status !== 'up') {
      const newStreak = downStreak + 1;
      // only alert the moment the outage is confirmed (crosses the threshold),
      // not on the first blip and not again on every check during a sustained outage
      if (newStreak === CONSECUTIVE_THRESHOLD) {
        const subject = `${site.name} is ${result.status}`;
        const body = [
          `${site.url} returned ${result.httpStatus ?? 'no response'}.`,
          result.error ? `Error: ${result.error}` : null,
          `Checked at ${new Date().toISOString()}.`
        ]
          .filter(Boolean)
          .join('\n');

        sendAlert(subject, body).catch((err) => console.error('alert email failed:', err));
      }
    } else if (downStreak >= CONSECUTIVE_THRESHOLD) {
      // only send a recovery alert if the outage was actually confirmed/alerted in the first place
      const subject = `${site.name} is back up`;
      const body = [
        `${site.url} is responding normally again (HTTP ${result.httpStatus ?? 'unknown'}).`,
        `Checked at ${new Date().toISOString()}.`
      ].join('\n');

      sendAlert(subject, body).catch((err) => console.error('alert email failed:', err));
    }

    console.log(`[${new Date().toISOString()}] ${site.name}: ${result.status}`);
  }
}

runOnce().catch((err) => console.error('check run failed:', err));
setInterval(() => {
  runOnce().catch((err) => console.error('check run failed:', err));
}, INTERVAL_MIN * 60 * 1000);

pruneOldChecks().catch((err) => console.error('retention prune failed:', err));
setInterval(() => {
  pruneOldChecks().catch((err) => console.error('retention prune failed:', err));
}, PRUNE_INTERVAL_MS);
