---
name: db-migration
description: Create and run a Postgres schema migration against Supabase using node-pg-migrate and the direct connection string. Use when changing the database schema or seed data.
---

# Database migration

Schema lives in [docs/schema.md](../../../docs/schema.md). DB is **Supabase Postgres**,
reached directly from Node with `pg` — no Supabase SDK. Migrations run with
**node-pg-migrate**.

## Setup (once, M1)

- Migrations dir: `db/migrations`.
- `package.json` scripts:
  ```json
  "migrate": "node-pg-migrate -j sql --envPath .env",
  "migrate:up": "npm run migrate up",
  "migrate:down": "npm run migrate down",
  "migrate:new": "node-pg-migrate create -j sql --"
  ```
- Connection: `DATABASE_URL` in `.env` (the Supabase **Direct Connection** string,
  `db.<ref>.supabase.co:5432`). node-pg-migrate reads it automatically.
- SSL: Supabase requires TLS. Set `PGSSLMODE=require` in `.env`, or add
  `?sslmode=require` to `DATABASE_URL`. The app's `pg` Pool uses
  `ssl: { rejectUnauthorized: false }`.

## Create a migration

```
npm run migrate:new -- add_appointments_table
```
Edit the generated `db/migrations/<timestamp>_add_appointments_table.sql`:

- Write **both** `-- Up Migration` and `-- Down Migration` sections.
- Use `IF NOT EXISTS` / `IF EXISTS` where sensible.
- Enums: `CREATE TYPE appointment_status AS ENUM (...)` in Up, `DROP TYPE` in Down.
- The one‑booking‑per‑slot rule is a partial unique index:
  ```sql
  CREATE UNIQUE INDEX appointments_active_slot_uq
    ON appointments (appointment_date, slot)
    WHERE status <> 'cancelled';
  ```

## Run

```
npm run migrate:up      # apply pending
npm run migrate:down    # roll back the last one
```

Migrations are tracked in the `pgmigrations` table on Supabase. Never edit an
already‑applied migration — add a new one.

## Seed data

Keep seeds as ordinary migrations (idempotent `INSERT ... ON CONFLICT DO NOTHING`):
one admin `customers` row (bcrypt the password), current‑year `holidays` rows.

## Checklist

- [ ] Up and Down both written and tested (`up` then `down` then `up`)
- [ ] Ran against Supabase over SSL successfully
- [ ] Matches [docs/schema.md](../../../docs/schema.md) — update that doc if the schema changed
- [ ] No secrets committed; `.env` is git‑ignored
