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

  const search = useCallback((query: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (query.length < 2) { setResults([]); return; }
    setSearching(true);
    timeoutRef.current = setTimeout(async () => {
      const q = `%${query}%`;
      // Suche in fahrzeuge (kennzeichen, marke, modell) JOIN kunden (name, kundennummer)
      const { data } = await (supabase as any)
        .from('fahrzeuge')
        .select(`
          id, kennzeichen, marke, modell, chassis_nr,
          kunde:kunden ( id, kundennummer, name, ort, telefon, email )
        `)
        .or(`kennzeichen.ilike.${q},marke.ilike.${q},modell.ilike.${q},chassis_nr.ilike.${q}`)
        .limit(30);

      // Zusätzlich nach Kunden suchen, dann deren Fahrzeuge
      const { data: kData } = await (supabase as any)
        .from('kunden')
        .select(`
          id, kundennummer, name, ort, telefon, email,
          fahrzeuge:fahrzeuge!fahrzeuge_kunde_id_fkey ( id, kennzeichen, marke, modell, chassis_nr )
        `)
        .or(`name.ilike.${q},kundennummer.ilike.${q}`)
        .limit(15);

      const merged: Fahrzeug[] = [];
      const seen = new Set<string>();

      for (const f of (data || [])) {
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
      for (const k of (kData || [])) {
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

      // Für jedes Fahrzeug den jüngsten Rapport nachladen (für Navigation)
      const ids = merged.slice(0, 10).map((f) => f.id);
      if (ids.length > 0) {
        const { data: raps } = await (supabase as any)
          .from('arbeitsrapporte')
          .select('id, fahrzeug_id, created_at')
          .in('fahrzeug_id', ids)
          .order('created_at', { ascending: false });
        const lastByFz = new Map<string, string>();
        for (const r of (raps || [])) {
          if (!lastByFz.has(r.fahrzeug_id)) lastByFz.set(r.fahrzeug_id, r.id);
        }
        for (const f of merged) {
          f.letzter_rapport_id = lastByFz.get(f.id) ?? null;
        }
      }

      setResults(merged.slice(0, 10));
      setSearching(false);
    }, 300);
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
