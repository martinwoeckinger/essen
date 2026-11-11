// Supabase Edge Function "report":
// Schreibt aus den Wochendaten des Trackers einen kurzen Wochenbericht
// (Einordnung + zwei konkrete Hinweise). Nur für angemeldete Nutzer.
//
// Deploy:  supabase functions deploy report   (Secret ANTHROPIC_API_KEY wie bei "nutrition")

import Anthropic from "npm:@anthropic-ai/sdk@1.7.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MODEL = "claude-opus-5-5";

const SYSTEM = `Du bist ein sachlicher Ernährungs- und Trainingscoach und schreibst für einen deutschsprachigen Kalorientracker einen kurzen Wochenbericht.

Du bekommst die Daten einer Kalenderwoche als JSON: pro Tag Kalorien und Budget, Makros, Ballaststoffe/Zucker/Salz, Essenszeiten (erste/letzte Mahlzeit, Essensfenster, Nachtfasten, Anteil nach 20 Uhr), Mahlzeitenverteilung, kalorienreichste Lebensmittel, Sport und ob es ein Trainingstag war. Dazu Profil, Ziele und persönliche Hinweise.

Schreib auf Deutsch, in Du-Form, 120 bis 180 Wörter:
1. Ein Absatz Einordnung (3–4 Sätze): Budget-Treue, Eiweiß im Verhältnis zum Ziel und zum Körpergewicht, auffällige Muster (bestimmte Wochentage, Trainings- vs. Ruhetage, späte Mahlzeiten, lange oder kurze Essensfenster, einzelne Lebensmittel mit großem Anteil). Nenne konkrete Zahlen aus den Daten.
2. Dann genau zwei konkrete, kleine Hinweise für die nächste Woche als Liste (Zeilen beginnen mit "- "). Jeder Hinweis soll am Verhalten ansetzen, nicht an Wissen, und zu den persönlichen Hinweisen passen.

Keine Floskeln, keine Lobhudelei, keine Diagnosen, keine Überschriften, kein Markdown außer der Liste. Wenn nur wenige Tage erfasst sind, sag das in einem Halbsatz und bleib vorsichtig mit Schlüssen.`;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Nur POST." });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Nicht angemeldet." });
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json(401, { error: "Nicht angemeldet." });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json(500, { error: "ANTHROPIC_API_KEY ist auf dem Server nicht gesetzt." });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "Ungültige Anfrage (kein JSON)." }); }
  const days = Array.isArray(body.days) ? body.days : [];
  if (!days.some((d) => d && (d as { tracked?: boolean }).tracked)) return json(400, { error: "Keine erfassten Tage in dieser Woche." });

  const payload = JSON.stringify({ week: body.week, profile: body.profile, goals: body.goals, preferences: String(body.preferences ?? "").slice(0, 1000), days }).slice(0, 60000);

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: SYSTEM,
      messages: [{ role: "user", content: `Wochendaten:\n${payload}` }],
    });
    if (response.stop_reason === "refusal") return json(422, { error: "Anfrage wurde vom Modell abgelehnt." });
    const text = response.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n").trim();
    if (!text) return json(502, { error: "Keine Antwort vom Modell." });
    return json(200, { text, model: response.model, usage: { input: response.usage.input_tokens, output: response.usage.output_tokens } });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json(429, { error: "Claude ist gerade ausgelastet – bitte kurz warten." });
    if (e instanceof Anthropic.AuthenticationError) return json(500, { error: "ANTHROPIC_API_KEY wird von Anthropic abgelehnt." });
    if (e instanceof Anthropic.APIConnectionError) return json(502, { error: "Keine Verbindung zur Claude-API." });
    if (e instanceof Anthropic.APIError) return json(502, { error: `Claude-API-Fehler (${e.status ?? "?"}): ${e.message}` });
    return json(500, { error: (e as Error)?.message ?? "Unbekannter Fehler." });
  }
});
