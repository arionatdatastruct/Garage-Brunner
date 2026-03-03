import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Kunde {
  id: string;
  name: string;
  adresse: string | null;
  telefon: string | null;
  email: string | null;
}

export interface Fahrzeug {
  id: string;
  kennzeichen: string;
  marke: string | null;
  modell: string | null;
  jahrgang: string | null;
  kunde_id: string | null;
  kunde: Kunde | null;
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
        .select('id, kennzeichen, marke, modell, jahrgang, kunde_id, kunden(id, name, adresse, telefon, email)')
        .ilike('kennzeichen', `%${query}%`)
        .limit(10);
      const mapped: Fahrzeug[] = (data || []).map((d: any) => ({
        id: d.id,
        kennzeichen: d.kennzeichen,
        marke: d.marke,
        modell: d.modell,
        jahrgang: d.jahrgang,
        kunde_id: d.kunde_id,
        kunde: d.kunden || null,
      }));
      setResults(mapped);
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

  const clearHistorie = useCallback(() => {
    setHistorie([]);
  }, []);

  return { results, searching, search, setResults, historie, historieLoading, loadHistorie, clearHistorie };
}
