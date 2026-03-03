import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (kunde: { name: string; adresse: string; telefon: string; email: string }) => void;
  kennzeichen: string;
}

export function NeuerKundeDialog({ open, onClose, onSave, kennzeichen }: Props) {
  const [name, setName] = useState('');
  const [adresse, setAdresse] = useState('');
  const [telefon, setTelefon] = useState('');
  const [email, setEmail] = useState('');

  const handleSave = () => {
    onSave({ name, adresse, telefon, email });
    setName('');
    setAdresse('');
    setTelefon('');
    setEmail('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border text-foreground max-w-[90vw] sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Neuen Kunden anlegen</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Fahrzeug: <strong className="text-primary">{kennzeichen || '—'}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-2">
          <div>
            <label className="garage-label">Name *</label>
            <input
              className="garage-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max Muster"
              autoFocus
            />
          </div>
          <div>
            <label className="garage-label">Adresse</label>
            <input
              className="garage-input"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              placeholder="Musterstrasse 1, 8000 Zürich"
            />
          </div>
          <div>
            <label className="garage-label">Telefon</label>
            <input
              className="garage-input"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              placeholder="+41 79 123 45 67"
              inputMode="tel"
            />
          </div>
          <div>
            <label className="garage-label">E-Mail</label>
            <input
              className="garage-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="max@muster.ch"
              inputMode="email"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 p-3 rounded-xl border-2 border-border text-muted-foreground text-sm font-medium cursor-pointer hover:bg-accent transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 p-3 rounded-xl border-none bg-[hsl(var(--garage-green))] text-white text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
          >
            ✓ Kunde anlegen
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
