import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- Mistral OCR Schema ----------
const ANNOTATION_SCHEMA = {
  type: "object",
  properties: {
    kunde: {
      type: "object",
      description:
        "Kundendaten aus dem Briefkopf. Bei 'Passant' / Laufkundschaft nur kundennummer + name='Passant' setzen, alle anderen Felder null lassen.",
      properties: {
        kundennummer: { type: "string", description: "Eindeutige Kundennummer (z.B. 10004)." },
        name: { type: "string", description: "Vollständiger Name (Vor- + Nachname zusammen) oder 'Passant'." },
        strasse: { type: ["string", "null"], description: "Strasse und Hausnummer, oder null." },
        plz: { type: ["string", "null"], description: "Exakt 4 Ziffern für CH-PLZ, oder null." },
        ort: { type: ["string", "null"] },
        telefon: { type: ["string", "null"] },
        email: { type: ["string", "null"] },
      },
      required: ["kundennummer", "name", "strasse", "plz", "ort", "telefon", "email"],
      additionalProperties: false,
    },
    fahrzeug: {
      type: ["object", "null"],
      description:
        "Fahrzeugdaten. Stehen meist in der ersten Tabellenzeile NACH der Spaltenüberschrift: Marke+Modell fett, dann Felder 'Kennzeichen:' und 'Chassis-Nr.:'. Bei reinem Service-/Aufbereitungs-Auftrag ohne Fahrzeug: null.",
      properties: {
        marke: { type: ["string", "null"], description: "z.B. BMW, VW, Opel" },
        modell: { type: ["string", "null"], description: "z.B. '135i Coupé', 'Polo', 'Vivaro 20 F28/30'" },
        kennzeichen: {
          type: ["string", "null"],
          description:
            "Schweizer Kennzeichen: 2 Kanton-Buchstaben + Ziffern, mit oder ohne Leerzeichen. Beispiele: 'AG309800', 'SO131081', 'ZH 12345'.",
        },
        chassis_nr: {
          type: ["string", "null"],
          description: "17-stellige Fahrgestellnummer (VIN), beginnt oft mit WVW/WBA/WAU.",
        },
        zulassung: { type: ["string", "null"], description: "Datum erste Zulassung im Format dd.mm.yyyy" },
      },
      required: ["marke", "modell", "kennzeichen", "chassis_nr", "zulassung"],
      additionalProperties: false,
    },
    auftragsnummer: { type: ["string", "null"], description: "Aus 'Auftrag Nr. XXXX'" },
    total_betrag: { type: ["number", "null"], description: "Geschätztes Total in CHF als reine Zahl, ohne Währung." },
    arbeit_positionen: {
      type: "array",
      description: "Liste JEDER einzelnen Arbeitsposition als reiner Text, ohne Stunden/Beträge.",
      items: { type: "string" },
    },
    materialien: {
      type: "array",
      description: "Liste der Materialpositionen mit Menge aus der jeweiligen Zeile.",
      items: {
        type: "object",
        properties: {
          artikel: { type: "string" },
          menge: { type: ["string", "null"] },
        },
        required: ["artikel", "menge"],
        additionalProperties: false,
      },
    },
  },
  required: ["kunde", "fahrzeug", "auftragsnummer", "total_betrag", "arbeit_positionen", "materialien"],
  additionalProperties: false,
};

// ---------- Postprocessing ----------
function normKennzeichen(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/\s+/g, "").toUpperCase();
  if (/^[A-Z]{2}\d{1,6}$/.test(cleaned)) return cleaned;
  return null;
}
function normPLZ(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = String(raw).match(/\b(\d{4})\b/);
  return m ? m[1] : null;
}
function normChassis(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[\s-]/g, "").toUpperCase();
  return cleaned.length >= 11 && cleaned.length <= 17 ? cleaned : null;
}
function parseBetrag(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/['\s]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
function parseMenge(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).replace(/['\s]/g, "").replace(",", ".");
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return 0;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : 0;
}

// ---------- Edge Function ----------
Deno.serve(async (req) => {
  console.log("process-beleg invoked", req.method);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const mistralKey = Deno.env.get("MISTRAL_API_KEY");
    if (!mistralKey) return json(500, { error: "MISTRAL_API_KEY not configured" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supaUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: "Unauthorized - invalid token" });
    if (userData.user.is_anonymous) return json(401, { error: "Unauthorized - anonymous not allowed" });

    const body = await req.json().catch(() => ({}));
    const rapport_id = body?.rapport_id as string | undefined;
    const pdf_path = body?.pdf_path as string | undefined;
    if (!rapport_id || !pdf_path) return json(400, { error: "rapport_id and pdf_path required" });

    const admin = createClient(supaUrl, serviceKey);

    // 1+2. Signed URL für PDF (5 min) — Rapport-Existenzcheck entfällt
    //      (das spätere UPDATE … WHERE id = rapport_id ist no-op, falls fehlend)
    const { data: signed, error: signErr } = await admin.storage
      .from("belege")
      .createSignedUrl(pdf_path, 300);
    if (signErr || !signed?.signedUrl) {
      console.error("createSignedUrl failed", signErr);
      return json(500, { error: "could not sign pdf url", details: signErr?.message });
    }


    // 3. Mistral OCR aufrufen
    console.log("Calling Mistral OCR...");
    const ocrResp = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mistralKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: { type: "document_url", document_url: signed.signedUrl },
        document_annotation_format: {
          type: "json_schema",
          json_schema: {
            name: "garage_beleg",
            schema: ANNOTATION_SCHEMA,
            strict: true,
          },
        },
      }),
    });

    const ocrText = await ocrResp.text();
    if (!ocrResp.ok) {
      console.error("Mistral OCR failed", ocrResp.status, ocrText.slice(0, 500));
      return json(502, { error: "mistral-ocr-failed", status: ocrResp.status, body: ocrText.slice(0, 500) });
    }
    const ocrJson = JSON.parse(ocrText);
    const annotationRaw = ocrJson.document_annotation;
    if (!annotationRaw) {
      console.error("No document_annotation in response", Object.keys(ocrJson));
      return json(502, { error: "no-annotation", keys: Object.keys(ocrJson) });
    }
    const extracted =
      typeof annotationRaw === "string" ? JSON.parse(annotationRaw) : annotationRaw;
    console.log("OCR extracted", { kundennummer: extracted?.kunde?.kundennummer, hasFahrzeug: !!extracted?.fahrzeug });

    const warnings: string[] = [];

    // 4. Kunde upsert
    let kunde_id: string | null = null;
    const k = extracted?.kunde;
    if (k?.kundennummer) {
      const plz = normPLZ(k.plz);
      if (k.plz && !plz) warnings.push("PLZ ungültig");
      const updateFields: Record<string, unknown> = {};
      if (k.name) updateFields.name = k.name;
      if (k.strasse) updateFields.strasse = k.strasse;
      if (plz) updateFields.plz = plz;
      if (k.ort) updateFields.ort = k.ort;
      if (k.telefon) updateFields.telefon = k.telefon;
      if (k.email) updateFields.email = k.email;

      const { data: existingKunde } = await admin
        .from("kunden")
        .select("id")
        .eq("kundennummer", k.kundennummer)
        .maybeSingle();

      if (existingKunde) {
        kunde_id = existingKunde.id;
        if (Object.keys(updateFields).length > 0) {
          await admin.from("kunden").update(updateFields).eq("id", existingKunde.id);
        }
      } else {
        const { data: inserted, error: insErr } = await admin
          .from("kunden")
          .insert({ kundennummer: k.kundennummer, ...updateFields })
          .select("id")
          .single();
        if (insErr) {
          console.error("Kunde insert failed", insErr);
          warnings.push("Kunde konnte nicht angelegt werden");
        } else {
          kunde_id = inserted.id;
        }
      }
    } else {
      warnings.push("Keine Kundennummer erkannt");
    }

    // 5. Fahrzeug upsert
    let fahrzeug_id: string | null = null;
    const f = extracted?.fahrzeug;
    if (f && (f.chassis_nr || f.kennzeichen || f.marke)) {
      const kennzeichen = normKennzeichen(f.kennzeichen);
      if (f.kennzeichen && !kennzeichen) warnings.push("Kennzeichen-Format ungültig");
      const chassis_nr = normChassis(f.chassis_nr);
      if (f.chassis_nr && !chassis_nr) warnings.push("Chassis-Nr ungültig");

      // Suche
      let existingFahrzeug: { id: string } | null = null;
      if (chassis_nr) {
        const { data } = await admin
          .from("fahrzeuge")
          .select("id")
          .eq("chassis_nr", chassis_nr)
          .maybeSingle();
        existingFahrzeug = data;
      }
      if (!existingFahrzeug && kennzeichen) {
        const { data } = await admin
          .from("fahrzeuge")
          .select("id")
          .eq("kennzeichen", kennzeichen)
          .maybeSingle();
        existingFahrzeug = data;
      }

      const fields: Record<string, unknown> = {};
      if (f.marke) fields.marke = f.marke;
      if (f.modell) fields.modell = f.modell;
      if (kennzeichen) fields.kennzeichen = kennzeichen;
      if (chassis_nr) fields.chassis_nr = chassis_nr;

      if (existingFahrzeug) {
        fahrzeug_id = existingFahrzeug.id;
        if (Object.keys(fields).length > 0) {
          await admin.from("fahrzeuge").update(fields).eq("id", existingFahrzeug.id);
        }
      } else {
        const insertObj: Record<string, unknown> = { ...fields };
        if (kunde_id) insertObj.kunde_id = kunde_id;
        else if (k?.kundennummer) insertObj.kundennummer_hint = k.kundennummer;
        const { data: inserted, error: insErr } = await admin
          .from("fahrzeuge")
          .insert(insertObj)
          .select("id")
          .single();
        if (insErr) {
          console.error("Fahrzeug insert failed", insErr);
          warnings.push("Fahrzeug konnte nicht angelegt werden");
        } else {
          fahrzeug_id = inserted.id;
        }
      }
    } else {
      warnings.push("Kein Fahrzeug im Beleg");
    }

    // 6. arbeitsrapporte verknüpfen
    const rapUpdate: Record<string, unknown> = {};
    if (kunde_id) rapUpdate.kunde_id = kunde_id;
    if (fahrzeug_id) rapUpdate.fahrzeug_id = fahrzeug_id;
    const totalBetrag = parseBetrag(extracted?.total_betrag);
    if (totalBetrag !== null) rapUpdate.auftragswert_chf = totalBetrag;
    if (Object.keys(rapUpdate).length > 0) {
      const { error: rapUpdErr } = await admin
        .from("arbeitsrapporte")
        .update(rapUpdate)
        .eq("id", rapport_id);
      if (rapUpdErr) console.error("Rapport update failed", rapUpdErr);
    }

    // 7. Positionen (Idempotenz: zuerst alte OCR-Positionen löschen)
    await admin
      .from("rapport_positionen")
      .delete()
      .eq("rapport_id", rapport_id)
      .in("typ", ["arbeit", "material"]);

    const positionen: Array<Record<string, unknown>> = [];
    let sort = 0;
    if (Array.isArray(extracted?.arbeit_positionen)) {
      for (const a of extracted.arbeit_positionen) {
        if (!a) continue;
        positionen.push({
          rapport_id,
          typ: "arbeit",
          beschreibung: String(a),
          menge: 0,
          einheit: "Check",
          sort_order: sort++,
        });
      }
    }
    if (Array.isArray(extracted?.materialien)) {
      for (const m of extracted.materialien) {
        if (!m?.artikel) continue;
        positionen.push({
          rapport_id,
          typ: "material",
          beschreibung: String(m.artikel),
          menge: parseMenge(m.menge),
          einheit: "Stk/L",
          sort_order: sort++,
        });
      }
    }
    if (positionen.length > 0) {
      const { error: posErr } = await admin.from("rapport_positionen").insert(positionen);
      if (posErr) {
        console.error("Positionen insert failed", posErr);
        warnings.push(`Positionen konnten nicht gespeichert werden: ${posErr.message}`);
      }
    }

    return json(200, {
      ok: true,
      rapport_id,
      kunde_id,
      fahrzeug_id,
      auftragswert_chf: totalBetrag,
      positionen_count: positionen.length,
      warnings,
    });
  } catch (e) {
    console.error("process-beleg error", e);
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
