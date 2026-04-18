
Tabula rasa + neuer Aufbau. Webhook-URL ist da, ich speichere sie als Secret und rufe sie via Edge Function auf (damit sie nicht im Frontend liegt).

## Phase 1 — DB & Storage zurücksetzen

**SQL-Migration:**
```sql
-- Alles löschen
DROP TABLE IF EXISTS arbeitsrapporte CASCADE;
DROP TABLE IF EXISTS fahrzeuge CASCADE;
DROP TABLE IF EXISTS kunden CASCADE;
DROP SEQUENCE IF EXISTS rapport_nummer_seq;
DROP FUNCTION IF EXISTS generate_rapport_nummer();

-- Storage zurücksetzen
DELETE FROM storage.objects WHERE bucket_id IN ('fotos','belege');
DELETE FROM storage.buckets WHERE id IN ('fotos','belege');

-- Enum für Status
CREATE TYPE rapport_status AS ENUM ('geplant','in_arbeit','erledigt','archiviert');
CREATE TYPE mechaniker_name AS ENUM ('Roman','Pascal');

-- Neue Tabellen
CREATE TABLE kunden (...);
CREATE TABLE fahrzeuge (... kunde_id UUID REFERENCES kunden);
CREATE TABLE arbeitsrapporte (
  id, rapport_nummer, fahrzeug_id REFERENCES fahrzeuge,
  status rapport_status DEFAULT 'geplant',
  mechaniker_zuweisung mechaniker_name,
  geplantes_datum DATE DEFAULT CURRENT_DATE,
  pdf_url TEXT,
  auftragswert_chf NUMERIC,
  datum, km_stand, kategorie, arbeit_beschreibung,
  material_liste JSONB, sicherheitscheck JSONB,
  arbeitszeit_stunden, mechaniker, reifen_zustand,
  naechster_service_datum, naechster_service_km, mfk_datum,
  notizen, fotos TEXT[], ampel_status,
  created_at, updated_at
);

-- Sequence + Trigger für RAP-XXXX
-- updated_at Trigger
-- Storage Buckets: 'belege' (public) + 'fotos' (public) mit RLS
-- RLS-Policies: vorerst offen (wie bisher, kein Auth)
```

**Storage Buckets neu:**
- `belege` — public, für PDF-Belege
- `fotos` — public, für Fahrzeugfotos

## Phase 2 — Layout & Routing

- `App.tsx`: Routes ersetzen → `/` (Wochenplan), `/archiv`, `/statistiken`, `/auftrag/:id`. **NotFound bleibt**, altes Formular **gelöscht**.
- `AppLayout.tsx`: Sidebar Desktop (`md:`), BottomNav Mobile
- `pages/Index.tsx` → wird Wochenplan-Seite
- Placeholder-Seiten für Archiv & Statistiken (kommen in späteren Phasen)

## Phase 3 — Wochenplan (Mo–Sa)

- Lib: `@dnd-kit/core` + `@dnd-kit/sortable`
- Touch-Sensor mit `delay: 200, tolerance: 5` für Mobile
- 6 Spalten, horizontal scrollbar auf Mobile, Grid auf Desktop
- Karte: Kennzeichen, Marke, Mechaniker-Badge (Roman blau / Pascal grün), Status-Punkt
- Drop → Update `geplantes_datum`
- Filtert nur `status IN ('geplant','in_arbeit')`

## Phase 4 — Neuer-Auftrag-Dialog + n8n Webhook

- Dialog: PDF-Upload (Drop-Zone), Datum-Picker, Mechaniker-Dropdown
- Flow: PDF → Storage `belege` → Insert `arbeitsrapporte` mit `status='geplant'` → Edge Function `notify-n8n` aufrufen
- **Edge Function `notify-n8n`**: nimmt `{ rapport_id, pdf_url, kennzeichen? }`, POSTet an `N8N_PDF_WEBHOOK_URL` (Secret)
- Secret `N8N_PDF_WEBHOOK_URL` = `https://automation.datastruct.ch/webhook-test/ff316044-bf19-49e1-b8a4-5483ff9db6a8`

## Phase 5 — Auftragsdetail `/auftrag/:id`

- Desktop: Split-View (links `<iframe src={pdf_url}>`, rechts Formular)
- Mobile: Tabs „Beleg" / „Daten"
- Bestehende Karten wiederverwenden (DatumCard, FahrzeugKundeCard, ArtDerArbeitCard, SicherheitsCheckCard, ArbeitszeitCard, TermineCard, NotizenCard)
- Mechaniker-Dropdown (Roman/Pascal) statt freies Textfeld
- Buttons: „In Arbeit", „Als erledigt markieren" → ändert `status`

## Phase 6 — Archiv & Statistiken

- **Archiv**: Liste `status IN ('erledigt','archiviert')`, Live-Suche (Kennzeichen / Marke / Kunde / Rapport-Nr.)
- **Statistiken** (recharts): Pie Marken, Bar Stunden pro Mechaniker, KPI-Karten

## Diese Iteration liefere ich

**Phasen 1 + 2 + 3 + 4** in einem Rutsch:
1. SQL-Migration (Drop + Neuaufbau + Buckets + Policies)
2. Webhook-Secret + Edge Function `notify-n8n`
3. AppLayout + Sidebar + BottomNav + Routing
4. Wochenplan mit Drag & Drop
5. „Neuer Auftrag"-Dialog mit PDF-Upload + Webhook-Trigger

Phase 5 (Detailseite) und Phase 6 (Archiv/Statistiken) folgen direkt danach in der nächsten Iteration.

## Wichtiger Hinweis

Da alle Tabellen gelöscht werden, gehen alle bestehenden Test-Rapporte / Fahrzeuge / Kunden **unwiderruflich verloren**. Du hast bestätigt, dass nichts produktiv ist — ich starte sauber.
