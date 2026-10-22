import pool from './db.js';

const RETENTION_DAYS = Number(process.env.CHECK_RETENTION_DAYS || 90);

export async function pruneOldChecks() {
  const { rowCount } = await pool.query(
    `delete from checks where checked_at < now() - ($1 || ' days')::interval`,
    [RETENTION_DAYS]
  );
  if (rowCount > 0) {
    console.log(`[retention] pruned ${rowCount} check rows older than ${RETENTION_DAYS} days`);
  }
}
