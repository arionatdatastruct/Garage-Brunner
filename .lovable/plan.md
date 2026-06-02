## Ziel

n8n-Workflow + externen Webhook abschaffen. Alles läuft in einer einzigen Supabase Edge Function `process-beleg`, die Mistral OCR **direkt** (nicht via Lovable AI Gateway) aufruft. Mistral-API-Key bleibt im Edge-Function-Secret.

## Analyse der 2 Fehlbelege

| Beleg | Problem | Echte Ursache | Lösbar durch |
|---|---|---|---|
| 2234 (Passant) | Keine Fahrzeug-/Kontaktdaten extrahiert | PDF enthält schlicht keine — nur Kundennr 10004, "Passant", 4852 Rothrist | Edge Function muss leere Felder sauber überspringen, kein Fehler werfen |
| 2322 (BMW 135i) | Kennzeichen SO131081 + Chassis nicht erkannt | Stehen in Tabellenzeile, Mistral receipt-Template verliert Layout | Schema-Tuning: Fahrzeug als verschachteltes Object mit klaren Beispielen + Fallback-Hinweis "kann in Tabellenzeile stehen" |

Mistral-Qualität ist also faktisch ~9/10, nicht 8/10. Wechsel zu Klippa nicht nötig.

## Architektur neu

```text
Frontend (NeuerAuftragSheet / NeuerAuftragDialog)
    │ PDF Upload → Storage "belege/{rapport_id}/..."
    │ Update arbeitsrapporte.pdf_url
    │
    ▼
supabase.functions.invoke("process-beleg", { rapport_id, pdf_path })
    │
    ▼
Edge Function process-beleg (Deno)
    1. JWT validieren (getClaims)
    2. Signed URL für PDF erzeugen (5min, mit service_role_key)
    3. PDF an Mistral OCR API (https://api.mistral.ai/v1/ocr)
       → ocrWithAnnotations + document_annotation_schema
    4. Antwort validieren (Zod)
    5. Postprocessing: Kennzeichen-Regex, PLZ, Beträge
    6. Kunde upsert (nach kundennummer)
    7. Fahrzeug upsert (nach chassis_nr, fallback kennzeichen)
    8. arbeitsrapporte update (kunde_id, fahrzeug_id, auftragswert_chf)
    9. rapport_positionen insert (Arbeit + Material)
    10. Response { ok: true, extracted: {...}, warnings: [...] }
```

Cloudflare-Access, n8n, `notify-n8n`, `N8N_PDF_WEBHOOK_URL`, `CF_ACCESS_*` Secrets entfallen komplett.

## Verbessertes Annotation-Schema

Gegenüber n8n-Version geändert:

```json
{
  "kunde": {
    "type": "object",
    "description": "Kundendaten aus Briefkopf. Bei 'Passant' oder Laufkundschaft: nur kundennummer + name='Passant', Rest null.",
    "properties": {
      "kundennummer": { "type": "string" },
      "name": { "type": "string", "description": "Vollständiger Name (Vor- + Nachname zusammen)." },
      "strasse": { "type": ["string", "null"] },
      "plz": { "type": ["string", "null"], "description": "Exakt 4 Ziffern für CH." },
      "ort": { "type": ["string", "null"] },
      "telefon": { "type": ["string", "null"] },
      "email": { "type": ["string", "null"] }
    },
    "required": ["kundennummer", "name"]
  },
  "fahrzeug": {
    "type": ["object", "null"],
    "description": "Steht meist in der ersten Tabellenzeile NACH der Spaltenüberschrift. Marke+Modell fett, dann separate Felder 'Kennzeichen:' und 'Chassis-Nr.:'. Bei reinem Service-/Aufbereitungs-Auftrag ohne Fahrzeug: null.",
    "properties": {
      "marke": { "type": "string", "description": "z.B. BMW, VW, Opel" },
      "modell": { "type": "string", "description": "z.B. '135i Coupé', 'Polo', 'Vivaro 20 F28/30'" },
      "kennzeichen": { "type": ["string", "null"], "description": "CH-Format: 2 Buchstaben + Ziffern, mit oder ohne Leerzeichen. Beispiele: 'AG309800', 'SO131081', 'ZH 12345'." },
      "chassis_nr": { "type": ["string", "null"], "description": "17-stellige VIN, beginnt oft mit WVW/WBA/WAU." },
      "zulassung": { "type": ["string", "null"], "description": "Format dd.mm.yyyy" }
    }
  },
  "auftragsnummer": { "type": "string", "description": "Aus 'Auftrag Nr. XXXX'" },
  "total_betrag": { "type": ["number", "null"], "description": "Geschätztes Total in CHF, nur Zahl." },
  "arbeit_positionen": { "type": "array", "items": { "type": "string" } },
  "materialien": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "artikel": { "type": "string" },
        "menge": { "type": ["string", "null"] }
      },
      "required": ["artikel"]
    }
  }
}
```

Kernverbesserungen:
- `kunde` und `fahrzeug` als verschachtelte Objekte → Mistral muss zusammenhängend extrahieren statt 12 lose Felder
- explizite `null`-Erlaubnis für jeden Optional → kein Halluzinieren
- "Passant"-Fall explizit beschrieben → Beleg 2234 wird sauber leer
- Kennzeichen-Beispiele im Description → Beleg 2322 wird korrekt erkannt
- "Tabellenzeile nach Spaltenüberschrift" Hinweis → robuster gegen Layout-Varianten

## Postprocessing in der Edge Function

```ts
// Kennzeichen normalisieren (CH-Format)
function normalizeKennzeichen(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, "").toUpperCase();
  if (/^[A-Z]{2}\d{1,6}$/.test(cleaned)) return cleaned;
  return null; // → warning
}

// PLZ validieren (4 Ziffern CH)
function normalizePLZ(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/\b(\d{4})\b/);
  return m ? m[1] : null;
}

// Betrag: "2'417.30" / "2,417.30" → 2417.30
function parseBetrag(v: number | string | null): number | null { ... }
```

Felder, die nach Postprocessing leer/ungültig sind, landen in `warnings[]` und werden zurück an den Client gemeldet → UI kann gelb hinterlegen.

## Datenbank-Operationen

Upserts laufen mit `service_role_key` innerhalb der Edge Function (umgeht RLS, da bereits authentifiziert):

1. **Kunde:** `select … where kundennummer=$1` → wenn vorhanden: update Kontaktfelder nur wenn neu nicht null. Wenn nicht: insert. Trigger `kunde_backfill_fahrzeuge` greift automatisch.
2. **Fahrzeug:** `select … where chassis_nr=$1` (primary) oder `kennzeichen=$1` (fallback). Wenn vorhanden: update fehlender Felder. Wenn nicht und mindestens kennzeichen ODER chassis_nr da: insert mit `kundennummer_hint` → Trigger `fahrzeug_auto_link_kunde` verknüpft.
3. **arbeitsrapporte:** update `kunde_id`, `fahrzeug_id`, `auftragswert_chf`.
4. **rapport_positionen:** vorher `delete where rapport_id=$1 AND typ in ('arbeit','material')` (Idempotenz bei Retry), dann bulk insert.

## Frontend-Änderungen

- `src/components/NeuerAuftragSheet.tsx` + `NeuerAuftragDialog.tsx`: `invoke("notify-n8n", ...)` → `invoke("process-beleg", { rapport_id, pdf_path })`. Pfad statt Public-URL übergeben (Edge Function macht selbst Signed URL).
- Toast bei Warnings: `OCR fertig — {n} Felder konnten nicht extrahiert werden, bitte prüfen`.
- Optional Phase 2: "OCR erneut ausführen"-Button im AuftragDetail (nicht in Phase 1).

## Aufräumen

- `supabase/functions/notify-n8n/` löschen
- `supabase/config.toml`: `[functions.notify-n8n]` Block entfernen, für `process-beleg` neuen Block mit `verify_jwt = false` (validieren im Code via getClaims)
- Secrets behalten/neu: `MISTRAL_API_KEY` (neu, von dir per add_secret), `SUPABASE_SERVICE_ROLE_KEY` (vorhanden). `N8N_PDF_WEBHOOK_URL` + `CF_ACCESS_CLIENT_ID` + `CF_ACCESS_CLIENT_SECRET` werden nach erfolgreichem Test gelöscht.

## Reihenfolge

1. `MISTRAL_API_KEY` als Secret hinzufügen (du gibst Key in Lovable-Dialog ein)
2. Edge Function `process-beleg` schreiben + deployen
3. Frontend umstellen auf `process-beleg`
4. Mit beiden Test-PDFs (2234 + 2322) verifizieren
5. `notify-n8n` Edge Function löschen, Secrets cleanen, n8n-Workflow + Cloudflare-Webhook-Tunnel kannst du danach abschalten

## Was bewusst NICHT drin ist

- Klippa-Integration (überflüssig laut Analyse, deutlich teurer)
- Lovable AI Gateway (du willst direkt Mistral, OK)
- Hybrid-Fallback (Mistral 9.5/10 reicht)
- Manueller "Re-OCR"-Button (Phase 2 falls gewünscht)
- Bildvor-Preprocessing (Belege sind digital generiert, keine Scans)

## Offene Fragen

1. **Mistral-Key:** Bestehender Account aus n8n weiterverwenden oder neuen Key generieren?
2. **Idempotenz bei rapport_positionen:** OK wenn ich bei Re-Run alte `arbeit`/`material`-Positionen lösche und neu schreibe? Manuell erfasste Positionen bleiben dadurch erhalten (haben andere typ-Werte? — bitte bestätigen oder ich gehe davon aus dass User vor erstem OCR-Run keine Positionen erfasst).
3. **Warnings im UI:** Reicht ein Toast oder willst du die fehlenden Felder pro Rapport markiert haben (z.B. gelbes Badge im AuftragDetail)?