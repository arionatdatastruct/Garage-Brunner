# Mobile-Rekonstruktion (Garage Brunner Formular)

> Desktop (≥ md) bleibt **unverändert**. Alle Änderungen gelten nur für Mobile (< md), via `useIsMobile()` oder Tailwind-Breakpoints.

## 1. Wochenplan – Vertikale Agenda
- Statt 5 schmaler Spalten → durchgehende Tagesliste (Mo–Fr untereinander).
- Sticky-Top: KW + Wochenbereich + ◀ ▶ + "Heute".
- Pro Tag: Sticky-Sub-Header (Wochentag, Datum, Stunden/Kapazität, Auslastungsbalken). Heute = Akzent.
- Aufträge gestapelt in voller Breite. Leere Tage: Hinweis + "+"-Button.
- Drag&Drop entfällt mobil → ersetzt durch Quick-Actions.
- Banner (überfällig / andere Wochen) bleiben oben, kompakter.

## 2. Auftragskarte (Mobile)
- Mittlere Dichte: 2 Zeilen + Mechaniker-Dot + Kategorie-Badges.
- Min-Höhe ~76px, Touch-Target ≥ 44px, Status-Strich links 4px.
- Stunden-Pill öffnet Bottom-Sheet (kein fragiles Inline-Input).
- Swipe rechts → Status weiter (geplant→in_arbeit→erledigt) + Toast/Undo.
- Swipe links / Long-Press → Quick-Action-Sheet.
- Tap → Detail.
- Überfällig-Karten: roter Rand bleibt.

## 3. Quick-Action Bottom-Sheet (neu)
- Stunden eintragen (großer Input + 0.25/0.5/1/2 Pills).
- Status wechseln (3 große Buttons).
- Verschieben: Heute / Morgen / Übermorgen / Nächster Werktag + Datepicker.
- Auftrag öffnen / Löschen (mit Bestätigung).

## 4. Neuer-Auftrag-Dialog → Mobile Stepper-Sheet
- Vollbild-Sheet (vaul) statt Modal, ~92vh.
- 3 Schritte mit Progress: 1) Fahrzeug, 2) Kunde, 3) Auftrag.
- Datum-Quick-Pills + Datepicker.
- Kategorien als Tap-Pills, große Felder (h-12, text-base gegen iOS-Zoom).
- Sticky Footer: ← Zurück | Weiter / Anlegen.

## 5. Auftrag-Detail (Mobile)
- Sticky Top-Bar: Zurück · Kennzeichen · Status-Pill (tap → Status ändern).
- Akkordeon statt Tabs:
  1. Übersicht (default offen)
  2. Arbeit & Material
  3. Sicherheitscheck (5 Punkte)
  4. Fotos
  5. Beleg / PDF
- Sticky Bottom-Action-Bar: "Erledigen" + Menü (Löschen/Drucken/Teilen).
- Auto-Save (on blur) bleibt.

## 6. Globale Mobile-Politur
- Bottom-Nav kompakter (h-14), Safe-Area beachten.
- FAB rückt höher (Sheet-Footer-Kollision vermeiden).
- GlobalSearch: h-11 Input + Result-Sheet statt Dropdown.
- Toaster bottom-center auf Mobile.
- Inputs text-base mobile (kein iOS-Auto-Zoom).

## 7. Neue Komponenten
- MobileWochenplan.tsx
- RapportActionSheet.tsx (vaul Drawer)
- NeuerAuftragSheet.tsx (Stepper, nutzt Form-Logik aus NeuerAuftragDialog)
- AuftragDetailMobile.tsx

## 8. Nicht geändert
- Desktop-Layout, Datenmodell, Supabase/RLS, Edge-Functions, PDF/Druck.

## Reihenfolge
1. Mobile-Wochenplan (Agenda) + Banner.
2. Karten + Quick-Action-Sheet.
3. Neuer-Auftrag-Stepper.
4. Auftrag-Detail Akkordeon + Sticky-Bars.
5. Globale Politur.
