# Essen 🍊 – Kalorien- & Makrotracker

Ein **Kalorien- und Makrotracker in einer einzigen HTML-Datei** – ohne
Build-Schritt, ohne Server, ohne KI/API und ohne Konto. Einfach
[`index.html`](index.html) im Browser öffnen. Alle Daten bleiben lokal auf
dem Gerät (`localStorage`).

Desktop-optimiert (Seitenleisten-Navigation, breites Layout, zweispaltige
Tagesansicht), voll responsiv fürs Handy. Farbschema **Schwarz/Orange**.

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
[`streamlit/`](streamlit/) – gleiche Berechnungen und derselbe Import, aber als
Server-App. Start: `cd streamlit && pip install -r requirements.txt &&
streamlit run streamlit_app.py`. Details in [`streamlit/README.md`](streamlit/README.md).
Die gepflegte, deployte App bleibt die HTML-Version (`index.html`).

## Funktionen

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
- **Analyse** – umschaltbarer **Zeitverlauf** (Kalorien/Makros/Ballaststoffe/
  Zucker/Salz) mit 7-Tage-Schnitt, **Kalender-Heatmap**, **Prognose**
  (geschätzte kg-Veränderung aus der Kalorienbilanz), Verteilung nach Mahlzeit
  und Tracking-Treue (Budget-Treue, Serie).
- **Profil & Wünsche** – Körperdaten, Wunschgewicht inkl. Tempo-/Dauerschätzung,
  Ernährungsstil, Makro-Verteilung, Nährwert-Ziele/-Limits und persönliche
  Hinweise.
- **Backup** – komplette Daten als JSON sichern und wiederherstellen.
- **Drucken** – aktuellen Tag als sauberen (hellen) Ausdruck/PDF.

### Import-Format

Eine Zeile pro Lebensmittel, Spalten per **Tab** (oder `|`) getrennt:

```
Datum  Mahlzeit  Nahrungsmittel  Menge  kcal  Eiweiß  KH  Zucker  Fett  ges.FS  Ballaststoffe  Salz  Notiz
```

Beispiel (deutsche Kommazahlen und Notizen mit Kommas sind erlaubt):

```
02.06.2026	Frühstück	Naturjoghurt	400 g	260	14	19	19	14	9	0	0,4	Vollmilchjoghurt 3,5%
02.06.2026	Mittagessen	Chicken-Panade-Salat	1 Portion	550	35	30	5	30	6	5	1,5	Restaurantportion
```

Aufrufbar über **„📋 Import"** (mit Vorschau) oder **„⚡ Einfügen"** (direkt)
auf der Heute-Seite.

## Tastenkürzel (Desktop)

| Taste | Aktion |
|------|--------|
| `←` / `→` | Tag wechseln (auf „Heute") |
| `t` | Zum heutigen Tag springen |
| `i` | Import öffnen |
| `Esc` | Dialog schließen |

## Datensicherung

Alle Daten liegen ausschließlich im `localStorage` deines Browsers. Lade unter
**Profil → 💾 Daten & Sicherung** regelmäßig ein **JSON-Backup** herunter, damit
beim Leeren des Browser-Speichers nichts verloren geht. Über denselben Bereich
lässt sich ein Backup wieder einspielen.

## Technik & Datenschutz

- Eine Datei, reines Frontend: React 18 + Babel-Standalone (per CDN), kein Build.
- Keine Server-Kommunikation, **keine KI/API**, kein Tracking.
- Persistenz lokal über `localStorage`; Export/Backup als TSV bzw. JSON.
