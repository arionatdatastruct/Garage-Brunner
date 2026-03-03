interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function NotizenCard({ value, onChange }: Props) {
  return (
    <div className="garage-card">
      <div className="garage-card-title">Interne Notizen</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Bemerkungen..."
        className="garage-input min-h-[100px] resize-y"
      />
    </div>
  );
}
