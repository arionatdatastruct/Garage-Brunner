import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Fahrzeug {
  id: string; // = fahrzeuge.id
  kennzeichen: string | null;
  marke: string | null;
  modell: string | null;
  chassis_nr: string | null;
  kundennummer: string | null;
  kunde_name: string | null;
  kunde_ort: string | null;
  kunde_telefon: string | null;
  kunde_email: string | null;
  // Neuester Rapport für dieses Fahrzeug — fürs Navigieren
  letzter_rapport_id: string | null;
}

export interface HistorieItem {
  id: string;
  geplantes_datum: string;
  kategorie: string | null;
  arbeit_beschreibung: string | null; // bleibt als Feld, wird aus Positionen aggregiert
  material_liste: any; // bleibt als Feld, wird aus Positionen aggregiert
}

export function useFahrzeugSuche() {
  const [results, setResults] = useState<Fahrzeug[]>([]);
  const [searching, setSearching] = useState(false);
  const [historie, setHistorie] = useState<HistorieItem[]>([]);
  const [historieLoading, setHistorieLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const seqRef = useRef(0);

  const search = useCallback((rawQuery: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const query = (rawQuery ?? '').trim();
    if (query.length < 2) {
      seqRef.current++; // invalidate in-flight
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const mySeq = ++seqRef.current;

    timeoutRef.current = setTimeout(async () => {
      // PostgREST or-filter: Sonderzeichen (, ) . % ") müssen über Quoting
      // entschärft werden, sonst bricht der Parser oder liefert leere Treffer.
      const escVal = (s: string) =>
        `"%${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}%"`;
      const v = escVal(query);
      const compact = query.replace(/\s+/g, '');
      const vCompact = compact && compact !== query ? escVal(compact) : null;

      const fzFields = [
        `kennzeichen.ilike.${v}`,
        ...(vCompact ? [`kennzeichen.ilike.${vCompact}`] : []),
        `marke.ilike.${v}`,
        `modell.ilike.${v}`,
        `chassis_nr.ilike.${v}`,
        ...(vCompact ? [`chassis_nr.ilike.${vCompact}`] : []),
      ].join(',');

      const kdFields = [
        `name.ilike.${v}`,
        `kundennummer.ilike.${v}`,
      ].join(',');

      const [fzRes, kdRes] = await Promise.all([
        (supabase as any)
          .from('fahrzeuge')
          .select(`
            id, kennzeichen, marke, modell, chassis_nr,
            kunde:kunden ( id, kundennummer, name, ort, telefon, email )
          `)
          .or(fzFields)
          .limit(30),
        (supabase as any)
          .from('kunden')
          .select(`
            id, kundennummer, name, ort, telefon, email,
            fahrzeuge:fahrzeuge!fahrzeuge_kunde_id_fkey ( id, kennzeichen, marke, modell, chassis_nr )
          `)
          .or(kdFields)
          .limit(15),
      ]);

      if (mySeq !== seqRef.current) return; // stale response, neuere läuft

      const merged: Fahrzeug[] = [];
      const seen = new Set<string>();

      for (const f of (fzRes?.data || [])) {
        if (seen.has(f.id)) continue;
        seen.add(f.id);
        merged.push({
          id: f.id,
          kennzeichen: f.kennzeichen,
          marke: f.marke,
          modell: f.modell,
          chassis_nr: f.chassis_nr,
          kundennummer: f.kunde?.kundennummer ?? null,
          kunde_name: f.kunde?.name ?? null,
          kunde_ort: f.kunde?.ort ?? null,
          kunde_telefon: f.kunde?.telefon ?? null,
          kunde_email: f.kunde?.email ?? null,
          letzter_rapport_id: null,
        });
      }
      for (const k of (kdRes?.data || [])) {
        for (const f of (k.fahrzeuge || [])) {
          if (seen.has(f.id)) continue;
          seen.add(f.id);
          merged.push({
            id: f.id,
            kennzeichen: f.kennzeichen,
            marke: f.marke,
            modell: f.modell,
            chassis_nr: f.chassis_nr,
            kundennummer: k.kundennummer ?? null,
            kunde_name: k.name ?? null,
            kunde_ort: k.ort ?? null,
            kunde_telefon: k.telefon ?? null,
            kunde_email: k.email ?? null,
            letzter_rapport_id: null,
          });
        }
      }

      // Relevanz-Sortierung: exakte / Prefix-Treffer auf Kennzeichen zuerst
      const ql = query.toLowerCase();
      const qc = compact.toLowerCase();
      const score = (f: Fahrzeug) => {
        const kz = (f.kennzeichen ?? '').toLowerCase();
        const kzc = kz.replace(/\s+/g, '');
        if (kz === ql || kzc === qc) return 0;
        if (kz.startsWith(ql) || kzc.startsWith(qc)) return 1;
        if (kz.includes(ql) || kzc.includes(qc)) return 2;
        if ((f.kunde_name ?? '').toLowerCase().includes(ql)) return 3;
        return 4;
      };
      merged.sort((a, b) => score(a) - score(b));

      const top = merged.slice(0, 10);

      // Für die Top-Treffer den jüngsten Rapport nachladen (für Navigation)
      const ids = top.map((f) => f.id);
      if (ids.length > 0) {
        const { data: raps } = await (supabase as any)
          .from('arbeitsrapporte')
          .select('id, fahrzeug_id, created_at')
          .in('fahrzeug_id', ids)
          .order('created_at', { ascending: false });
        if (mySeq !== seqRef.current) return;
        const lastByFz = new Map<string, string>();
        for (const r of (raps || [])) {
          if (!lastByFz.has(r.fahrzeug_id)) lastByFz.set(r.fahrzeug_id, r.id);
        }
        for (const f of top) {
          f.letzter_rapport_id = lastByFz.get(f.id) ?? null;
        }
      }

      setResults(top);
      setSearching(false);
    }, 250);
  }, []);


  const loadHistorie = useCallback(async (fahrzeugId: string) => {
    setHistorieLoading(true);
    const { data } = await (supabase as any)
      .from('arbeitsrapporte')
      .select(`
        id, geplantes_datum, kategorie,
        positionen:rapport_positionen ( typ, beschreibung, menge, einheit )
      `)
      .eq('fahrzeug_id', fahrzeugId)
      .order('geplantes_datum', { ascending: false })
      .limit(5);
    const items: HistorieItem[] = (data || []).map((r: any) => ({
      id: r.id,
      geplantes_datum: r.geplantes_datum,
      kategorie: r.kategorie,
      arbeit_beschreibung: (r.positionen || [])
        .filter((p: any) => p.typ === 'arbeit')
        .map((p: any) => p.beschreibung)
        .filter(Boolean)
        .join(', ') || null,
      material_liste: (r.positionen || []).filter((p: any) => p.typ === 'material'),
    }));
    setHistorie(items);
    setHistorieLoading(false);
  }, []);

  const clearHistorie = useCallback(() => {
    setHistorie([]);
  }, []);

  return { results, searching, search, setResults, historie, historieLoading, loadHistorie, clearHistorie };
}
