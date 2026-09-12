import { pool } from '@app/db';

export interface HolidayRow {
  holiday_date: string; // YYYY-MM-DD
  description: string;
}

export async function holidaysInRange(startIso: string, endIso: string): Promise<string[]> {
  const { rows } = await pool.query(
    `select to_char(holiday_date, 'YYYY-MM-DD') as d
       from holidays where holiday_date between $1 and $2`,
    [startIso, endIso]
  );
  return rows.map((r) => r.d as string);
}

export async function listHolidays(): Promise<HolidayRow[]> {
  const { rows } = await pool.query(
    `select to_char(holiday_date, 'YYYY-MM-DD') as holiday_date, description
       from holidays order by holiday_date`
  );
  return rows;
}

export async function holidayExists(dateIso: string): Promise<boolean> {
  const { rows } = await pool.query(`select 1 from holidays where holiday_date = $1`, [dateIso]);
  return rows.length > 0;
}

export async function insertHoliday(dateIso: string, description: string): Promise<HolidayRow> {
  const { rows } = await pool.query(
    `insert into holidays (holiday_date, description) values ($1, $2)
     returning to_char(holiday_date, 'YYYY-MM-DD') as holiday_date, description`,
    [dateIso, description]
  );
  return rows[0];
}

export async function deleteHoliday(dateIso: string): Promise<number> {
  const { rowCount } = await pool.query(`delete from holidays where holiday_date = $1`, [dateIso]);
  return rowCount ?? 0;
}
