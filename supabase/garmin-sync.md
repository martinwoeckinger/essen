# Garmin- & Hevy-Sync (geplanter Claude-Task)

Eingerichtet als geplanter Task „Garmin- & Hevy-Sync → Essen-App (2× täglich)“,
08:20 und 22:20 Uhr (Europe/Vienna), mit den Connectoren Garmin („Missing MCP“)
und Hevy. Der Task schreibt Garmin-Tagesdaten (heute + 3 Vortage, Aktivitäten der
letzten 14 Tage) nach `garmin_days` und Hevy-Workouts der letzten 7 Tage nach
`hevy_sync_workouts` (gleiche JSON-Form wie die Edge Function `hevy`; ältere
Workouts bleiben in der Tabelle). Das 7-Tage-Fenster hält den Lauf kurz: Der
Großteil der Kosten eines Laufs ist das Übertragen der Workout-Details. Die vollständige Task-Anweisung steht im Task selbst; dieses
Dokument beschreibt Ablauf und Datenformat.

Garmin bietet keine offizielle API für Endnutzer, und der Login der inoffiziellen
Bibliotheken wird von Garmin inzwischen blockiert. Deshalb läuft der Abgleich über
den **Garmin-Connector** in Claude: Ein geplanter Claude-Task liest die Tagesdaten
über die Connector-Werkzeuge und schreibt sie in die Supabase-Tabelle
`public.garmin_days` (Schema in [`garmin.sql`](garmin.sql)). Die App liest nur.

## Was der Task pro Lauf tut

1. Datumsliste: heute und die letzten 3 Tage (Tagesdaten ändern sich nachträglich,
   z. B. durch späte Synchronisation der Uhr).
2. Pro Datum über den Garmin-Connector abrufen:
   - `get_user_summary(date)` → Schritte, Verbrauch, Ruhepuls, Stress, Body Battery
   - `get_sleep_summary(date)` → Schlafdauer, Score, Phasen, HRV
3. Einmal `get_activities_by_date(start=heute−14 Tage, end=heute)` → Aktivitäten,
   dem Tag ihres `start_time` zuordnen.
4. Pro Datum ein JSON im Format unten bauen und per Supabase-Management-API
   (`POST /v1/projects/jfseqzzsobwdjpdwwsye/database/query`) als
   `insert … on conflict (user_id, date) do update` schreiben. Die `user_id` ist die
   ID des bestätigten Nutzers in `auth.users`.

## JSON-Format je Tag (`data`)

```json
{
  "steps": 11674, "stepGoal": 10210,
  "totalKcal": 2398, "activeKcal": 354, "bmrKcal": 2044,
  "restingHr": 42, "minHr": 40, "maxHr": 124,
  "stressAvg": 36, "intensityMin": 2, "floors": 13.5,
  "bodyBattery": { "high": 87, "low": 9, "atWake": 82, "charged": 68, "drained": 78 },
  "sleep": { "hours": 5.67, "score": 76, "deepPct": 26.8, "remPct": 15.3, "hrv": 68 },
  "activities": [
    { "id": 24917994626, "name": "Ágfalva Gehen", "type": "walking",
      "start": "2026-10-31 10:51:08", "durationMin": 292, "kcal": 862,
      "avgHr": 68, "distanceKm": 11.7, "steps": 15428 }
  ],
  "syncedAt": "2026-11-11T07:50:00Z"
}
```

Feld-Mapping aus `get_user_summary`: `totalSteps → steps`, `dailyStepGoal → stepGoal`,
`totalKilocalories → totalKcal`, `activeKilocalories → activeKcal`,
`bmrKilocalories → bmrKcal`, `restingHeartRate → restingHr`, `minHeartRate/maxHeartRate`,
`averageStressLevel → stressAvg`, `moderateIntensityMinutes + vigorousIntensityMinutes → intensityMin`,
`floorsAscended → floors`, `bodyBatteryHighestValue/LowestValue/AtWakeTime/ChargedValue/DrainedValue`.
Aus `get_sleep_summary`: `sleep_hours → hours`, `sleep_score → score`,
`deep_sleep_percent → deepPct`, `rem_sleep_percent → remPct`, `avg_overnight_hrv → hrv`.
Aus Aktivitäten: `duration_seconds / 60 → durationMin` (gerundet), `calories → kcal`,
`avg_hr_bpm → avgHr`, `distance_meters / 1000 → distanceKm` (eine Nachkommastelle).

Ein Tag ohne Tageswerte, aber mit Aktivitäten, enthält nur `activities` und `syncedAt`.

## In der App

- Dashboard und Heute-Seitenpanel: Karte „Garmin“ mit Verbrauch, aktiven kcal,
  Schritten, Ruhepuls, Schlaf, Body Battery und der Bilanz „gegessen − Verbrauch“.
  Aktivitäten lassen sich per Klick als Trainingseinheit übernehmen (Kalorien von
  Garmin, Dubletten erkannt über die Garmin-ID).
- Analyse: Ø-Werte über den Zeitraum, Bilanz laut Garmin im Vergleich zur
  Budget-Prognose, Schritte pro Tag.
- Der Wochenbericht bekommt die Garmin-Werte mit.
