// Wird in Phase 5 (Auftragsdetail) wiederverwendet.
// Vorerst nur Type-Export, damit bestehende Karten kompilieren.

export interface CompressedImage {
  blob: Blob;
  preview: string;
  filename: string;
}

export interface FormData {
  datum: string;
  kennzeichen: string;
  marke: string;
  modell: string;
  jahrgang: string;
  km_stand: string;
  kunde_name: string;
  kunde_adresse: string;
  kunde_telefon: string;
  kunde_email: string;
  service_typ: string;
  service_material: string[];
  reparatur_typ: string;
  reparatur_material: string[];
  reifen_typ: string;
  reifen_material: string[];
  arbeit_beschreibung: string;
  arbeitszeit_stunden: string;
  mechaniker: string;
  reifen_zustand: string;
  sicherheitscheck: Record<string, string>;
  ampel_status: string;
  naechster_service_datum: string;
  naechster_service_km: string;
  mfk_datum: string;
  notizen: string;
  fotos: CompressedImage[];
  kunde_benachrichtigt: string;
  reparaturbenachrichtigung: string;
}
