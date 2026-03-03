import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DatumCard } from './DatumCard';
import { FahrzeugKundeCard } from './FahrzeugKundeCard';
import { ArtDerArbeitCard } from './ArtDerArbeitCard';
import { SicherheitsCheckCard } from './SicherheitsCheckCard';
import { ArbeitszeitCard } from './ArbeitszeitCard';
import { TermineCard } from './TermineCard';
import { NotizenCard } from './NotizenCard';
import { PreviewOverlay } from './PreviewOverlay';
import { SuccessMessage } from './SuccessMessage';
import type { Fahrzeug } from '@/hooks/useFahrzeugSuche';
import type { CompressedImage } from '@/lib/image-compress';

export interface FormData {
  datum: string;
  fahrzeug: Fahrzeug | null;
  kennzeichen: string;
  marke: string;
  modell: string;
  jahrgang: string;
  kmStand: string;
  kategorien: string[];
  serviceNotiz: string;
  serviceMaterial: string[];
  motoroelLiter: string;
  schadenBeschreibung: string;
  reparaturMaterial: string[];
  reifenZustand: string;
  reifenMaterial: string[];
  reifenNotiz: string;
  sicherheitscheck: Record<string, string>;
  arbeitszeit: string;
  mechaniker: string;
  naechsterServiceDatum: string;
  naechsterServiceKm: string;
  mfkDatum: string;
  notizen: string;
  fotos: CompressedImage[];
}

const initialForm: FormData = {
  datum: new Date().toISOString().split('T')[0],
  fahrzeug: null,
  kennzeichen: '',
  marke: '',
  modell: '',
  jahrgang: '',
  kmStand: '',
  kategorien: [],
  serviceNotiz: '',
  serviceMaterial: [],
  motoroelLiter: '',
  schadenBeschreibung: '',
  reparaturMaterial: [],
  reifenZustand: '',
  reifenMaterial: [],
  reifenNotiz: '',
  sicherheitscheck: {},
  arbeitszeit: '',
  mechaniker: '',
  naechsterServiceDatum: '',
  naechsterServiceKm: '',
  mfkDatum: '',
  notizen: '',
  fotos: [],
};

export function ArbeitsrapportForm() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const openPreview = () => {
    if (!form.kennzeichen) { setError('Bitte Nummernschild eingeben.'); return; }
    if (form.kategorien.length === 0) { setError('Bitte wähle eine Kategorie aus.'); return; }
    if (!form.arbeitszeit) { setError('Bitte Arbeitszeit eingeben.'); return; }
    setError('');
    setShowPreview(true);
  };

  const getMaterialListe = (): string[] => {
    const all: string[] = [];
    form.serviceMaterial.forEach(m => {
      if (m === 'Motoröl' && form.motoroelLiter) all.push(`Motoröl (${form.motoroelLiter}L)`);
      else all.push(m);
    });
    all.push(...form.reparaturMaterial, ...form.reifenMaterial);
    return all;
  };

  const getBeschreibung = (): string => {
    const parts: string[] = [];
    if (form.serviceNotiz) parts.push(form.serviceNotiz);
    if (form.schadenBeschreibung) parts.push(form.schadenBeschreibung);
    if (form.reifenNotiz) parts.push(form.reifenNotiz);
    return parts.join(' | ');
  };

  const sendData = async () => {
    setSending(true);
    try {
      let fahrzeugId = form.fahrzeug?.id;

      if (!fahrzeugId) {
        const { data: newCar, error: carError } = await supabase
          .from('fahrzeuge')
          .insert({
            kennzeichen: form.kennzeichen.toUpperCase(),
            marke: form.marke || null,
            modell: form.modell || null,
            jahrgang: form.jahrgang || null,
            kunde_name: form.fahrzeug?.kunde_name || null,
            kunde_telefon: form.fahrzeug?.kunde_telefon || null,
            kunde_adresse: form.fahrzeug?.kunde_adresse || null,
            kunde_email: form.fahrzeug?.kunde_email || null,
          })
          .select('id')
          .single();
        if (carError) throw carError;
        fahrzeugId = newCar.id;
      }

      const { error: rapportError } = await supabase
        .from('arbeitsrapporte')
        .insert({
          fahrzeug_id: fahrzeugId,
          datum: form.datum,
          kategorie: form.kategorien.join(','),
          km_stand: form.kmStand ? parseInt(form.kmStand) : null,
          arbeit_beschreibung: getBeschreibung() || null,
          material_liste: getMaterialListe(),
          sicherheitscheck: form.sicherheitscheck,
          arbeitszeit_stunden: form.arbeitszeit ? parseFloat(form.arbeitszeit) : null,
          mechaniker: form.mechaniker || null,
          reifen_zustand: form.reifenZustand || null,
          naechster_service_datum: form.naechsterServiceDatum || null,
          naechster_service_km: form.naechsterServiceKm ? parseInt(form.naechsterServiceKm) : null,
          mfk_datum: form.mfkDatum || null,
          notizen: form.notizen || null,
          fotos: form.fotos.map(f => f.dataUrl),
          ampel_status: Object.values(form.sicherheitscheck).includes('rot') ? 'rot' :
            Object.values(form.sicherheitscheck).includes('gelb') ? 'gelb' : 'gruen',
        });

      if (rapportError) throw rapportError;

      setShowPreview(false);
      setShowSuccess(true);
      toast.success('Rapport gespeichert!');
    } catch (err: any) {
      toast.error('Fehler beim Speichern: ' + (err.message || 'Unbekannt'));
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setShowSuccess(false);
    setError('');
  };

  if (showSuccess) return <SuccessMessage onReset={resetForm} />;

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/20 border border-destructive/50 text-destructive text-sm">
          {error}
        </div>
      )}

      <DatumCard datum={form.datum} />

      <FahrzeugKundeCard form={form} update={update} />

      <ArtDerArbeitCard form={form} update={update} />

      <SicherheitsCheckCard
        values={form.sicherheitscheck}
        onChange={(v) => update('sicherheitscheck', v)}
      />

      <ArbeitszeitCard form={form} update={update} />

      <TermineCard form={form} update={update} />

      <NotizenCard value={form.notizen} onChange={(v) => update('notizen', v)} />

      <button
        type="button"
        onClick={openPreview}
        className="w-full p-4 text-base font-semibold border-none rounded-xl bg-gradient-to-r from-primary to-blue-500 text-primary-foreground cursor-pointer sticky bottom-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
      >
        👁️ Vorschau & PDF erstellen
      </button>

      {showPreview && (
        <PreviewOverlay
          form={form}
          materialListe={getMaterialListe()}
          beschreibung={getBeschreibung()}
          onClose={() => setShowPreview(false)}
          onSend={sendData}
          sending={sending}
        />
      )}
    </>
  );
}
