interface Props {
  onReset: () => void;
}

export function SuccessMessage({ onReset }: Props) {
  return (
    <div className="text-center py-10 px-5 animate-in fade-in">
      <div className="w-20 h-20 rounded-full bg-[hsl(var(--garage-green))]/20 flex items-center justify-center mx-auto mb-5 text-4xl">
        ✓
      </div>
      <h2 className="text-2xl font-bold mb-2">Gespeichert!</h2>
      <p className="text-muted-foreground">Daten wurden an das Büro gesendet.</p>
      <button
        onClick={onReset}
        className="mt-6 px-8 py-3.5 bg-transparent border-2 border-primary rounded-xl text-primary text-base cursor-pointer hover:bg-primary/10 transition-colors"
      >
        + Neuer Rapport
      </button>
    </div>
  );
}
