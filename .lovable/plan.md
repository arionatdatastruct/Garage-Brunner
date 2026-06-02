# Kartenlayout fix: Kundenname immer sichtbar

## Problem
In `src/components/MobileWochenplan.tsx` (Zeilen 148–152) werden Marke/Modell und Kundenname in **einer** Zeile mit `truncate` gerendert:

```
{marke} · {kundeName}
```

Bei langen Fahrzeugbezeichnungen wird der Name durch `truncate` abgeschnitten → er „verschwindet". Bei kurzen Bezeichnungen (z. B. AG549638 am Dienstag) bleibt er sichtbar. Das Verhalten ist also nicht zufällig, sondern abhängig von der Textlänge.

## Lösung
Layout in **zwei Zeilen** aufteilen, Name unter Marke/Modell – wie beim AG549638-Beispiel:

- Zeile 1 (klein, `text-xs`, `text-muted-foreground`, `truncate`): Marke/Modell
- Zeile 2 (klein, `text-xs`, `text-muted-foreground/80`, `truncate`): Kundenname (nur wenn vorhanden)

Wenn kein Fahrzeug vorhanden: „Kein Fahrzeug" in Zeile 1, Zeile 2 entfällt.
Wenn kein Kundenname (Passant): nur Zeile 1.

## Betroffene Datei
- `src/components/MobileWochenplan.tsx` – nur der Block Zeilen 148–152

## Nicht betroffen
- Datenfetching, Typen, andere Karten (Desktop `RapportUebersicht` bleibt unverändert, sofern nicht ebenfalls gewünscht)
