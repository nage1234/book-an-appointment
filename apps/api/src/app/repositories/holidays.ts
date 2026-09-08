import { pool } from '@app/db';

export async function holidaysInRange(startIso: string, endIso: string): Promise<string[]> {
  const { rows } = await pool.query(
    `select to_char(holiday_date, 'YYYY-MM-DD') as d
       from holidays where holiday_date between $1 and $2`,
    [startIso, endIso]
  );
  return rows.map((r) => r.d as string);
}
