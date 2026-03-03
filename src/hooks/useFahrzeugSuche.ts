import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Fahrzeug {
  id: string;
  kennzeichen: string;
  marke: string | null;
  modell: string | null;
  jahrgang: string | null;
  kunde_name: string | null;
  kunde_telefon: string | null;
  kunde_adresse: string | null;
  kunde_email: string | null;
}

export interface HistorieItem {
  id: string;
  datum: string;
  kategorie: string | null;
  km_stand: number | null;
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
      const { data } = await supabase
        .from('fahrzeuge')
        .select('*')
        .ilike('kennzeichen', `%${query}%`)
        .limit(10);
      setResults((data as Fahrzeug[]) || []);
      setSearching(false);
    }, 300);
  }, []);

  const loadHistorie = useCallback(async (fahrzeugId: string) => {
    setHistorieLoading(true);
    const { data } = await supabase
      .from('arbeitsrapporte')
      .select('id, datum, kategorie, km_stand, material_liste, arbeit_beschreibung')
      .eq('fahrzeug_id', fahrzeugId)
      .order('datum', { ascending: false })
      .limit(5);
    setHistorie((data as HistorieItem[]) || []);
    setHistorieLoading(false);
  }, []);

  return { results, searching, search, setResults, historie, historieLoading, loadHistorie };
}
