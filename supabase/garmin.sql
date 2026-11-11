-- Garmin-Tagesdaten (ein JSON-Dokument pro Nutzer und Tag), befüllt durch den Garmin-Sync.
-- Im Supabase-Dashboard unter "SQL Editor" einmalig ausführen.

create table if not exists public.garmin_days (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  date       date        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.garmin_days enable row level security;
grant select on public.garmin_days to authenticated;

-- Die App liest nur die eigenen Zeilen; geschrieben wird serverseitig (Service-Rolle).
drop policy if exists "garmin_days_select_own" on public.garmin_days;
create policy "garmin_days_select_own" on public.garmin_days
  for select using (auth.uid() = user_id);
