-- Essen: Cloud-Speicher für den Tracker-Stand (ein JSON-Dokument pro Nutzer).
-- Im Supabase-Dashboard unter "SQL Editor" einmalig ausführen.

create table if not exists public.essen_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb        not null default '{}'::jsonb,
  updated_at timestamptz  not null default now()
);

alter table public.essen_state enable row level security;

-- Jeder Nutzer sieht und ändert ausschließlich seine eigene Zeile.
drop policy if exists "essen_state_select_own" on public.essen_state;
create policy "essen_state_select_own" on public.essen_state
  for select using (auth.uid() = user_id);

drop policy if exists "essen_state_insert_own" on public.essen_state;
create policy "essen_state_insert_own" on public.essen_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "essen_state_update_own" on public.essen_state;
create policy "essen_state_update_own" on public.essen_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "essen_state_delete_own" on public.essen_state;
create policy "essen_state_delete_own" on public.essen_state
  for delete using (auth.uid() = user_id);
