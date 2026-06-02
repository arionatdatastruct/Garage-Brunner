## Multi-Select für Aufträge im Wochenplan

### Scope
- **Nur Desktop-Wochenplan** (`src/pages/Wochenplan.tsx`). Mobile (`MobileWochenplan`) bleibt unverändert — auf dem Handy ist Multi-Select per Touch zu fummelig.
- **Aktionen:** Verschieben auf anderen Tag, Mechaniker zuweisen, Löschen.

### Bedienkonzept

1. **Aktivierung:**
   - `Cmd/Ctrl + Klick` auf eine Karte → fügt sie zur Auswahl hinzu (toggle)
   - `Shift + Klick` → wählt Bereich (alle Karten zwischen letzter und aktueller Karte über alle Tage hinweg, in der angezeigten Reihenfolge)
   - Einzel-Klick ohne Modifier → öffnet wie bisher die Detailseite
   - Klick auf leere Fläche oder `Esc` → hebt Auswahl auf

2. **Visuelles Feedback:**
   - Selektierte Karten bekommen einen `ring-2 ring-primary` + leicht erhöhte Opacity
   - Auswahl-Zähler erscheint als schwebende Action-Bar am unteren Bildschirmrand: „3 Aufträge ausgewählt"

3. **Action-Bar (sticky bottom, nur sichtbar wenn Auswahl > 0):**
   - **Tag wählen** (Popover mit Datum-Picker oder den 7 sichtbaren Tagen als Buttons) → `UPDATE arbeitsrapporte SET geplantes_datum = ... WHERE id IN (...)`
   - **Mechaniker zuweisen** (Roman / Pascal / kein) → Batch-Update
   - **Löschen** (mit Bestätigungs-Dialog: „3 Aufträge wirklich löschen?")
   - **Abbrechen** (X-Icon → Auswahl leeren)

### Drag-and-Drop Verhalten

- Wenn man eine selektierte Karte zieht, werden **alle** selektierten Karten auf den Zielslot verschoben (gleiches Datum, ggf. Mechaniker des Zielslots).
- Wenn man eine **nicht** selektierte Karte zieht, wird die Auswahl ignoriert und nur diese Karte verschoben (bestehendes Verhalten).

### Technische Details

- Neuer State im `Wochenplan`: `selectedIds: Set<string>` + `lastClickedId: string | null` für Shift-Bereichsauswahl
- `RapportCard` bekommt zwei neue Props: `selected: boolean` und `onSelectClick(e: MouseEvent)` — die alte `onClick`-Navigation wandert in den Handler, der Modifier-Keys auswertet
- Neue Komponente `SelectionActionBar.tsx` (Fixed Bottom, animiert ein/aus mit Framer Motion analog `RapportActionSheet`)
- Batch-Operationen als einzelne Supabase-Queries mit `.in('id', selectedIds)` — kein Schleifen-Loop
- Nach erfolgreichem Batch: lokales State-Update + Toast (`"3 Aufträge verschoben"`)
- DnD: in `onDragStart` prüfen, ob die gezogene ID in `selectedIds` ist; wenn ja, im `onDragEnd` alle IDs gemeinsam updaten

### Bewusst NICHT enthalten
- Multi-Select im Archiv, Dashboard, Kunden-/Fahrzeuglisten (kann später, falls gewünscht)
- Keyboard-Shortcuts wie `Cmd+A` (Edge-Case bei vielen Karten — separat zu klären)
- Undo nach Löschen (separates Thema)

Soll ich so umsetzen?