import { useState } from 'react';
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
    { key: 'service', icon: '🛠️', label: 'Service', color: 'primary', desc: 'Wartung & Pflege' },
    { key: 'reparatur', icon: '🔩', label: 'Reparatur', color: 'destructive', desc: 'Schäden & Defekte' },
    { key: 'reifen', icon: '🛞', label: 'Reifen', color: 'garage-green', desc: 'Wechsel & Kontrolle' },
  ];

  return (
    <div className="garage-card">
      <div className="garage-card-title">Art der Arbeit</div>

      {/* Category Toggle Buttons */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(c => (
          <button
            key={c.key}
            type="button"
            onClick={() => toggleCategory(c.key)}
            className={`flex-1 min-w-[calc(33%-6px)] p-3 border-2 rounded-xl text-center cursor-pointer transition-all ${
              form.kategorien.includes(c.key)
                ? c.key === 'service' ? 'border-primary bg-primary/20 text-foreground'
                  : c.key === 'reparatur' ? 'border-destructive bg-destructive/20 text-foreground'
                  : 'border-[hsl(var(--garage-green))] bg-[hsl(var(--garage-green))]/20 text-foreground'
                : 'border-border bg-black/20 text-muted-foreground'
            }`}
          >
            <span className="text-2xl block mb-0.5">{c.icon}</span>
            <span className="text-sm font-medium block">{c.label}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">{c.desc}</span>
          </button>
        ))}
      </div>

      {/* SERVICE SECTION */}
      {form.kategorien.includes('service') && (
        <SectionWrapper icon="🛠️" title="Service" borderColor="border-primary" bgColor="bg-primary/5">
          <div className="mb-4">
            <label className="garage-label">Schnellauswahl</label>
            <div className="flex gap-2 flex-wrap">
              {([['oelwechsel', '🛢️ Ölwechsel'], ['kleinerService', '🔧 Kl. Service'], ['grosserService', '⚙️ Gr. Service']] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`flex-1 min-w-[90px] p-3 border-2 rounded-2xl text-xs font-medium cursor-pointer transition-all min-h-[44px] ${
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
              className="garage-input min-h-[80px] resize-y"
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
        </SectionWrapper>
      )}

      {/* REPARATUR SECTION */}
      {form.kategorien.includes('reparatur') && (
        <SectionWrapper icon="🔩" title="Reparatur" borderColor="border-destructive" bgColor="bg-destructive/5">
          <div className="mb-4">
            <label className="garage-label">Schadensbeschreibung</label>
            <textarea
              value={form.schadenBeschreibung}
              onChange={(e) => update('schadenBeschreibung', e.target.value)}
              placeholder="Beschreibung des Schadens..."
              className="garage-input min-h-[80px] resize-y"
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
                  <div key={i} className="relative">
                    <img src={f.dataUrl} className="w-20 h-20 object-cover rounded-lg border border-border" />
                    <button
                      type="button"
                      onClick={() => update('fotos', form.fotos.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionWrapper>
      )}

      {/* REIFEN SECTION */}
      {form.kategorien.includes('reifen') && (
        <SectionWrapper icon="🛞" title="Reifen" borderColor="border-[hsl(var(--garage-green))]" bgColor="bg-[hsl(var(--garage-green))]/5">
          <div className="mb-4">
            <label className="garage-label">Reifenzustand</label>
            <div className="flex gap-2">
              {[
                { value: 'gut', label: '✓ Gut', activeClass: 'border-[hsl(var(--garage-green))] bg-[hsl(var(--garage-green))]/20' },
                { value: 'mittel', label: '⚠ Mittel', activeClass: 'border-[hsl(var(--garage-yellow))] bg-[hsl(var(--garage-yellow))]/20' },
                { value: 'schlecht', label: '✗ Schlecht', activeClass: 'border-destructive bg-destructive/20' },
              ].map(t => (
                <label
                  key={t.value}
                  className={`flex-1 text-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                    form.reifenZustand === t.value ? t.activeClass : 'border-border'
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
              className="garage-input min-h-[80px] resize-y"
            />
          </div>
        </SectionWrapper>
      )}
    </div>
  );
}

/* Wrapper for each category section with colored border + header */
function SectionWrapper({
  icon, title, borderColor, bgColor, children,
}: {
  icon: string; title: string; borderColor: string; bgColor: string; children: React.ReactNode;
}) {
  return (
    <div className={`mt-4 rounded-xl border-2 ${borderColor} ${bgColor} p-4 animate-in fade-in slide-in-from-top-2`}>
      <div className={`flex items-center gap-2 mb-4 pb-2 border-b ${borderColor}/30`}>
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
      </div>
      {children}
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
    <div className="flex flex-wrap gap-2">
      {materials.map(m => (
        <label
          key={m}
          className={`inline-flex items-center gap-1.5 px-3.5 py-3 border-2 rounded-2xl text-sm font-medium cursor-pointer transition-all min-h-[44px] ${
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
              className="w-[50px] px-2 py-1 text-sm rounded-lg border-2 border-border bg-black/20 text-foreground text-center"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </label>
      ))}
    </div>
  );
}
