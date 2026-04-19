import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Fahrzeug {
  id: string; // = neuester rapport.id für dieses Kennzeichen
  kennzeichen: string;
  marke: string | null;
  modell: string | null;
  kundennummer: string | null;
  kunde_name: string | null;
  kunde_ort: string | null;
  kunde_telefon: string | null;
  kunde_email: string | null;
}

export interface HistorieItem {
  id: string;
  geplantes_datum: string;
  kategorie: string | null;
  material_liste: any;
  arbeit_beschreibung: string | null;
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
      // Suche flach in arbeitsrapporte; jüngsten Eintrag pro Kennzeichen behalten
      const { data } = await (supabase as any)
        .from('arbeitsrapporte')
        .select('id, kennzeichen, marke, modell, kundennummer, kunde_name, kunde_ort, kunde_telefon, kunde_email, created_at')
        .ilike('kennzeichen', `%${query}%`)
        .not('kennzeichen', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      const seen = new Set<string>();
      const mapped: Fahrzeug[] = [];
      for (const d of (data || [])) {
        const key = (d.kennzeichen || '').toUpperCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        mapped.push({
          id: d.id,
          kennzeichen: d.kennzeichen,
          marke: d.marke,
          modell: d.modell,
          kundennummer: d.kundennummer,
          kunde_name: d.kunde_name,
          kunde_ort: d.kunde_ort,
          kunde_telefon: d.kunde_telefon,
          kunde_email: d.kunde_email,
        });
        if (mapped.length >= 10) break;
      }
      setResults(mapped);
      setSearching(false);
    }, 300);
  }, []);

  const loadHistorie = useCallback(async (kennzeichen: string) => {
    setHistorieLoading(true);
    const { data } = await (supabase as any)
      .from('arbeitsrapporte')
      .select('id, geplantes_datum, kategorie, material_liste, arbeit_beschreibung')
      .eq('kennzeichen', kennzeichen)
      .order('geplantes_datum', { ascending: false })
      .limit(5);
    setHistorie((data as HistorieItem[]) || []);
    setHistorieLoading(false);
  }, []);

  const clearHistorie = useCallback(() => {
    setHistorie([]);
  }, []);

  return { results, searching, search, setResults, historie, historieLoading, loadHistorie, clearHistorie };
}
