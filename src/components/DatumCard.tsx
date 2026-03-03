interface Props { datum: string }

export function DatumCard({ datum }: Props) {
  const formatted = new Date(datum).toLocaleDateString('de-CH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="garage-card">
      <div className="garage-card-title">Datum</div>
      <div className="rounded-xl border-2 border-border bg-black/20 p-3.5 text-foreground">
        {formatted}
      </div>
    </div>
  );
}
