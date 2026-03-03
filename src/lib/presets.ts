export const PRESETS = {
  oelwechsel: {
    material: ['Ölfilter', 'Motoröl'],
    beschreibung: 'Ölwechsel durchgeführt',
    arbeitszeit: '0.5',
  },
  kleinerService: {
    material: ['Ölfilter', 'Motoröl', 'Luftfilter'],
    beschreibung: 'Kleiner Service: Ölwechsel, Luftfilter, Sichtkontrolle',
    arbeitszeit: '1',
  },
  grosserService: {
    material: ['Ölfilter', 'Motoröl', 'Luftfilter', 'Innenraumfilter', 'Zündkerzen', 'Bremsflüssigkeit'],
    beschreibung: 'Grosser Service: Ölwechsel, alle Filter, Zündkerzen, Bremsflüssigkeit, Sichtkontrolle',
    arbeitszeit: '2.5',
  },
} as const;

export type PresetName = keyof typeof PRESETS;

export const SERVICE_MATERIALS = [
  'Ölfilter', 'Luftfilter', 'Innenraumfilter', 'Kraftstofffilter',
  'Zündkerzen', 'Scheibenwischer', 'Bremsflüssigkeit', 'Kühlflüssigkeit', 'Motoröl',
];

export const REPARATUR_MATERIALS = [
  'Bremsbeläge', 'Bremsscheiben', 'Batterie', 'Leuchtmittel',
  'Auspuff', 'Stoßdämpfer', 'Sicherung', 'Kleinmaterial',
];

export const REIFEN_MATERIALS = [
  'Ventile', 'Wuchtgewichte', 'Altreifenentsorgung', 'RDKS-Sensor',
];

export const SAFETY_CHECKS = [
  { key: 'check_bremsen_vorne', label: 'Bremsen vorne' },
  { key: 'check_bremsen_hinten', label: 'Bremsen hinten' },
  { key: 'check_beleuchtung', label: 'Beleuchtung' },
  { key: 'check_fluessigkeiten', label: 'Flüssigkeitsstände' },
  { key: 'check_unterboden', label: 'Unterboden/Auspuff' },
] as const;
