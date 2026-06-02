## Plan

1. **Kundennamen im Desktop/Tablet-Wochenplan korrigieren**
   - In `src/pages/Wochenplan.tsx` die Kartenlogik so anpassen, dass nicht nur `kunde.name`, sondern auch `kunde.vorname`/`kunde.nachname` und als Fallback `kundennummer` sauber angezeigt werden.
   - Dadurch erscheint der Kundenname wie in der mobilen Ansicht zuverlässig unter dem Fahrzeugmodell.

2. **Layout stabil halten**
   - Fahrzeugzeile bleibt oben: Marke + Modell.
   - Kundenzeile bleibt separat darunter und bekommt `min-w-0`/`truncate`, damit lange Modellnamen den Kundennamen nicht verdrängen.

3. **Mobile Darstellung nicht verändern**
   - `MobileWochenplan.tsx` bleibt unverändert, da dort die Struktur bereits korrekt ist.

## Technische Details

Aktuell rendert die Desktop/Tablet-Karte nur `r.fahrzeug?.kunde?.name`. Wenn der Kunde aber aus anderen Feldern zusammengesetzt ist oder `name` leer ist, wird zwar eine Kundenzeile vorbereitet, aber kein sichtbarer Text ausgegeben. Ich werde deshalb eine kleine Anzeigenamen-Logik direkt in `RapportCard` ergänzen und diese für die Kundenzeile verwenden.