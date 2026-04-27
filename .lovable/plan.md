## Diagnose: "Fehler beim Laden" in der published Version

### Was ich gefunden habe

In den Postgres-Logs erscheinen wiederholt echte DB-Fehler:

```
column arbeitsrapporte.kennzeichen does not exist
column arbeitsrapporte.auftragsnummer does not exist
```

Im **aktuellen Code** gibt es diese Spaltenreferenzen nicht mehr — sie wurden bei der Schema-Refaktorierung entfernt (`kennzeichen` lebt nur noch auf `fahrzeuge`, `auftragsnummer` heisst jetzt `rapport_nummer`).

**Schlussfolgerung:** Die **published Version (`*.lovable.app`)** läuft auf einem **älteren Build**, der noch die alten Spaltennamen abfragt. Das ist genau die Ursache für „Fehler beim Laden". In der Preview funktioniert es, weil dort der aktuelle Code läuft.

### Wo wir letztes Mal stehen geblieben sind

Die letzte abgeschlossene Änderung war die DB-Migration: `arbeitsrapporte.kunde_id` als FK zu `kunden`, plus zwei Auto-Link-Trigger (`rapport_auto_link_kunde`, `fahrzeug_backfill_rapporte_kunde`) und Backfill der bestehenden Reports. Frontend (`rapport-relations.ts`) wurde entsprechend angepasst, sodass der Kunde direkt am Rapport gelesen wird, mit Fallback aufs Fahrzeug. Das ist alles im Code, aber **noch nicht published**.

Offen aus früheren Loops blieb noch:
- Aufgaben-Ansicht ist „nicht übersichtlich" (kosmetische Überarbeitung)
- Foto-Upload-Flow durchprüfen, ob alles in DB/Storage korrekt landet

Diese zwei Punkte sind im aktuellen Bug nicht der Auslöser.

## Lösung

### 1. Frontend neu publishen (User-Aktion)
Die Hauptursache wird durch ein Re-Publish behoben. Über den **Publish → Update**-Button im Editor oben rechts. Frontend-Änderungen gehen erst nach diesem Klick live; die Preview-URL spiegelt sie sofort, die `*.lovable.app`-URL nicht.

### 2. Auth-Race-Condition härten (kleiner Code-Fix)

`AuthGate` setzt `ready=true`, sobald `signInAnonymously()` zurückkommt — aber Komponenten beginnen sofort zu queryen, bevor das JWT garantiert vom Supabase-Client als Header gesendet wird. Bei langsamen Netzen/Cold-Starts kann das einen Query ohne gültigen Token absetzen → RLS blockt → „Fehler beim Laden".

Fix in `src/components/AuthGate.tsx`:
- `getSession()` nach `signInAnonymously()` erneut prüfen, erst dann `ready=true`
- `ready` nur setzen, wenn die Session wirklich `access_token` enthält

### 3. Bessere Fehlermeldungen (Optional, klein)

In `src/pages/Wochenplan.tsx` Zeile 365: statt `toast.error("Fehler beim Laden")` den `error.message` mitgeben. So sehen wir beim nächsten Mal die echte Ursache (z.B. „column does not exist") direkt im Toast statt nur im Backend-Log. Gleiches Muster in `Archiv.tsx` Zeile 119.

## Technische Details

**Geänderte Dateien:**
- `src/components/AuthGate.tsx` — Session-Verify nach Anon-Login
- `src/pages/Wochenplan.tsx` — Fehlermeldung mit `error.message`
- `src/pages/Archiv.tsx` — Fehlermeldung mit `error.message`

**Keine DB-Migration nötig.** Schema und RLS sind korrekt.

**User-Aktion nach Implementierung:** Im Editor oben rechts auf **Publish → Update** klicken, damit die `lovable.app`-Domain den aktuellen Build bekommt.
