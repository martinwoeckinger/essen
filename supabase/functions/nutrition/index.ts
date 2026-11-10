// Supabase Edge Function "nutrition":
// Nimmt eine freie Beschreibung (und/oder ein Foto) entgegen und lässt Claude
// die Nährwerte pro Lebensmittel schätzen. Der Anthropic-API-Key liegt nur hier
// (Secret ANTHROPIC_API_KEY), nie im Browser. Nur angemeldete Nutzer dürfen rufen.
//
// Deploy:  supabase functions deploy nutrition
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import Anthropic from "npm:@anthropic-ai/sdk@1.7.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "claude-opus-5-5";
const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABEL: Record<string, string> = {
  breakfast: "Frühstück",
  lunch: "Mittagessen",
  dinner: "Abendessen",
  snack: "Snack",
};
const MAX_TEXT = 4000;
const MAX_IMAGE_BASE64 = 4_500_000; // ~3,4 MB Bild – die App verkleinert vorher auf 1280 px

const SCHEMA = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Kurzer deutscher Name des Lebensmittels" },
          quantity: { type: "string", description: "Menge als Text, z. B. '400 g' oder '1 Portion (~250 g)'" },
          meal: { type: "string", enum: [...MEALS] },
          calories: { type: "number", description: "kcal für die angegebene Gesamtmenge" },
          protein: { type: "number", description: "Eiweiß in g" },
          carbs: { type: "number", description: "Kohlenhydrate in g (inkl. Zucker)" },
          sugar: { type: "number", description: "davon Zucker in g" },
          fat: { type: "number", description: "Fett in g (inkl. gesättigte Fettsäuren)" },
          saturatedFat: { type: "number", description: "davon gesättigte Fettsäuren in g" },
          fiber: { type: "number", description: "Ballaststoffe in g" },
          salt: { type: "number", description: "Salz in g (Natrium × 2,5)" },
          note: { type: "string", description: "Kurze Notiz mit Annahmen, sonst leer" },
        },
        required: ["name", "quantity", "meal", "calories", "protein", "carbs", "sugar", "fat", "saturatedFat", "fiber", "salt", "note"],
        additionalProperties: false,
      },
    },
    note: { type: "string", description: "Hinweis an den Nutzer, wenn etwas unsicher war oder fehlte; sonst leer" },
  },
  required: ["rows", "note"],
  additionalProperties: false,
};

const SYSTEM = `Du bist der Erfassungs-Assistent eines deutschsprachigen Kalorien- und Makrotrackers.
Aus einer freien Beschreibung und/oder einem Foto (Mahlzeit, Verpackung, Nährwerttabelle) erkennst du die einzelnen Lebensmittel, schätzt die Menge und berechnest die Nährwerte für die jeweilige Gesamtmenge.

Regeln:
- Eine Zeile pro Lebensmittel bzw. Komponente (z. B. "Vollkornbrot" und "Butter" getrennt, nicht "Brot mit Butter").
- Nährwerte immer für die genannte Gesamtmenge, nie pro 100 g.
- Mengen als lesbarer Text in Gramm/Milliliter oder Stück mit ungefährem Gewicht ("2 Scheiben (~90 g)").
- Nutze typische Nährwerttabellen (BLS/Österreich/Deutschland) oder Herstellerangaben, wenn eine Marke oder eine Nährwerttabelle erkennbar ist. Steht eine Nährwerttabelle auf dem Foto, rechne exakt daraus um.
- Zucker ist Teil der Kohlenhydrate, gesättigte Fettsäuren sind Teil des Fetts. Salz in Gramm (Natrium × 2,5). Unbekannte Kleinstwerte als 0.
- Fehlt eine Mengenangabe, nimm eine übliche Portion an und schreibe die Annahme in die Notiz (z. B. "Standardportion angenommen", "3,5 % Fett angenommen").
- Feld "meal": verwende die vorgegebene Standard-Mahlzeit, außer der Text ordnet ein Lebensmittel klar einer anderen zu ("zum Frühstück …", "abends …").
- Namen kurz, deutsch, ohne Mengenangabe im Namen. Notizen kurz; leer, wenn nichts anzumerken ist.
- Erfinde nichts: Was weder im Text noch auf dem Foto zu erkennen ist, gehört nicht in die Liste. Beschreibe Unsicheres im Feld "note".`;

type Row = {
  name: string; quantity: string; meal: string;
  calories: number; protein: number; carbs: number; sugar: number; fat: number;
  saturatedFat: number; fiber: number; salt: number; note: string;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0; };

function cleanRows(rows: unknown, fallbackMeal: string | null): Row[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => r && typeof r === "object" && String((r as Row).name ?? "").trim())
    .map((r) => {
      const x = r as Row;
      const meal = fallbackMeal ?? ((MEALS as readonly string[]).includes(x.meal) ? x.meal : "snack");
      return {
        name: String(x.name).trim().slice(0, 120),
        quantity: String(x.quantity ?? "").trim().slice(0, 60),
        meal,
        calories: num(x.calories), protein: num(x.protein), carbs: num(x.carbs), sugar: num(x.sugar),
        fat: num(x.fat), saturatedFat: num(x.saturatedFat), fiber: num(x.fiber), salt: num(x.salt),
        note: String(x.note ?? "").trim().slice(0, 200),
      };
    });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Nur POST." });

  // Login prüfen: der Browser schickt das Supabase-JWT des angemeldeten Nutzers mit.
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Nicht angemeldet." });
  const supabase = createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json(401, { error: "Nicht angemeldet." });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json(500, { error: "ANTHROPIC_API_KEY ist auf dem Server nicht gesetzt (supabase secrets set …)." });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "Ungültige Anfrage (kein JSON)." }); }

  const text = String(body.text ?? "").trim().slice(0, MAX_TEXT);
  const date = String(body.date ?? "").trim();
  const mealIn = body.meal == null ? null : String(body.meal);
  const meal = mealIn && (MEALS as readonly string[]).includes(mealIn) ? mealIn : null;
  const preferences = String(body.preferences ?? "").trim().slice(0, 1000);

  const image = body.image as { media_type?: string; data?: string } | null | undefined;
  const imageOk = !!image && typeof image.data === "string" && image.data.length > 0 &&
    ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(String(image.media_type));
  if (image && !imageOk) return json(400, { error: "Foto hat ein unbekanntes Format." });
  if (imageOk && image!.data!.length > MAX_IMAGE_BASE64) return json(413, { error: "Foto zu groß." });
  if (!text && !imageOk) return json(400, { error: "Bitte eine Beschreibung eingeben oder ein Foto wählen." });

  const userText = [
    date ? `Datum: ${date}` : null,
    `Standard-Mahlzeit: ${meal ? MEAL_LABEL[meal] : "automatisch anhand des Textes, sonst Snack"}`,
    preferences ? `Hinweise aus dem Profil des Nutzers: ${preferences}` : null,
    imageOk ? "Ein Foto ist beigefügt – werte es aus." : null,
    text ? `Beschreibung:\n${text}` : "Keine Textbeschreibung – nur das Foto.",
  ].filter(Boolean).join("\n");

  const content: Anthropic.Beta.Messages.BetaContentBlockParam[] = [];
  if (imageOk) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image!.media_type as "image/jpeg", data: image!.data! },
    });
  }
  content.push({ type: "text", text: userText });

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") {
      const why = response.stop_details?.type === "refusal" ? response.stop_details.explanation : "";
      return json(422, { error: "Anfrage wurde vom Modell abgelehnt." + (why ? " " + why : "") });
    }
    if (response.stop_reason === "max_tokens") return json(502, { error: "Antwort wurde abgeschnitten – bitte kürzer beschreiben." });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return json(502, { error: "Keine Antwort vom Modell." });

    let parsed: { rows?: unknown; note?: unknown };
    try { parsed = JSON.parse(textBlock.text); } catch { return json(502, { error: "Antwort war kein gültiges JSON." }); }

    return json(200, {
      rows: cleanRows(parsed.rows, meal),
      note: String(parsed.note ?? "").trim().slice(0, 500),
      model: response.model,
      usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json(429, { error: "Claude ist gerade ausgelastet – bitte kurz warten." });
    if (e instanceof Anthropic.AuthenticationError) return json(500, { error: "ANTHROPIC_API_KEY wird von Anthropic abgelehnt." });
    if (e instanceof Anthropic.APIConnectionError) return json(502, { error: "Keine Verbindung zur Claude-API." });
    if (e instanceof Anthropic.APIError) return json(502, { error: `Claude-API-Fehler (${e.status ?? "?"}): ${e.message}` });
    return json(500, { error: (e as Error)?.message ?? "Unbekannter Fehler." });
  }
});
