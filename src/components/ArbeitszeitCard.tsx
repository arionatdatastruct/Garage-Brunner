import type { FormData } from './ArbeitsrapportForm';

interface Props {
  form: FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}

export function ArbeitszeitCard({ form, update }: Props) {
  return (
    <div className="garage-card">
      <div className="garage-card-title">Arbeitszeit & Mechaniker</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="garage-label">Stunden</label>
          <input
            className="garage-input"
            value={form.arbeitszeit}
            onChange={(e) => update('arbeitszeit', e.target.value)}
            placeholder="1.5"
            inputMode="decimal"
          />
        </div>
        <div>
          <label className="garage-label">Mechaniker (Kürzel)</label>
          <input
            className="garage-input"
            value={form.mechaniker}
            onChange={(e) => update('mechaniker', e.target.value)}
            placeholder="z.B. MS"
            maxLength={10}
          />
        </div>
      </div>
    </div>
  );
}
