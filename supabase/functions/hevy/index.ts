// Supabase Edge Function "hevy":
// Holt die letzten Workouts aus der offiziellen Hevy-API (Secret HEVY_API_KEY)
// und gibt sie in einer kompakten Form an die App zurück. Nur für angemeldete Nutzer.
//
// Deploy:  supabase functions deploy hevy
// Secret:  supabase secrets set HEVY_API_KEY=...   (Hevy → Settings → Developer → API Key)

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const HEVY = "https://api.hevyapp.com/v1";
const MAX_PAGES = 10;

type HevySet = { type?: string; weight_kg?: number | null; reps?: number | null; duration_seconds?: number | null; distance_meters?: number | null };
type HevyExercise = { title?: string; sets?: HevySet[] };
type HevyWorkout = { id: string; title?: string; description?: string; start_time: string; end_time?: string; exercises?: HevyExercise[] };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function normalize(w: HevyWorkout) {
  const start = Date.parse(w.start_time), end = w.end_time ? Date.parse(w.end_time) : NaN;
  const durationMin = isFinite(start) && isFinite(end) && end > start ? Math.round((end - start) / 60000) : null;
  let setCount = 0, volumeKg = 0, distanceM = 0, durationSetsS = 0;
  const exercises = (w.exercises ?? []).map((ex) => {
    const sets = (ex.sets ?? []).filter((s) => s.type !== "warmup");
    let vol = 0, best = "", bestScore = -1;
    for (const s of sets) {
      const kg = Number(s.weight_kg ?? 0), reps = Number(s.reps ?? 0);
      if (kg > 0 && reps > 0) { vol += kg * reps; if (kg * (1 + reps / 30) > bestScore) { bestScore = kg * (1 + reps / 30); best = `${kg} kg × ${reps}`; } }
      else if (reps > 0 && !best) best = `${reps} Wdh.`;
      if (s.distance_meters) distanceM += Number(s.distance_meters);
      if (s.duration_seconds) durationSetsS += Number(s.duration_seconds);
    }
    setCount += sets.length; volumeKg += vol;
    return { title: String(ex.title ?? "").slice(0, 80), sets: sets.length, volumeKg: Math.round(vol), best };
  });
  return {
    id: w.id, title: String(w.title ?? "Workout").slice(0, 120), description: String(w.description ?? "").slice(0, 300),
    start: w.start_time, end: w.end_time ?? null, durationMin, exerciseCount: exercises.length, setCount,
    volumeKg: Math.round(volumeKg), distanceM: Math.round(distanceM), exercises,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Nur POST." });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Nicht angemeldet." });
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json(401, { error: "Nicht angemeldet." });

  const apiKey = Deno.env.get("HEVY_API_KEY");
  if (!apiKey) return json(500, { error: "HEVY_API_KEY ist auf dem Server nicht gesetzt (Supabase → Edge Functions → Secrets)." });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* leer erlaubt */ }
  const sinceMs = Date.parse(String(body.since ?? "")) || Date.now() - 30 * 86400000;

  const out: ReturnType<typeof normalize>[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(`${HEVY}/workouts?page=${page}&pageSize=10`, { headers: { "api-key": apiKey, "Accept": "application/json" } });
      if (res.status === 401 || res.status === 403) return json(502, { error: "Hevy lehnt den API-Key ab (401/403)." });
      if (!res.ok) return json(502, { error: `Hevy-API-Fehler (${res.status}).` });
      const data = await res.json() as { page?: number; page_count?: number; workouts?: HevyWorkout[] };
      const list = data.workouts ?? [];
      let stop = false;
      for (const w of list) {
        if (Date.parse(w.start_time) < sinceMs) { stop = true; break; }
        out.push(normalize(w));
      }
      if (stop || !list.length || (data.page_count && page >= data.page_count)) break;
    }
  } catch (e) {
    return json(502, { error: "Keine Verbindung zur Hevy-API: " + ((e as Error)?.message ?? "") });
  }
  return json(200, { workouts: out });
});
