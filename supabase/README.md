# Supabase-Setup (Cloud-Sync & KI-Erfassung)

Projekt: `jfseqzzsobwdjpdwwsye` → `https://jfseqzzsobwdjpdwwsye.supabase.co`

Einmalig einzurichten, in dieser Reihenfolge:

## 1. Tabelle anlegen

Supabase-Dashboard → **SQL Editor** → Inhalt von [`schema.sql`](schema.sql)
einfügen und ausführen. Legt `public.essen_state` (eine JSON-Zeile pro Nutzer)
samt Row-Level-Security an: jeder Nutzer sieht nur seine eigene Zeile.

## 2. Login per E-Mail

Dashboard → **Authentication → Providers → Email** ist standardmäßig aktiv.
Empfehlung für den privaten Gebrauch:

- **Confirm email** darf an bleiben (du bekommst nach „Registrieren“ eine
  Bestätigungs-Mail).
- Unter **Authentication → URL Configuration** die **Site URL** auf
  `https://martinwoeckinger.github.io/essen/` setzen (nötig für Magic-Link und
  Bestätigungs-Mails). Zusätzlich `http://localhost:*` als Redirect-URL, wenn
  du lokal testest.
- Optional: **Sign-ups** nach deiner Registrierung deaktivieren
  (Authentication → Settings → *Allow new users to sign up*), damit niemand
  sonst ein Konto anlegen kann.

## 3. Edge Function für Claude deployen

Benötigt die [Supabase CLI](https://supabase.com/docs/guides/cli). Im Repo-Root:

```bash
supabase login
```

```bash
supabase link --project-ref jfseqzzsobwdjpdwwsye
```

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-DEIN-KEY
```

```bash
supabase functions deploy nutrition
```

Der Claude-Key liegt danach nur als Secret auf Supabase (alternativ im
Dashboard unter **Edge Functions → Secrets** eintragen). Die Function
akzeptiert ausschließlich Anfragen angemeldeter Nutzer (sie prüft das JWT
selbst per `auth.getUser`) und ruft
`claude-opus-5-5` mit Structured Outputs auf, sodass die Antwort garantiert im
Spaltenformat der App ankommt. Refusal-Fallbacks sind aktiviert
(`fallbacks: "default"`): lehnt das Modell eine Anfrage ab, übernimmt
serverseitig ein Ersatzmodell.

Logs: Dashboard → **Edge Functions → nutrition → Logs**.

## 4. Anon-Key in die App eintragen

Dashboard → **Project Settings → API** → *Project API keys* → `anon public`
kopieren und in [`../config.js`](../config.js) bei `supabaseAnonKey` eintragen
(für dieses Projekt bereits erledigt). Der Anon-Key ist öffentlich (er steht in
jeder Supabase-Web-App im Quelltext); die Sicherheit kommt aus Login +
Row-Level-Security.

Alternativ lässt sich der Key in der App unter **Profil → Cloud & KI**
einmalig eintragen (wird nur in diesem Browser gespeichert).

## Wie die App synchronisiert

- `localStorage` bleibt Offline-Cache. Nach dem Login wird der Cloud-Stand
  geladen; der jeweils **neuere Stand gewinnt** (Zeitstempel).
- Jede Änderung wird ca. eine Sekunde später hochgeladen. Ein Upload
  überschreibt nie einen neueren Cloud-Stand (bedingtes Update); in dem Fall
  wird stattdessen der Cloud-Stand übernommen.
- Beim Tab-Wechsel/Fokus und alle 90 s wird der Cloud-Stand nachgeladen, damit
  Änderungen vom Handy am Desktop ankommen.
- Nicht synchronisiert wird nur die Darstellung (Hell/Dunkel, eingeklappte
  Mahlzeiten).
- Bevor ein Cloud-Stand lokale, noch nie hochgeladene Daten ersetzt, legt die
  App eine Kopie unter dem localStorage-Key `essen-prev-local` ab.
