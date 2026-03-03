import { useState, useEffect } from 'react';
import { SAFETY_CHECKS } from '@/lib/presets';
import { supabase } from '@/integrations/supabase/client';
import type { FormData } from './ArbeitsrapportForm';

interface Props {
  form: FormData;
  materialListe: string[];
  beschreibung: string;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
}

export function PreviewOverlay({ form, materialListe, beschreibung, onClose, onSend, sending }: Props) {
  const [rapportCount, setRapportCount] = useState<number | null>(null);

  useEffect(() => {
    // Get current count for preview number
    supabase.from('arbeitsrapporte').select('id', { count: 'exact', head: true })
      .then(({ count }) => setRapportCount((count || 0) + 1));
  }, []);

  const formatted = new Date(form.datum).toLocaleDateString('de-CH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const nextRapportNr = rapportCount !== null ? `RAP-${String(rapportCount).padStart(4, '0')}` : '...';

  const hasServiceContent = form.kategorien.includes('service') && (form.serviceNotiz || form.serviceMaterial.length > 0);
  const hasReparaturContent = form.kategorien.includes('reparatur') && (form.schadenBeschreibung || form.reparaturMaterial.length > 0);
  const hasReifenContent = form.kategorien.includes('reifen');
  const hasSafety = Object.values(form.sicherheitscheck).some(Boolean);

  const serviceTermine: string[] = [];
  if (form.naechsterServiceDatum) serviceTermine.push(`Nächster Service: ${new Date(form.naechsterServiceDatum).toLocaleDateString('de-CH')}`);
  if (form.naechsterServiceKm) serviceTermine.push(`Service bei: ${form.naechsterServiceKm} km`);
  if (form.mfkDatum) serviceTermine.push(`MFK fällig: ${new Date(form.mfkDatum).toLocaleDateString('de-CH')}`);

  return (
    <div className="preview-overlay fixed inset-0 bg-black/95 z-[1000] flex justify-center overflow-y-auto p-3 sm:p-5 pb-28">
      {/* A4 Paper */}
      <div className="a4-paper bg-white text-black w-full sm:w-[210mm] sm:min-h-[297mm] p-4 sm:p-[20mm] shadow-[0_0_20px_rgba(0,0,0,0.5)] font-[Helvetica,Arial,sans-serif] relative mx-auto rounded-sm max-w-full h-fit">

        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold m-0">Arbeitsrapport</h1>
            <p className="mt-1 text-gray-500 text-sm">{formatted}</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono text-gray-400 mb-1">{nextRapportNr}</div>
            <h2 className="text-base sm:text-lg font-bold text-gray-700">{form.kennzeichen || '—'}</h2>
          </div>
        </div>

        {/* Kunde & Fahrzeug */}
        <PreviewSection label="Kunde & Fahrzeug">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            <div>
              <strong>{form.fahrzeug?.kunde_name || 'Unbekannt'}</strong>
              {form.fahrzeug?.kunde_adresse && <><br /><span className="text-gray-600 text-sm">{form.fahrzeug.kunde_adresse}</span></>}
              {form.fahrzeug?.kunde_telefon && <><br /><span className="text-gray-600 text-sm">📞 {form.fahrzeug.kunde_telefon}</span></>}
              {form.fahrzeug?.kunde_email && <><br /><span className="text-gray-600 text-sm">✉️ {form.fahrzeug.kunde_email}</span></>}
            </div>
            <div className="text-sm text-gray-600">
              {form.marke} {form.modell} {form.jahrgang && `(${form.jahrgang})`}<br />
              Kennzeichen: <strong>{form.kennzeichen}</strong><br />
              KM-Stand: <strong>{form.kmStand || '—'}</strong>
            </div>
          </div>
        </PreviewSection>

        {/* Arbeitszeit */}
        <PreviewSection label="Arbeitszeit">
          <span className="text-lg font-semibold">{form.arbeitszeit} Stunden</span>
          {form.mechaniker && <> · Mechaniker: <strong>{form.mechaniker}</strong></>}
        </PreviewSection>

        {/* Service */}
        {hasServiceContent && (
          <PreviewSection label="🛠️ Service Arbeiten">
            <div>{form.serviceNotiz || '(Nur Material)'}</div>
            {form.serviceMaterial.length > 0 && (
              <PreviewMaterial items={form.serviceMaterial.map(m =>
                m === 'Motoröl' && form.motoroelLiter ? `Motoröl (${form.motoroelLiter}L)` : m
              )} />
            )}
          </PreviewSection>
        )}

        {/* Reparatur */}
        {hasReparaturContent && (
          <PreviewSection label="🔩 Reparatur / Schaden">
            <div>{form.schadenBeschreibung || '(Nur Material)'}</div>
            {form.reparaturMaterial.length > 0 && <PreviewMaterial items={form.reparaturMaterial} />}
          </PreviewSection>
        )}

        {/* Fotos */}
        {form.fotos.length > 0 && (
          <PreviewSection label="📷 Fotos">
            <div className="flex flex-wrap gap-2 mt-2">
              {form.fotos.map((f, i) => (
                <img key={i} src={f.dataUrl} className="w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] object-cover rounded border border-gray-300" />
              ))}
            </div>
          </PreviewSection>
        )}

        {/* Reifen */}
        {hasReifenContent && (
          <PreviewSection label="🛞 Reifen">
            Zustand: {form.reifenZustand === 'gut' ? '✓ Gut' : form.reifenZustand === 'mittel' ? '⚠ Mittel' : form.reifenZustand === 'schlecht' ? '✗ Schlecht' : '-'}<br />
            Notiz: {form.reifenNotiz || '-'}
            {form.reifenMaterial.length > 0 && <PreviewMaterial items={form.reifenMaterial} />}
          </PreviewSection>
        )}

        {/* Safety */}
        {hasSafety && (
          <PreviewSection label="🚦 Sicherheits-Check">
            <div className="flex flex-col gap-1.5 mt-2">
              {SAFETY_CHECKS.map(({ key, label }) => {
                const val = form.sicherheitscheck[key] || '';
                return (
                  <div key={key} className="flex items-center gap-2.5 text-sm py-1.5 border-b border-gray-100 last:border-0">
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 preview-safety-dot ${
                      val === 'gruen' ? 'bg-green-500' :
                      val === 'gelb' ? 'bg-yellow-500' :
                      val === 'rot' ? 'bg-red-500' : 'bg-gray-300'
                    }`} />
                    <span className="flex-1">{label}</span>
                    {val === 'rot' && <span className="text-red-500 font-bold text-xs">⚠ ACHTUNG</span>}
                  </div>
                );
              })}
            </div>
          </PreviewSection>
        )}

        {/* Termine */}
        {serviceTermine.length > 0 && (
          <PreviewSection label="📅 Nächste Termine">
            <div className="preview-termine-box font-semibold bg-yellow-100 border border-yellow-400 rounded-md p-3 text-sm">
              {serviceTermine.map((t, i) => <div key={i}>{t}</div>)}
            </div>
          </PreviewSection>
        )}

        {/* Notizen */}
        <PreviewSection label="Interne Notizen">
          {form.notizen || '-'}
        </PreviewSection>
      </div>

      {/* Action Bar - Mobile optimized */}
      <div className="preview-actions-bar fixed bottom-0 left-0 right-0 sm:bottom-5 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto flex gap-2 sm:gap-4 bg-secondary p-3 sm:p-4 sm:rounded-xl shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-[1001]">
        <button onClick={onClose} className="flex-1 sm:flex-none border-none px-3 sm:px-6 py-3 rounded-lg cursor-pointer font-semibold text-xs sm:text-sm text-white bg-muted-foreground/50 flex items-center justify-center gap-1.5">
          ← Zurück
        </button>
        <button onClick={() => window.print()} className="flex-1 sm:flex-none border-none px-3 sm:px-6 py-3 rounded-lg cursor-pointer font-semibold text-xs sm:text-sm text-white bg-blue-500 flex items-center justify-center gap-1.5">
          🖨️ Drucken
        </button>
        <button
          onClick={onSend}
          disabled={sending}
          className="flex-1 sm:flex-none border-none px-3 sm:px-6 py-3 rounded-lg cursor-pointer font-semibold text-xs sm:text-sm text-white bg-green-500 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {sending ? (
            <><span className="inline-block w-4 h-4 border-2 border-white/30 rounded-full border-t-white animate-spin" /> Sende...</>
          ) : (
            '✓ Senden'
          )}
        </button>
      </div>
    </div>
  );
}

function PreviewSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="preview-section mb-5" style={{ pageBreakInside: 'avoid' }}>
      <div className="font-bold text-xs text-gray-500 uppercase mb-1">{label}</div>
      <div className="text-sm sm:text-base leading-relaxed border-b border-gray-100 pb-1">{children}</div>
    </div>
  );
}

function PreviewMaterial({ items }: { items: string[] }) {
  return (
    <div className="mt-2 p-2 px-3 bg-gray-50 rounded-md text-sm text-gray-700">
      <div className="font-semibold text-gray-500 text-[11px] uppercase mb-1">Material:</div>
      {items.join(', ')}
    </div>
  );
}
