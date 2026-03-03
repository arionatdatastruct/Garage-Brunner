import { useState, useCallback } from 'react';
import type { FormData } from './ArbeitsrapportForm';
import { PRESETS, SERVICE_MATERIALS, REPARATUR_MATERIALS, REIFEN_MATERIALS, type PresetName } from '@/lib/presets';
import { compressImage, type CompressedImage } from '@/lib/image-compress';

interface Props {
  form: FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}

export function ArtDerArbeitCard({ form, update }: Props) {
  const [presetApplied, setPresetApplied] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    const cats = form.kategorien.includes(cat)
      ? form.kategorien.filter(c => c !== cat)
      : [...form.kategorien, cat];
    update('kategorien', cats);
  };

  const applyPreset = (name: PresetName) => {
    const preset = PRESETS[name];
    if (!form.kategorien.includes('service')) {
      update('kategorien', [...form.kategorien, 'service']);
    }
    update('serviceMaterial', [...preset.material]);
    if (!form.serviceNotiz) update('serviceNotiz', preset.beschreibung);
    if (!form.arbeitszeit) update('arbeitszeit', preset.arbeitszeit);
    setPresetApplied(name);
    setTimeout(() => setPresetApplied(null), 800);
  };

  const toggleMaterial = (list: string[], setKey: keyof FormData, value: string) => {
    const arr = list as string[];
    const next = arr.includes(value) ? arr.filter(m => m !== value) : [...arr, value];
    update(setKey, next as any);
  };

  const handlePhotos = async (files: FileList | null) => {
    if (!files) return;
    const compressed: CompressedImage[] = [];
    for (const file of Array.from(files)) {
      try { compressed.push(await compressImage(file)); } catch {}
    }
    update('fotos', [...form.fotos, ...compressed]);
  };

  const categories = [
    { key: 'service', icon: '🛠️', label: 'Service' },
    { key: 'reparatur', icon: '🔩', label: 'Reparatur' },
    { key: 'reifen', icon: '🛞', label: 'Reifen' },
  ];

  return (
    <div className="garage-card">
      <div className="garage-card-title">Art der Arbeit</div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(c => (
          <button
            key={c.key}
            type="button"
            onClick={() => toggleCategory(c.key)}
            className={`flex-1 min-w-[calc(33%-6px)] p-4 border-2 rounded-xl text-center text-sm font-medium cursor-pointer transition-all ${
              form.kategorien.includes(c.key)
                ? 'border-primary bg-primary/20 text-foreground'
                : 'border-border bg-black/20 text-muted-foreground'
            }`}
          >
            <span className="text-2xl block mb-1">{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* SERVICE SECTION */}
      {form.kategorien.includes('service') && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
          <div className="mb-4">
            <label className="garage-label">Schnellauswahl</label>
            <div className="flex gap-2.5 flex-wrap">
              {([['oelwechsel', '🛢️ Ölwechsel'], ['kleinerService', '🔧 Kleiner Service'], ['grosserService', '⚙️ Grosser Service']] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`flex-1 min-w-[100px] p-3.5 border-2 rounded-3xl text-sm font-medium cursor-pointer transition-all min-h-[48px] ${
                    presetApplied === key
                      ? 'border-[hsl(var(--garage-green))] bg-[hsl(var(--garage-green))]/25 text-[hsl(var(--garage-green))]'
                      : 'border-border bg-black/20 text-muted-foreground hover:border-primary hover:bg-primary/15 hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="garage-label">Service-Beschreibung</label>
            <textarea
              value={form.serviceNotiz}
              onChange={(e) => update('serviceNotiz', e.target.value)}
              placeholder="Was wurde gemacht?"
              className="garage-input min-h-[100px] resize-y"
            />
          </div>
          <div>
            <label className="garage-label">Verwendetes Material</label>
            <MaterialBadges
              materials={SERVICE_MATERIALS}
              selected={form.serviceMaterial}
              onToggle={(v) => toggleMaterial(form.serviceMaterial, 'serviceMaterial', v)}
              motoroelLiter={form.motoroelLiter}
              onMotoroelChange={(v) => update('motoroelLiter', v)}
            />
          </div>
        </div>
      )}

      {/* REPARATUR SECTION */}
      {form.kategorien.includes('reparatur') && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
          <div className="mb-4">
            <label className="garage-label">Schadensbeschreibung</label>
            <textarea
              value={form.schadenBeschreibung}
              onChange={(e) => update('schadenBeschreibung', e.target.value)}
              placeholder="Beschreibung..."
              className="garage-input min-h-[100px] resize-y"
            />
          </div>
          <div className="mb-4">
            <label className="garage-label">Verwendetes Material</label>
            <MaterialBadges
              materials={REPARATUR_MATERIALS}
              selected={form.reparaturMaterial}
              onToggle={(v) => toggleMaterial(form.reparaturMaterial, 'reparaturMaterial', v)}
            />
          </div>
          <div>
            <label className="garage-label">Fotos (werden auf PDF gedruckt)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handlePhotos(e.target.files)}
              className="garage-input p-3"
            />
            {form.fotos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.fotos.map((f, i) => (
                  <img key={i} src={f.dataUrl} className="w-20 h-20 object-cover rounded border border-border" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REIFEN SECTION */}
      {form.kategorien.includes('reifen') && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
          <div className="mb-4">
            <label className="garage-label">Reifenzustand</label>
            <div className="flex gap-2">
              {[
                { value: 'gut', label: '✓ Gut', color: 'garage-green' },
                { value: 'mittel', label: '⚠ Mittel', color: 'garage-yellow' },
                { value: 'schlecht', label: '✗ Schlecht', color: 'garage-red' },
              ].map(t => (
                <label
                  key={t.value}
                  className={`flex-1 text-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                    form.reifenZustand === t.value
                      ? `border-[hsl(var(--${t.color}))] bg-[hsl(var(--${t.color}))]/20`
                      : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="reifenZustand"
                    value={t.value}
                    checked={form.reifenZustand === t.value}
                    onChange={() => update('reifenZustand', t.value)}
                    className="hidden"
                  />
                  <span className="text-sm">{t.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="garage-label">Verwendetes Material</label>
            <MaterialBadges
              materials={REIFEN_MATERIALS}
              selected={form.reifenMaterial}
              onToggle={(v) => toggleMaterial(form.reifenMaterial, 'reifenMaterial', v)}
            />
          </div>
          <div>
            <label className="garage-label">Reifen-Notiz</label>
            <textarea
              value={form.reifenNotiz}
              onChange={(e) => update('reifenNotiz', e.target.value)}
              placeholder="z.B. Wechsel So/Wi"
              className="garage-input min-h-[100px] resize-y"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MaterialBadges({
  materials, selected, onToggle, motoroelLiter, onMotoroelChange,
}: {
  materials: string[];
  selected: string[];
  onToggle: (v: string) => void;
  motoroelLiter?: string;
  onMotoroelChange?: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {materials.map(m => (
        <label
          key={m}
          className={`inline-flex items-center gap-1.5 px-4 py-3.5 border-2 rounded-3xl text-sm font-medium cursor-pointer transition-all min-h-[48px] ${
            selected.includes(m)
              ? 'border-[hsl(var(--garage-green))] bg-[hsl(var(--garage-green))]/25 text-foreground'
              : 'border-border bg-black/20 text-muted-foreground hover:border-muted-foreground/30'
          }`}
        >
          <input type="checkbox" checked={selected.includes(m)} onChange={() => onToggle(m)} className="hidden" />
          <span>{selected.includes(m) ? '✓ ' : ''}{m}</span>
          {m === 'Motoröl' && onMotoroelChange && (
            <input
              type="text"
              value={motoroelLiter || ''}
              onChange={(e) => onMotoroelChange(e.target.value)}
              placeholder="L"
              inputMode="decimal"
              className="w-[55px] px-2 py-1.5 text-sm rounded-lg border-2 border-border bg-black/20 text-foreground text-center"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </label>
      ))}
    </div>
  );
}
