

User entfernt 3 Felder aus dem geplanten `AuftragForm.tsx`: `naechster_service_datum`, `naechster_service_km`, `mfk_datum`. Rest von Phase 5 bleibt gleich.

## Phase 5 — Auftragsdetailseite `/auftrag/:id` (angepasst)

### 1. Mini-Migration
- `fahrzeuge.chassis_nr` (TEXT, nullable)
- `kunden.ort` (TEXT, nullable)

### 2. `NeuerAuftragDialog.tsx` + `notify-n8n` Edge Function
- Payload um `fahrzeug_id` und `kunde_id` erweitern, damit n8n diese Rows updaten kann.

### 3. `AuftragDetail.tsx` (Neuaufbau)
- Joined Query: Rapport + Fahrzeug + Kunde
- **Realtime-Subscription** auf `arbeitsrapporte` → Felder erscheinen live, wenn n8n schreibt
- Header: Rapport-Nr., Kennzeichen, Fahrzeug, Status-Badge, Zurück-Link
- Desktop (`md:`): 2-Spalten-Grid `[PDF iframe | StatusBar + Form]`
- Mobile: `<Tabs>` „Beleg" / „Daten"

### 4. `AuftragStatusBar.tsx` (neu)
| Button | → status | Sichtbar wenn |
|---|---|---|
| In Arbeit | `in_arbeit` | status ∈ {geplant, erledigt} |
| Erledigt | `erledigt` | status ∈ {in_arbeit, geplant} |
| Archivieren | `archiviert` | status = erledigt |

### 5. `AuftragForm.tsx` (neu) — reduziert
Editierbare Felder mit Speichern-Button:
- `kategorie` (Select: Service / Reparatur / MFK / Reifen / Sonstiges)
- `km_stand`
- `arbeit_beschreibung`
- `arbeitszeit_stunden`
- `mechaniker_zuweisung` (Select: Roman / Pascal)
- `auftragswert_chf` (von n8n vorbefüllt, editierbar)
- `notizen`
- Kunden-Block (anzeigen + editieren): `name`, `ort`, `telefon`, `email`

**Entfernt:** ~~naechster_service_datum~~, ~~naechster_service_km~~, ~~mfk_datum~~

### Was du parallel in n8n ergänzt
- **Supabase-Node B** `fahrzeuge` Update (`kennzeichen`, `marke`, `chassis_nr`) mit Filter auf `fahrzeug_id`
- **Supabase-Node C** `kunden` Update (`name`, `ort`) mit Filter auf `kunde_id`

### Nicht in dieser Iteration
Fotos-Upload, Material-Liste-Editor, Sicherheitscheck-UI, PDF-Export, Archiv, Statistiken, Mail.

### Ergebnis
Karte im Wochenplan klicken → Detailseite → PDF links, Formular rechts → n8n-Felder vorausgefüllt → Status-Buttons funktionieren → Rest manuell ergänzen + speichern.

