# Essen 🍊 – Kalorien- & Makrotracker

Ein **Kalorien- und Makrotracker in einer einzigen HTML-Datei** – ohne
Build-Schritt. Einfach [`index.html`](index.html) im Browser öffnen; ohne
Anmeldung bleiben alle Daten lokal auf dem Gerät (`localStorage`).

Optional mit **Cloud-Sync und KI-Erfassung** über ein eigenes
[Supabase](https://supabase.com)-Projekt: Nach dem Login ist der Stand auf
allen Geräten gleich, und Claude berechnet die Nährwerte direkt in der App
(Freitext oder Foto) – kein Copy & Paste mehr nötig. Einrichtung: siehe
[`supabase/README.md`](supabase/README.md).

Desktop-optimiert (Seitenleiste, zweispaltige Tagesansicht mit kompakten
Einträgen, Tastenkürzel), voll responsiv fürs Handy. Farbschema **Schwarz/Orange**.

## Schnellstart

- **Desktop/Handy:** `index.html` herunterladen und im Browser öffnen
  (Doppelklick). Fertig – kein Setup.
- Beim ersten Laden werden React/Babel einmalig über ein CDN geholt; danach
  läuft alles lokal.

> Zum Startbildschirm/Dock hinzufügen funktioniert wie bei jeder Webseite über
> das Browser-Menü.

## Online (GitHub Pages)

Die App ist als statische Seite live:

**https://martinwoeckinger.github.io/essen/**

Veröffentlicht wird über **Settings → Pages → „Deploy from a branch"**
(Standard-Branch, Ordner `/ (root)`). Da `index.html` im Repo-Root liegt,
veröffentlicht GitHub jede Änderung **automatisch** neu – kein Build, kein
Workflow nötig.

> Selbst hosten: `index.html` auf beliebigen Webspace legen – oder einfach lokal
> per Doppelklick öffnen.

## Streamlit-Variante (experimentell)

Als Versuch gibt es zusätzlich eine **Python/Streamlit-Portierung** unter
[`streamlit/`](streamlit/) – derselbe Import, aber als Server-App (rechnet das
Tagesbudget noch aus Körperdaten, statt die manuellen Werte zu nutzen). Start: `cd streamlit && pip install -r requirements.txt &&
streamlit run streamlit_app.py`. Details in [`streamlit/README.md`](streamlit/README.md).
Die gepflegte, deployte App bleibt die HTML-Version (`index.html`).

## Funktionen

- **KI-Erfassung** – „Mahlzeit erfassen“ → Freitext („400 g Naturjoghurt,
  100 g Himbeeren“) oder Foto von Mahlzeit/Verpackung/Nährwerttabelle; Claude
  liefert die Zeilen im Import-Format, du prüfst die Vorschau und übernimmst.
  Läuft über eine Supabase Edge Function, der Claude-Key bleibt serverseitig.
- **Cloud-Sync** – Login per E-Mail (Passwort oder Magic-Link); der neueste
  Stand gewinnt, lokal bleibt ein Offline-Cache. Hell/Dunkel bleibt pro Gerät.
- **Essenszeiten** – Uhrzeit pro Eintrag (manuell, KI, Import-Spalte). Daraus:
  Zeitleiste des Tages, Essensfenster, Nachtfasten, Anteil nach 20 Uhr,
  Kalorien nach Tagesstunde.
- **Training** – Einheiten mit Typ (Kraft/Ausdauer/Mobility), Dauer, Intensität,
  Uhrzeit und Notiz; kcal werden sonst per MET-Richtwert geschätzt. Ein Eintrag
  setzt den Tag automatisch als Trainingstag. **Hevy-Import** der letzten 30
  Tage mit Übungen, Sätzen und Volumen (eigener API-Key als Supabase-Secret).
- **Wochenbericht von Claude** – kurze Einordnung der Woche plus zwei konkrete
  Hinweise, gespeichert pro Kalenderwoche.
- **Installierbar (PWA)** – Manifest, Icons und Service Worker; die App startet
  auch offline, Updates werden per Hinweisleiste angeboten.
- **Erfassung per Copy & Paste** – Tabelle (Tab- oder `|`-getrennt) einfügen;
  **Datum und Mahlzeit werden automatisch zugeordnet**. Mit Vorschau,
  Duplikat-Warnung, „rückgängig" und optionalem Leeren der betroffenen Tage.
  Dazu **Schnell-Einfügen** direkt auf „Heute" und **manuelle** Eingabe
  (inkl. „Werte pro 100 g"-Umrechnung).
- **Mahlzeiten** – Frühstück / Mittag / Abend / Snack mit Zwischensummen;
  Einträge bearbeiten (✎), löschen (×) oder als **Favorit** (⭐) speichern.
- **Favoriten** – häufige Lebensmittel mit einem Klick wieder hinzufügen.
- **„Gestern übernehmen"** – den Vortag in einen Tag kopieren.
- **Erweiterte Nährwerte** – kcal, Eiweiß/KH/Fett **plus** Zucker, gesättigte
  Fettsäuren, Ballaststoffe und Salz, mit Ziel-/Limit-Balken und Makro-Donut.
- **Archiv** – alle Tage nach Monat, durchsuchbar; Export zurück ins Tab-Format.
- **Analyse** – **Zeitverlauf** als Flächendiagramm mit Hover-Werten
  (Kalorien/Makros/Ballaststoffe/Zucker/Salz, 7-Tage-Schnitt),
  **Kalender-Heatmap**, **Prognose** (geschätzte kg-Veränderung), Verteilung
  nach Mahlzeit, **Wochenübersicht**, **Wochentagsmuster**, **Trainingstag vs.
  Ruhetag**, Eiweiß pro kg Körpergewicht, **Top-Lebensmittel**, Essenszeiten,
  Trainingsvolumen und Wochen-Serie.
- **Kalorienziel manuell** – zwei feste Tageswerte im Profil eintragen
  (**Trainingstag** / **kein Trainingstag**), nichts wird berechnet. Pro Tag
  wird auf „Heute" bzw. im Dashboard markiert, ob es ein Trainingstag ist.
- **Makro-Ziele manuell** – Eiweiß, Kohlenhydrate und Fett in Gramm direkt
  eintragen, ebenfalls getrennt für Trainingstag / kein Trainingstag.
- **Profil & Wünsche** – Körperdaten, Wunschgewicht, Nährwert-Ziele/-Limits
  und persönliche Hinweise.
- **Backup** – komplette Daten als JSON sichern und wiederherstellen.
- **Drucken** – aktuellen Tag als sauberen (hellen) Ausdruck/PDF.

### Import-Format

Eine Zeile pro Lebensmittel, Spalten per **Tab** (oder `|`) getrennt:

```
Datum  Mahlzeit  Nahrungsmittel  Menge  kcal  Eiweiß  KH  Zucker  Fett  ges.FS  Ballaststoffe  Salz  Notiz  Uhrzeit
```

Die letzte Spalte „Uhrzeit“ (HH:MM) ist optional.

Beispiel (deutsche Kommazahlen und Notizen mit Kommas sind erlaubt):

```
02.06.2026	Frühstück	Naturjoghurt	400 g	260	14	19	19	14	9	0	0,4	Vollmilchjoghurt 3,5%
02.06.2026	Mittagessen	Chicken-Panade-Salat	1 Portion	550	35	30	5	30	6	5	1,5	Restaurantportion
```

Aufrufbar über **„📋 Import"** (mit Vorschau) oder **„⚡ Einfügen"** (direkt)
auf der Heute-Seite.

## Desktop

Ab 900 px Breite: Seitenleiste statt Tab-Leiste, **Archiv** als eigener
Bereich, Kopfzeile mit Datum links und Aktionen rechts, unten in der Leiste der
heutige Rest-kcal-Stand. Ab 1140 px zeigt „Heute" die Mahlzeiten als kompakte
Zeilen und rechts daneben die Tageszusammenfassung (Ring, Makros, weitere
Nährwerte, Tagestyp). Der Zustand steht in der URL (`#heute/2026-11-10`), damit
Reload, Zurück/Vor und Lesezeichen funktionieren.

### Tastenkürzel

| Taste | Aktion |
|------|--------|
| `1` … `5` | Dashboard · Heute · Analyse · Archiv · Profil |
| `←` / `→` | Tag wechseln (Dashboard, „Heute") |
| `t` | Zum heutigen Tag springen |
| `k` | KI-Erfassung öffnen |
| `i` | Tabelle einfügen |
| `n` | Mahlzeit manuell eintragen |
| `g` | Gestern übernehmen |
| `?` | Übersicht der Kürzel |
| `Esc` | Dialog schließen |

## Datensicherung

Ohne Anmeldung liegen alle Daten ausschließlich im `localStorage` deines
Browsers. Lade unter **Profil → 💾 Daten & Sicherung** regelmäßig ein
**JSON-Backup** herunter, damit beim Leeren des Browser-Speichers nichts
verloren geht. Über denselben Bereich lässt sich ein Backup wieder einspielen.
Mit Login liegt der Stand zusätzlich in deiner Supabase-Datenbank.

## Technik & Datenschutz

- Eine Datei, reines Frontend: React 18 + Babel-Standalone (per CDN), kein Build.
- Ohne Login: keine Server-Kommunikation, kein Tracking.
- Mit Login: Daten in deinem eigenen Supabase-Projekt (Row-Level-Security,
  nur du siehst deine Zeile); KI-Anfragen gehen über deine Edge Function an die
  Claude-API. Konfiguration in [`config.js`](config.js) (nur der öffentliche
  Anon-Key), Server-Teil unter [`supabase/`](supabase/).
- Persistenz lokal über `localStorage` als Cache; Export/Backup als TSV bzw. JSON.
