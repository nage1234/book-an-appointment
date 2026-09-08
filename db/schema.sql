-- Idempotent. Completes the hand-created public schema. See docs/schema.md.
-- Safe to re-run: everything is additive / guarded.

-- 1. holidays (admin-managed clinic closures) --------------------------------
create table if not exists holidays (
  holiday_date date        primary key,
  description  text        not null default '',
  created_at   timestamptz not null default now()
);

-- 2. appointments.patient_id -> patients.id FK -------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_patient_id_fkey') then
    alter table appointments
      add constraint appointments_patient_id_fkey
      foreign key (patient_id) references patients (id);
  end if;
end $$;

-- 3. one active booking per (date, slot) -----------------------------------
create unique index if not exists appointments_active_slot_uq
  on appointments (appointment_date, slot)
  where status = 'booked';

-- 4. tighten nullability / defaults (only while the tables are empty) -------
do $$
begin
  if (select count(*) from appointments) = 0 then
    alter table appointments alter column patient_id       set not null;
    alter table appointments alter column appointment_date set not null;
    alter table appointments alter column slot             set not null;
    alter table appointments alter column status           set default 'booked';
    alter table appointments alter column status           set not null;
    alter table appointments alter column created_by       set default 'customer';
    alter table appointments alter column created_by       set not null;
    alter table appointments alter column updated_at       set default now();
  end if;

  if (select count(*) from patients) = 0 then
    alter table patients alter column customer_id set not null;
    alter table patients alter column name        set not null;
    alter table patients alter column relation    set not null;
  end if;
end $$;
