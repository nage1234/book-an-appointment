import { Pool, types } from 'pg';

// Return bigint (OID 20) as a JS number. Safe until ids exceed 2^53 - far off
// for this app - and keeps ids as `number` end to end (matches @baa/types).
types.setTypeParser(20, (v) => parseInt(v, 10));

// Supabase requires TLS; its direct-connection cert isn't in Node's trust store.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/** Connectivity check for GET /api/health. */
export async function pingDb(): Promise<boolean> {
  try {
    await pool.query('select 1');
    return true;
  } catch (err) {
    console.error('DB ping failed:', (err as Error).message);
    return false;
  }
}
