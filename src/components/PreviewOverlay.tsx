import { SAFETY_CHECKS } from '@/lib/presets';
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
  const formatted = new Date(form.datum).toLocaleDateString('de-CH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const hasServiceContent = form.kategorien.includes('service') && (form.serviceNotiz || form.serviceMaterial.length > 0);
  const hasReparaturContent = form.kategorien.includes('reparatur') && (form.schadenBeschreibung || form.reparaturMaterial.length > 0);
  const hasReifenContent = form.kategorien.includes('reifen');
  const hasSafety = Object.values(form.sicherheitscheck).some(Boolean);

  const serviceTermine: string[] = [];
  if (form.naechsterServiceDatum) serviceTermine.push(`Nächster Service: ${new Date(form.naechsterServiceDatum).toLocaleDateString('de-CH')}`);
  if (form.naechsterServiceKm) serviceTermine.push(`Service bei: ${form.naechsterServiceKm} km`);
  if (form.mfkDatum) serviceTermine.push(`MFK fällig: ${new Date(form.mfkDatum).toLocaleDateString('de-CH')}`);

  return (
    <div className="preview-overlay fixed inset-0 bg-black/95 z-[1000] flex justify-center overflow-y-auto p-5">
      {/* A4 Paper */}
      <div className="a4-paper bg-white text-black w-[210mm] min-h-[297mm] p-[20mm] shadow-[0_0_20px_rgba(0,0,0,0.5)] font-[Helvetica,Arial,sans-serif] relative mx-auto rounded-sm max-w-full">

        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-5 mb-8 flex justify-between">
          <div>
            <h1 className="text-2xl font-bold m-0">Arbeitsrapport</h1>
            <p className="mt-1 text-gray-500">{formatted}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-gray-700">{form.fahrzeug?.id ? form.kennzeichen : 'Neuer Kunde'}</h2>
          </div>
        </div>

        {/* Kunde & Fahrzeug */}
        <PreviewSection label="Kunde & Fahrzeug">
          <strong>{form.fahrzeug?.kunde_name || 'Unbekannt'}</strong><br />
          {form.marke} {form.modell} ({form.kennzeichen})<br />
          KM: {form.kmStand}
        </PreviewSection>

        {/* Arbeitszeit */}
        <PreviewSection label="Arbeitszeit">
          {form.arbeitszeit} Stunden
          {form.mechaniker && <> · Mechaniker: <strong>{form.mechaniker}</strong></>}
        </PreviewSection>

        {/* Service */}
        {hasServiceContent && (
          <PreviewSection label="Service Arbeiten">
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
          <PreviewSection label="Reparatur / Schaden">
            <div>{form.schadenBeschreibung || '(Nur Material)'}</div>
            {form.reparaturMaterial.length > 0 && <PreviewMaterial items={form.reparaturMaterial} />}
          </PreviewSection>
        )}

        {/* Fotos */}
        {form.fotos.length > 0 && (
          <PreviewSection label="Fotos">
            <div className="flex flex-wrap gap-2.5 mt-2">
              {form.fotos.map((f, i) => (
                <img key={i} src={f.dataUrl} className="w-[140px] h-[140px] object-cover rounded border border-gray-300" />
              ))}
            </div>
          </PreviewSection>
        )}

        {/* Reifen */}
        {hasReifenContent && (
          <PreviewSection label="Reifen">
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
            <div className="preview-termine-box font-semibold bg-yellow-100 border border-yellow-400 rounded-md p-3">
              {serviceTermine.map((t, i) => <div key={i}>{t}</div>)}
            </div>
          </PreviewSection>
        )}

        {/* Notizen */}
        <PreviewSection label="Interne Notizen">
          {form.notizen || '-'}
        </PreviewSection>
      </div>

      {/* Action Bar */}
      <div className="preview-actions-bar fixed bottom-5 left-1/2 -translate-x-1/2 flex gap-4 bg-secondary p-4 rounded-xl shadow-[0_5px_20px_rgba(0,0,0,0.5)] z-[1001]">
        <button onClick={onClose} className="border-none px-6 py-3 rounded-lg cursor-pointer font-semibold text-sm text-white bg-muted-foreground/50 flex items-center gap-2">
          ← Zurück
        </button>
        <button onClick={() => window.print()} className="border-none px-6 py-3 rounded-lg cursor-pointer font-semibold text-sm text-white bg-blue-500 flex items-center gap-2">
          🖨️ PDF / Drucken
        </button>
        <button
          onClick={onSend}
          disabled={sending}
          className="border-none px-6 py-3 rounded-lg cursor-pointer font-semibold text-sm text-white bg-green-500 flex items-center gap-2 disabled:opacity-50"
        >
          {sending ? (
            <><span className="inline-block w-4 h-4 border-2 border-white/30 rounded-full border-t-white animate-spin" /> Sende...</>
          ) : (
            '✓ Daten an Büro senden'
          )}
        </button>
      </div>
    </div>
  );
}

function PreviewSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="preview-section mb-6" style={{ pageBreakInside: 'avoid' }}>
      <div className="font-bold text-xs text-gray-500 uppercase mb-1">{label}</div>
      <div className="text-base leading-relaxed border-b border-gray-100 pb-1">{children}</div>
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
