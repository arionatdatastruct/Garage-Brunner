

# Garage Brunner -- Arbeitsrapport React App

## Zusammenfassung

Die gesamte HTML/JS/CSS-Vorlage wird in eine mobile-first React-App umgewandelt. Kein Login nötig (Cloudflare regelt das). Die RLS-Policies sind bereits auf `true` gesetzt, d.h. alle Requests funktionieren ohne Auth.

## Datenbankschema

Die Tabellen `fahrzeuge` und `arbeitsrapporte` existieren bereits mit korrekter Struktur und Foreign Key. Es fehlen jedoch einige Felder aus dem Originalformular:

**Migration nötig -- `fahrzeuge` erweitern:**
- `jahrgang` (text) -- Baujahr des Fahrzeugs
- `kunde_adresse` (text) -- Adresse
- `kunde_email` (text) -- E-Mail

**Migration nötig -- `arbeitsrapporte` erweitern:**
- `mechaniker` (text) -- Kürzel des Mechanikers
- `reifen_zustand` (text) -- gut/mittel/schlecht

## Architektur

```text
src/
├── pages/
│   └── Index.tsx              -- Hauptformular (einzige Seite)
├── components/
│   ├── ArbeitsrapportForm.tsx -- Formular-Container mit State
│   ├── DatumCard.tsx          -- Datumsanzeige
│   ├── FahrzeugKundeCard.tsx  -- Nummernschild-Suche + Kundeninfo + Historie
│   ├── NeuerKundeDialog.tsx   -- Dialog zum Anlegen neuer Kunden
│   ├── ArtDerArbeitCard.tsx   -- Kategorie-Buttons + Sections (Service/Reparatur/Reifen)
│   ├── SicherheitsCheckCard.tsx -- Ampel-Buttons (grün/gelb/rot)
│   ├── ArbeitszeitCard.tsx    -- Stunden + Mechaniker
│   ├── TermineCard.tsx        -- Nächster Service / MFK
│   ├── NotizenCard.tsx        -- Interne Notizen
│   ├── PreviewOverlay.tsx     -- A4-Papier PDF-Vorschau
│   └── SuccessMessage.tsx     -- Erfolgsmeldung nach Speichern
├── hooks/
│   └── useFahrzeugSuche.ts   -- Supabase Live-Suche + Historie
├── lib/
│   ├── image-compress.ts     -- Foto-Komprimierung (aus script.js)
│   └── presets.ts             -- Service-Presets (Ölwechsel, Kleiner/Grosser Service)
```

## Kernfunktionen (4 zentrale Features)

### 1. Nummernschild-Suche + Kunde anlegen
- Echtzeit-Suche in `fahrzeuge` via Supabase `ilike` Query (debounced, 300ms)
- Dropdown mit Kennzeichen + Kundenname
- Bei Auswahl: Felder automatisch ausfüllen + Historie laden (letzte 5 Rapporte)
- Button "Neuer Kunde" oeffnet Dialog zum Anlegen eines neuen Fahrzeugs/Kunden in der DB

### 2. Arbeitsrapport erfassen
- Kategorie-Buttons (Service/Reparatur/Reifen) mit bedingten Sektionen
- Service-Presets (Ölwechsel, Kleiner/Grosser Service) setzen Material + Beschreibung automatisch
- Material-Badges als Checkboxen, Sicherheitscheck mit Ampel-Buttons
- Fotos mit Canvas-Komprimierung (max 1200px, JPEG 70%) als Base64 in `fotos[]` Array

### 3. PDF-Vorschau
- Fullscreen-Overlay mit A4-Papier-Layout (weiss auf schwarz)
- Zeigt alle erfassten Daten strukturiert an
- "PDF/Drucken" Button nutzt `window.print()` mit `@media print` CSS
- "Zurück" Button schliesst Vorschau

### 4. An Datenbank senden
- "Daten senden" Button in der Vorschau speichert direkt in Supabase
- Erstellt ggf. neues Fahrzeug (wenn noch nicht vorhanden) und dann den Rapport
- Erfolgsmeldung mit "Neuer Rapport" Button zum Zurücksetzen

## Styling

- Dark Theme mit Tailwind: `bg-gradient-to-br from-[#1a1a2e] to-[#16213e]`
- Mobile-first, max-width 500px Container
- Alle Styles aus der CSS-Vorlage als Tailwind-Klassen nachgebaut
- Print-Styles als globales CSS in `index.css`

## Technische Details

- Kein React Router nötig (Single Page)
- State-Management via `useState` im ArbeitsrapportForm
- Supabase Client direkt verwenden (kein Auth nötig)
- Foto-Komprimierung client-seitig via Canvas API (identisch zur Original script.js)
- `@media print` CSS fuer saubere A4-Ausgabe

