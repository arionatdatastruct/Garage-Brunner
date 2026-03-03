import { SAFETY_CHECKS } from '@/lib/presets';

interface Props {
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

export function SicherheitsCheckCard({ values, onChange }: Props) {
  const setCheck = (key: string, value: string) => {
    onChange({ ...values, [key]: values[key] === value ? '' : value });
  };

  return (
    <div className="garage-card">
      <div className="garage-card-title">🚦 Sicherheits-Check</div>
      <div className="flex flex-col gap-3">
        {SAFETY_CHECKS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-border">
            <span className="text-sm">{label}</span>
            <div className="flex gap-2">
              {[
                { value: 'gruen', symbol: '✓', activeClass: 'border-[hsl(var(--garage-green))] bg-[hsl(var(--garage-green))] text-white shadow-[0_0_12px_hsl(var(--garage-green)/0.5)]' },
                { value: 'gelb', symbol: '⚠', activeClass: 'border-[hsl(var(--garage-yellow))] bg-[hsl(var(--garage-yellow))] text-black shadow-[0_0_12px_hsl(var(--garage-yellow)/0.5)]' },
                { value: 'rot', symbol: '✗', activeClass: 'border-[hsl(var(--garage-red))] bg-[hsl(var(--garage-red))] text-white shadow-[0_0_12px_hsl(var(--garage-red)/0.5)]' },
              ].map(btn => (
                <button
                  key={btn.value}
                  type="button"
                  onClick={() => setCheck(key, btn.value)}
                  className={`w-11 h-11 rounded-full border-[3px] flex items-center justify-center text-base cursor-pointer transition-all active:scale-95 ${
                    values[key] === btn.value
                      ? btn.activeClass
                      : 'border-border bg-black/30 text-muted-foreground'
                  }`}
                >
                  {btn.symbol}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
