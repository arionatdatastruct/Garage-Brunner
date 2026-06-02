## Empfehlung: NICHT splitten

~95 % der Laufzeit von `process-beleg` ist der externe Mistral-OCR-Call (~7,8 s von ~8 s gesamt). Diese Zeit lässt sich durch Aufteilen in mehrere Edge Functions nicht reduzieren — sie würde sich sogar verschlechtern (zusätzliche Cold Starts, HTTP-Hops, Auth-Roundtrips, Komplexität bei Fehlern).

## Stattdessen: gezielte Mikro-Optimierungen in derselben Function

Spart in Summe ca. **300–600 ms** pro Aufruf, ohne die Architektur zu zerreissen.

### 1. Storage Signed URL + Rapport-Check parallelisieren
Aktuell laufen sie sequenziell (`await` nacheinander). Mit `Promise.all` gleichzeitig → spart ~50–150 ms.

### 2. Rapport-Existenzprüfung entfernen
Der spätere `UPDATE … WHERE id = rapport_id` ist sicher: wenn der Rapport nicht existiert, passiert nichts. Die separate `SELECT id`-Abfrage ist überflüssig → spart 1 Roundtrip (~30–80 ms).

### 3. Kunde- und Fahrzeug-Lookup parallelisieren
Nach dem OCR sind beide Lookups voneinander unabhängig (`kundennummer` und `chassis_nr`/`kennzeichen` kommen direkt aus dem Extrakt). Mit `Promise.all` parallel laufen lassen, Upserts danach.

### 4. Positionen: Delete + Insert kombinieren
Aktuell: erst `DELETE`, dann `INSERT`. Bleibt sequenziell aus Konsistenzgründen, aber: Wenn keine neuen Positionen kommen, das `DELETE` überspringen.

### 5. Nicht-blockierende Auth-Validierung beibehalten
Der `auth.getUser()`-Call ist nötig (RLS-Schutz). Lokale JWT-Validierung via JWKS wäre möglich, aber Aufwand > Nutzen für diese eine Function — nicht empfohlen.

## Was NICHT angefasst wird

- OCR-Schema, Prompt, Mistral-Modell
- Normalisierungs-Funktionen
- DB-Schema, RLS, Trigger
- Frontend-Aufruf der Function

## Erwarteter Effekt

- Vorher: ~8.0 s
- Nachher: ~7.4–7.7 s
- Reduktion: 4–8 % (Rest ist Mistral)

Wenn du wirklich grosse Sprünge willst, müsste man am OCR-Call selbst ansetzen (z. B. kleineres Modell, Streaming-Antwort, oder OCR asynchron entkoppeln mit Status-Polling im Frontend) — das ist aber ein eigenes Thema.