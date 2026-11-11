-- Hevy-Workouts aus dem geplanten Sync-Task (ein JSON pro Workout, gleiche Form wie die Edge Function "hevy").
-- Eigener Tabellenname, weil im Projekt bereits eine anders aufgebaute Tabelle "hevy_workouts" existiert.
-- Im Supabase-Dashboard unter "SQL Editor" einmalig ausführen.

create table if not exists public.hevy_sync_workouts (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  id         text        not null,
  date       date        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists hevy_sync_workouts_user_date on public.hevy_sync_workouts (user_id, date);

alter table public.hevy_sync_workouts enable row level security;
grant select on public.hevy_sync_workouts to authenticated;

drop policy if exists "hevy_sync_workouts_select_own" on public.hevy_sync_workouts;
create policy "hevy_sync_workouts_select_own" on public.hevy_sync_workouts
  for select using (auth.uid() = user_id);
