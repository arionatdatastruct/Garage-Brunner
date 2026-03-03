import { useState } from 'react';
import { useFahrzeugSuche, type Fahrzeug } from '@/hooks/useFahrzeugSuche';
import { NeuerKundeDialog } from './NeuerKundeDialog';
import type { FormData } from './ArbeitsrapportForm';

interface Props {
  form: FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}

export function FahrzeugKundeCard({ form, update }: Props) {
  const { results, searching, search, setResults, historie, historieLoading, loadHistorie, clearHistorie } = useFahrzeugSuche();
  const [showResults, setShowResults] = useState(false);
  const [historieCollapsed, setHistorieCollapsed] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [showNeuerKunde, setShowNeuerKunde] = useState(false);

  const handleSearch = (val: string) => {
    update('kennzeichen', val);
    search(val.toUpperCase().trim());
    setShowResults(true);

    // Reset previous selection when user types again
    if (customerFound) {
      setCustomerFound(false);
      update('fahrzeug', null);
      update('marke', '');
      update('modell', '');
      update('jahrgang', '');
      clearHistorie();
    }
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

  const handleNeuerKunde = (kunde: { name: string; adresse: string; telefon: string; email: string }) => {
    const newFahrzeug: Fahrzeug = {
      id: '',
      kennzeichen: form.kennzeichen,
      marke: form.marke || null,
      modell: form.modell || null,
      jahrgang: form.jahrgang || null,
      kunde_name: kunde.name || null,
      kunde_telefon: kunde.telefon || null,
      kunde_adresse: kunde.adresse || null,
      kunde_email: kunde.email || null,
    };
    update('fahrzeug', newFahrzeug);
    setCustomerFound(true);
    setShowNeuerKunde(false);
    setShowResults(false);
    clearHistorie();
  };

  return (
    <div className="garage-card">
      <div className="garage-card-title">Fahrzeug & Kunde</div>

      {/* Nummernschild Search */}
      <div className="mb-4 relative">
        <label className="garage-label">Nummernschild</label>
        <input
          type="text"
          value={form.kennzeichen}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="z.B. AG538963"
          autoComplete="off"
          className="garage-input uppercase"
        />
        {showResults && (results.length > 0 || (form.kennzeichen.length >= 2 && !searching)) && (
          <div className="absolute top-full left-0 right-0 bg-secondary border-2 border-primary border-t-0 rounded-b-xl max-h-[250px] overflow-y-auto z-[100]">
            {searching && <div className="p-3 text-muted-foreground text-sm">Suche...</div>}
            {results.map((r) => (
              <div
                key={r.id}
                onClick={() => selectFahrzeug(r)}
                className="p-3 cursor-pointer border-b border-border hover:bg-primary/20 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-primary">{r.kennzeichen}</div>
                    <div className="text-xs text-muted-foreground">{r.kunde_name || 'Unbekannt'}</div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {r.marke && <span>{r.marke} {r.modell}</span>}
                  </div>
                </div>
              </div>
            ))}
            {!searching && results.length === 0 && form.kennzeichen.length >= 2 && (
              <div className="p-3 text-muted-foreground text-sm">Kein Fahrzeug gefunden.</div>
            )}
            {!searching && form.kennzeichen.length >= 2 && (
              <div
                onClick={() => { setShowNeuerKunde(true); setShowResults(false); }}
                className="p-3 cursor-pointer border-t border-border hover:bg-[hsl(var(--garage-green))]/20 transition-colors flex items-center gap-2"
              >
                <span className="text-[hsl(var(--garage-green))] font-semibold text-sm">+ Neuen Kunden anlegen</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer Info Card - shown after selection */}
      {customerFound && form.fahrzeug && (
        <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 mb-3 animate-in fade-in">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-primary mb-2">
                {form.fahrzeug.id ? '✓ Kunde gefunden' : '✓ Neuer Kunde'}
              </h4>
              <div className="grid grid-cols-1 gap-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-5">👤</span>
                  <strong>{form.fahrzeug.kunde_name || 'Unbekannt'}</strong>
                </div>
                {form.fahrzeug.kunde_adresse && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-5">📍</span>
                    <span>{form.fahrzeug.kunde_adresse}</span>
                  </div>
                )}
                {form.fahrzeug.kunde_telefon && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-5">📞</span>
                    <span>{form.fahrzeug.kunde_telefon}</span>
                  </div>
                )}
                {form.fahrzeug.kunde_email && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-5">✉️</span>
                    <span>{form.fahrzeug.kunde_email}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setCustomerFound(false);
                update('fahrzeug', null);
                update('marke', '');
                update('modell', '');
                update('jahrgang', '');
                clearHistorie();
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Historie */}
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

      {/* "Neuer Kunde" standalone button */}
      {!customerFound && !showResults && form.kennzeichen.length >= 2 && (
        <button
          type="button"
          onClick={() => setShowNeuerKunde(true)}
          className="w-full mb-3 p-3 rounded-xl border-2 border-dashed border-[hsl(var(--garage-green))]/40 bg-[hsl(var(--garage-green))]/5 text-[hsl(var(--garage-green))] text-sm font-medium cursor-pointer hover:bg-[hsl(var(--garage-green))]/10 transition-colors"
        >
          + Neuen Kunden anlegen
        </button>
      )}

      {/* Vehicle details - auto-filled from selection */}
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

      <NeuerKundeDialog
        open={showNeuerKunde}
        onClose={() => setShowNeuerKunde(false)}
        onSave={handleNeuerKunde}
        kennzeichen={form.kennzeichen}
      />
    </div>
  );
}
