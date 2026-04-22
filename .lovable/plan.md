

# Datenbank-Normalisierung + Mobile-UX + PDF-Fix

> **Wichtig zur DB-Migration:** Das ist eine **grosse strukturelle Änderung** mit Auswirkungen auf alle 18 Dateien, die heute `kunde_*`, `kennzeichen`, `material_liste` etc. direkt aus `arbeitsrapporte` lesen — sowie auf den **n8n-Workflow**, der die Aufträge anlegt. Die Datenmigration läuft "human-in-the-loop": eine SQL-Migration legt die neuen Tabellen an und kopiert bestehende Daten automatisch nach `kunden`/`fahrzeuge` (dedupliziert per `kennzeichen`/`kundennummer`). Bestehende Snapshot-Spalten in `arbeitsrapporte` bleiben **temporär als Fallback** erhalten und werden erst entfernt, nachdem du n8n umgestellt hast.

## 1. Neue Datenbank-Struktur (3NF)

**Migration 1 — Tabellen anlegen:**
- `kunden(id uuid pk, kundennummer text unique, name, strasse, plz, ort, telefon, email, created_at, updated_at)`
- `fahrzeuge(id uuid pk, chassis_nr text unique nullable, kennzeichen text, marke, modell, kunde_id uuid fk → kunden, created_at, updated_at)` — Index auf `kennzeichen`
- `rapport_positionen(id uuid pk, rapport_id uuid fk → arbeitsrapporte on delete cascade, typ text check in ('arbeit','material'), beschreibung text, menge numeric, einheit text, sort_order int, created_at)`
- `arbeitsrapporte` bekommt `fahrzeug_id uuid` (nullable FK), `total_betrag` (alias zu auftragswert_chf, bleibt) — Snapshots bleiben als Fallback bestehen.
- RLS-Policies analog zu `arbeitsrapporte`: `authenticated` darf SELECT/INSERT/UPDATE/DELETE.
- Trigger `update_updated_at_column` auf alle neuen Tabellen.

**Migration 2 — Datenmigration (idempotent):**
- Für jeden eindeutigen `kundennummer` aus `arbeitsrapporte` → INSERT in `kunden` (ON CONFLICT DO NOTHING).
- Für jedes eindeutige `(kennzeichen, chassis_nr)` → INSERT in `fahrzeuge` mit `kunde_id`.
- `arbeitsrapporte.fahrzeug_id` setzen.
- `material_liste` JSONB → `rapport_positionen` typ='material' (jeder Array-Eintrag eine Zeile).
- `arbeit_beschreibung` Text → `rapport_positionen` typ='arbeit' menge=1 einheit='Std' (eine Zeile pro Rapport).

## 2. PDF-Vorschau definitiv reparieren

`src/components/BelegPreview.tsx` umbauen:
- Worker lokal via Vite-Bundle: `import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url"` — kein CDN mehr.
- **Iframe-Fallback**: state `mode: "pdfjs" | "iframe"`. Bei `onLoadError` oder Worker-Mismatch automatisch auf `<iframe src={blobUrl} type="application/pdf">` wechseln. Auf iOS Safari direkt iframe als Default (pdf.js dort instabil).
- Loading-State mit klarem Spinner; "Im neuen Tab öffnen" bleibt als Notausgang.

## 3. Mobile-Layout (`AuftragDetailMobile.tsx`)

Neue Reihenfolge von oben nach unten:

```text
┌─────────────────────────────────┐
│ ← │ ZH 123 456    │ [In Arbeit]│  Header mit grossem Kennzeichen
│   │ Müller Hans   │             │  (1.5rem mono bold + 1rem semibold)
├─────────────────────────────────┤
│ 📅 22.04.  ⏱ 2.5h  📞 Anrufen   │
├─────────────────────────────────┤
│ ┃ 📷 Foto hinzufügen ┃          │  Grosser gelber Button (h-14)
├─────────────────────────────────┤
│ ▼ Auftrag bearbeiten            │  Akkordeon offen
│   • Kategorie / Mechaniker      │
│   • Arbeitszeit-Stepper [-][+]  │
│   • Positionen (Arbeit/Material)│
│   • Sicherheitscheck OK/Mangel  │
│   • Notizen                     │
├─────────────────────────────────┤
│ ▶ Original-Beleg prüfen         │  Akkordeon zu (Default)
└─────────────────────────────────┘
│ [   Erledigen   ] [⋮]           │  Sticky Bottom (h-12, schon ≥48px)
```

## 4. Form-Komponenten (`AuftragForm.tsx`)

**a) Arbeitszeit-Stepper** ersetzt `<Input type="number">`:
- Layout: `[ − ]  2.25 h  [ + ]`, beide Buttons `h-12 w-12`, Schritt 0.25h, min 0.
- Auto-Save wie bisher.

**b) Positions-Editor** (neue Sub-Komponente `PositionenEditor`):
- Zwei Sektionen: **"Arbeit"** und **"Material"** mit eigenen Listen.
- Jede Position = Karte mit `beschreibung` (Input), `menge` (Number-Input), `einheit` (Select: Std/Stk/Liter/m/Set), Lösch-Icon.
- Pro Sektion ein **"Position hinzufügen"**-Button.
- Persistenz: bei jedem Blur/Edit → upsert/delete in `rapport_positionen`. Optimistic Update lokal.
- Geladen wird `rapport_positionen` per `useEffect` zum Mount.

**c) Sicherheitscheck**: nur noch `ok` (grün) und `mangel` (rot). Gelb entfällt. Bei `mangel` erscheint direkt darunter ein Pflicht-Textfeld **"Bemerkung zum Mangel"**, gespeichert als `<key>_bemerkung` im selben `sicherheitscheck`-JSONB.

## 5. Foto-Quick-Add

Neue Komponente `src/components/FotoHinzufuegen.tsx`:
- Grosser gelber Button `h-14`, Icon Camera, Text "Foto hinzufügen".
- `<input type="file" accept="image/*" capture="environment">` öffnet Kamera.
- Nutzt `compressImage()` → upload in `fotos`-Bucket (Pfad `{rapport.id}/{timestamp}.jpg`) → URL ans `arbeitsrapporte.fotos`-Array anhängen.
- Toast-Feedback mit Mini-Thumbnail.

## 6. Archiv-Verbesserungen (`Archiv.tsx`)

- **Globale Suche erweitert**: zusätzliches Predicate sucht in `rapport_positionen.beschreibung` (per `select(...arbeitsrapporte..., positionen:rapport_positionen(beschreibung,typ,menge,einheit))` und Filter clientseitig). Suchfeld-Placeholder ergänzt: "…oder Material/Arbeit (z.B. 'Öl')".
- **Material-Zusammenfassung pro Rapport-Karte**: kompakte Zeile mit den ersten 3 Material-Positionen (`Ölfilter ×1, Öl 5W30 ×4L, Bremsbeläge ×1`) und "+N weitere" wenn mehr.

## 7. Design / Kontrast

`src/index.css`:
- `--foreground` 0 0% 96% → 0 0% 100%
- `--muted-foreground` 220 8% 65% → 220 8% 78%
- `--border` 220 12% 20% → 220 12% 28%
- Sticky-Bottom-Buttons sind bereits `h-12` (48px) — bleibt.

## Geänderte / neue Dateien

| Datei | Aktion |
|---|---|
| `supabase/migrations/*` (neu, 2 Files) | Schema + Datenmigration |
| `src/components/BelegPreview.tsx` | Lokaler Worker + iframe-Fallback |
| `src/components/AuftragForm.tsx` | Stepper + PositionenEditor + Sicherheitscheck-Bemerkung |
| `src/components/PositionenEditor.tsx` (neu) | Material/Arbeit-Karten |
| `src/components/AuftragDetailMobile.tsx` | Header gross, Foto-Button oben, Beleg ans Ende |
| `src/components/FotoHinzufuegen.tsx` (neu) | Kamera-Button |
| `src/components/RapportUebersicht.tsx` | Positionen-Liste statt freier Text/Material |
| `src/pages/Archiv.tsx` | Suche in Positionen + Material-Zusammenfassung |
| `src/components/AuftragDetail.tsx`, `BelegMitRapport.tsx` | Beleg-Anzeige nur noch unten im Akkordeon |
| `src/index.css` | Kontrast-Tokens |

## ⚠️ Was du danach manuell tun musst

1. **n8n-Workflow umstellen**: Aktuell schreibt n8n vermutlich `kunde_name`, `kennzeichen`, `material_liste` direkt in `arbeitsrapporte`. Nach der Migration sollte n8n stattdessen:
   - `kunden` upserten (key: `kundennummer`)
   - `fahrzeuge` upserten (key: `kennzeichen` oder `chassis_nr`) mit `kunde_id`
   - `arbeitsrapporte` mit `fahrzeug_id` einfügen
   - Material als mehrere Zeilen in `rapport_positionen` schreiben (typ='material')
   
   Bis du n8n umgestellt hast, läuft der bestehende Flow weiter — die Snapshot-Spalten bleiben übergangsweise als Fallback. Code liest **bevorzugt aus `kunden`/`fahrzeuge`**, fällt auf Snapshots zurück, wenn `fahrzeug_id` null ist.

2. **Nach erfolgreicher n8n-Umstellung**: separate Folge-Migration zum endgültigen Entfernen der Snapshot-Spalten — sag mir Bescheid wann.

