import type { FormData } from './ArbeitsrapportForm';

interface Props {
  form: FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}

export function TermineCard({ form, update }: Props) {
  return (
    <div className="garage-card">
      <div className="garage-card-title">📅 Nächster Service / MFK</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="garage-label">Nächster Service (Datum)</label>
          <input
            type="date"
            className="garage-input"
            value={form.naechsterServiceDatum}
            onChange={(e) => update('naechsterServiceDatum', e.target.value)}
          />
        </div>
        <div>
          <label className="garage-label">Nächster Service (KM)</label>
          <input
            className="garage-input"
            value={form.naechsterServiceKm}
            onChange={(e) => update('naechsterServiceKm', e.target.value)}
            placeholder="z.B. 60000"
            inputMode="numeric"
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="garage-label">MFK fällig am</label>
        <input
          type="date"
          className="garage-input"
          value={form.mfkDatum}
          onChange={(e) => update('mfkDatum', e.target.value)}
        />
      </div>
    </div>
  );
}
