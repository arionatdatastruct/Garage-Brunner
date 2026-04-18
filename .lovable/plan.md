

## Plan: Schema flach machen — alles in `arbeitsrapporte`

### 1. Migration (Schema-Änderungen)

**1a. Neue Spalten an `arbeitsrapporte`:**
- Kunde-Snapshot: `kunde_name`, `kunde_ort`, `kunde_strasse`, `kunde_plz`, `kunde_telefon`, `kunde_email` (alle text, nullable)
- Fahrzeug-Snapshot: `kennzeichen` (text), `marke`, `modell`, `jahrgang`, `chassis_nr` (alle text, nullable)

**1b. Backfill aus bestehenden Tabellen** (per UPDATE … FROM JOIN über `fahrzeug_id` → `kunde_id`).

**1c. Aufräumen — unnötige Spalten droppen:**
- `datum` (Duplikat zu `geplantes_datum`)
- `mechaniker` (Duplikat zu `mechaniker_zuweisung`)
- `reifen_zustand`, `naechster_service_datum`, `naechster_service_km`, `mfk_datum`, `ampel_status` (werden nicht im UI verwendet)
- `fahrzeug_id` (nach Backfill nicht mehr nötig)

**1d. Tabellen droppen:** `fahrzeuge`, `kunden` (DROP TABLE … CASCADE).

**1e. Index** auf `arbeitsrapporte(kennzeichen)` für Suche, auf `(geplantes_datum, status)` für Wochenplan.

### 2. Code-Anpassungen

| Datei | Änderung |
|---|---|
| `NeuerAuftragDialog.tsx` | Nur noch **ein** Insert in `arbeitsrapporte` mit `kennzeichen` (optional, sonst null), `pdf_url`, Datum, Mechaniker, Stunden. Keine kunden/fahrzeuge-Inserts mehr. |
| `AuftragDetail.tsx` | Nur noch ein Load + eine Realtime-Subscription auf `arbeitsrapporte`. `fahrzeug`/`kunde` State entfernt. |
| `AuftragForm.tsx` | Eine Card editiert flach: Kunde-Felder + Fahrzeug-Felder + Auftrag-Felder, alles ein einziges Save-Target. |
| `RapportUebersicht.tsx` | Liest Kunde/Fahrzeug direkt aus rapport-Props. |
| `useFahrzeugSuche.ts` | Sucht in `arbeitsrapporte` (DISTINCT ON kennzeichen, neuester Eintrag → Auto-Fill). |
| `Wochenplan.tsx` | Query ohne Join, `r.kennzeichen` + `r.marke` direkt aus rapport. |
| `Statistiken.tsx`, `Archiv.tsx` | Joins entfernen, flach lesen. |
| `integrations/supabase/types.ts` | Wird automatisch nach Migration neu generiert. |

### 3. n8n Workflow (User-seitig)

Nach der Migration: nur noch **ein** „Update row" Node auf `arbeitsrapporte` (WHERE id = rapport_id) mit allen flachen Feldern. Die alten 3 Update-Nodes entfallen. Du passt den Workflow danach selbst an, ich sage dir genau welche Spaltennamen er setzen soll.

### Resultierendes Schema (`arbeitsrapporte`)

```text
id, rapport_nummer, auftragsnummer, status, pdf_url
geplantes_datum, mechaniker_zuweisung, arbeitszeit_stunden
kategorie, km_stand, arbeit_beschreibung, auftragswert_chf
material_liste, sicherheitscheck, fotos, notizen
kunde_name, kunde_ort, kunde_strasse, kunde_plz,
  kunde_telefon, kunde_email
kennzeichen, marke, modell, jahrgang, chassis_nr
created_at, updated_at
```

### Risiken / Hinweise

- **Daten-Backfill ist destruktiv** in dem Sinn, dass nach Drop der alten Tabellen nur noch was in der flachen Spalte steht. Backfill läuft VOR dem Drop in derselben Migration → sicher.
- Nach Migration musst du **n8n umkonfigurieren**, sonst schreibt es ins Leere. Ich gebe dir die fertige Feld-Mapping-Liste.
- `useFahrzeugSuche` zeigt nach Migration nur Kennzeichen mit mind. einem Auftrag (so gewollt).

