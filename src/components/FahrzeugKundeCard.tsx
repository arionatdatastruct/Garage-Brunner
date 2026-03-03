import { useState } from 'react';
import { useFahrzeugSuche, type Fahrzeug } from '@/hooks/useFahrzeugSuche';
import type { FormData } from './ArbeitsrapportForm';

interface Props {
  form: FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}

export function FahrzeugKundeCard({ form, update }: Props) {
  const { results, searching, search, setResults, historie, historieLoading, loadHistorie } = useFahrzeugSuche();
  const [showResults, setShowResults] = useState(false);
  const [historieCollapsed, setHistorieCollapsed] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);

  const handleSearch = (val: string) => {
    update('kennzeichen', val);
    search(val.toUpperCase().trim());
    setShowResults(true);
  };

  const selectFahrzeug = (f: Fahrzeug) => {
    update('fahrzeug', f);
    update('kennzeichen', f.kennzeichen);
    update('marke', f.marke || '');
    update('modell', f.modell || '');
    update('jahrgang', f.jahrgang || '');
    setShowResults(false);
    setResults([]);
    setCustomerFound(true);
    loadHistorie(f.id);
  };

  return (
    <div className="garage-card">
      <div className="garage-card-title">Fahrzeug & Kunde</div>

      <div className="mb-4 relative">
        <label className="garage-label">Nummernschild</label>
        <input
          type="text"
          value={form.kennzeichen}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="z.B. AG538963"
          autoComplete="off"
          className="garage-input"
        />
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-secondary border-2 border-primary border-t-0 rounded-b-xl max-h-[200px] overflow-y-auto z-[100]">
            {searching && <div className="p-3 text-muted-foreground text-sm">Suche...</div>}
            {results.map((r) => (
              <div
                key={r.id}
                onClick={() => selectFahrzeug(r)}
                className="p-3 cursor-pointer border-b border-border hover:bg-primary/20 transition-colors"
              >
                <div className="font-semibold text-primary">{r.kennzeichen}</div>
                <div className="text-xs text-muted-foreground">{r.kunde_name || 'Unbekannt'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {customerFound && form.fahrzeug && (
        <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 mb-3 animate-in fade-in">
          <h4 className="text-sm font-semibold text-primary mb-1">✓ Kunde gefunden</h4>
          <p className="text-sm text-foreground">
            <strong>{form.fahrzeug.kunde_name}</strong><br />
            {form.fahrzeug.kunde_adresse && <>{form.fahrzeug.kunde_adresse}<br /></>}
            {form.fahrzeug.kunde_telefon && <>📞 {form.fahrzeug.kunde_telefon}<br /></>}
            {form.fahrzeug.kunde_email && <>✉️ {form.fahrzeug.kunde_email}</>}
          </p>
        </div>
      )}

      {historie.length > 0 && (
        <div className="rounded-xl bg-[hsl(var(--garage-amber))]/10 border border-[hsl(var(--garage-amber))]/30 mb-3 overflow-hidden animate-in fade-in">
          <div
            onClick={() => setHistorieCollapsed(!historieCollapsed)}
            className="flex justify-between items-center p-3 bg-[hsl(var(--garage-amber))]/15 font-semibold text-sm text-[hsl(var(--garage-amber))] cursor-pointer"
          >
            <span>📋 Letzte Arbeiten</span>
            <span className={`transition-transform ${historieCollapsed ? '-rotate-90' : ''}`}>▼</span>
          </div>
          {!historieCollapsed && (
            <div className="p-3 flex flex-col gap-2.5">
              {historieLoading ? (
                <div className="text-muted-foreground text-xs">Lade Historie...</div>
              ) : (
                historie.map((h) => {
                  const kategorien = (h.kategorie || '').split(',');
                  return (
                    <div key={h.id} className="bg-black/20 rounded-lg p-2.5 border-l-[3px] border-[hsl(var(--garage-amber))]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-xs">{new Date(h.datum).toLocaleDateString('de-CH')}</span>
                        <span className="text-xs text-muted-foreground">{h.km_stand || '?'} km</span>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {kategorien.filter(Boolean).map((k) => (
                          <span key={k} className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                            k.trim() === 'service' ? 'bg-primary/30 text-primary' :
                            k.trim() === 'reparatur' ? 'bg-destructive/30 text-destructive' :
                            'bg-[hsl(var(--garage-green))]/30 text-[hsl(var(--garage-green))]'
                          }`}>
                            {k.trim()}
                          </span>
                        ))}
                      </div>
                      {h.material_liste && Array.isArray(h.material_liste) && h.material_liste.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {(h.material_liste as string[]).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <label className="garage-label">Marke</label>
          <input className="garage-input" value={form.marke} onChange={(e) => update('marke', e.target.value)} placeholder="BMW" />
        </div>
        <div>
          <label className="garage-label">Modell</label>
          <input className="garage-input" value={form.modell} onChange={(e) => update('modell', e.target.value)} placeholder="M4 F82" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label className="garage-label">Jahrgang</label>
          <input className="garage-input" value={form.jahrgang} onChange={(e) => update('jahrgang', e.target.value)} placeholder="2020" inputMode="numeric" />
        </div>
        <div>
          <label className="garage-label">KM-Stand</label>
          <input className="garage-input" value={form.kmStand} onChange={(e) => update('kmStand', e.target.value)} placeholder="45000" inputMode="numeric" />
        </div>
      </div>
    </div>
  );
}
