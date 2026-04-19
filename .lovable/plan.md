
User confirms: keep mechaniker as single-select (skip DB migration). Only kategorie becomes multi-select with IDs. Plus enlarge PDF preview.

## Plan

**1. PDF-Vorschau vergrössern**
- `AuftragDetail.tsx` Desktop: Split von 50/50 auf 40/60 (Form/PDF), PDF-Pane mit mehr Höhe (`h-[calc(100vh-8rem)]`).
- `BelegPreview.tsx`: `width`-Berechnung auf grösseren Container anpassen, Padding reduzieren, Page-Width auf Container-Breite skalieren statt fix.
- Mobile Tab "Beleg": `min-h-[80vh]` statt aktueller Höhe.

**2. Kategorie als Multi-Select mit IDs**
- Neues ID-Schema (gespeichert als kommaseparierter String in `kategorie` TEXT-Spalte):
  - `01` Service, `02` Reparatur, `03` MFK, `04` Reifen, `05` Sonstiges
- Neue Datei `src/lib/kategorien.ts`: Konstante `KATEGORIEN = [{id:"01", label:"Service"}, ...]`, Helfer `parseKategorien(str)`, `formatKategorien(ids)`, `kategorienLabels(ids)`.
- `AuftragForm.tsx`: aktuelles `<Select>` für Kategorie ersetzen durch Multi-Select-Popover (Checkbox-Liste mit Badge-Anzeige der gewählten Labels). Speichert `"01,03"` in DB.
- `RapportUebersicht.tsx`, `Archiv.tsx`, `Statistiken.tsx`, `Wochenplan.tsx`, `KundeDetail.tsx`: Anzeige umstellen auf `kategorienLabels(rapport.kategorie)` (Labels statt rohe IDs/alte Strings).
- **Backwards-Kompat**: `parseKategorien` erkennt alte Klartext-Werte ("Service", "Reparatur" …) und mappt sie auf IDs, damit bestehende Datensätze sauber angezeigt werden.

**3. Mechaniker bleibt unverändert** (Single-Select Roman/Pascal, kein DB-Change).

**4. n8n-Auswertung**
- Da IDs vorne stehen (`01,03`), kann n8n per `LIKE '%01%'` oder Split filtern. In Notiz an User erwähnt.

## Dateien
- new: `src/lib/kategorien.ts`
- edit: `src/components/AuftragForm.tsx`, `src/components/RapportUebersicht.tsx`, `src/pages/AuftragDetail.tsx`, `src/components/BelegPreview.tsx`, `src/pages/Archiv.tsx`, `src/pages/Statistiken.tsx`, `src/pages/Wochenplan.tsx`, `src/pages/KundeDetail.tsx`

Keine DB-Migration nötig (Spalte ist bereits TEXT).
