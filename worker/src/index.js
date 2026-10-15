import pool from './db.js';
import { checkSite } from './checks.js';
import { sendAlert } from './mailer.js';

const INTERVAL_MIN = Number(process.env.CHECK_INTERVAL_MINUTES || 5);

async function runOnce() {
  const { rows: sites } = await pool.query('select id, name, url from sites');

  for (const site of sites) {
    const prev = await pool.query(
      'select status from checks where site_id = $1 order by checked_at desc limit 1',
      [site.id]
    );
    const wasUp = !prev.rows[0] || prev.rows[0].status === 'up';

    const result = await checkSite(site.url);

    await pool.query(
      `insert into checks (site_id, status, http_status, response_ms, ssl_days_remaining, error)
       values ($1, $2, $3, $4, $5, $6)`,
      [site.id, result.status, result.httpStatus, result.responseMs, result.sslDaysRemaining, result.error]
    );

    // only alert on the up -> not-up transition, so a sustained outage
    // doesn't re-email on every interval
    if (wasUp && result.status !== 'up') {
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

    console.log(`[${new Date().toISOString()}] ${site.name}: ${result.status}`);
  }
}

runOnce().catch((err) => console.error('check run failed:', err));
setInterval(() => {
  runOnce().catch((err) => console.error('check run failed:', err));
}, INTERVAL_MIN * 60 * 1000);
