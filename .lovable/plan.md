

# Datenbank-Normalisierung abschliessen + Code anpassen

Sorry für die Verzögerung — ich war im Plan-Modus und habe auf dein OK gewartet, statt loszulegen. Hier der finale Plan, kurz und konkret.

## 1. Datenbank-Migration

**Daten löschen** (sauberer Start):
- `TRUNCATE arbeitsrapporte, rapport_positionen, fahrzeuge, kunden CASCADE`
- Zugehörige Storage-Files (`belege/`, `fotos/`) bleiben — kannst du manuell im Dashboard leeren falls nötig.

**Snapshot-Spalten aus `arbeitsrapporte` entfernen:**
- Kunde: `kunde_name`, `kunde_ort`, `kunde_strasse`, `kunde_plz`, `kunde_telefon`, `kunde_email`, `kundennummer`
- Fahrzeug: `kennzeichen`, `marke`, `modell`, `chassis_nr`
- Inhalt: `material_liste`, `arbeit_beschreibung`
- Auch `auftragsnummer` (ungenutzt, `rapport_nummer` bleibt)

**Constraints + FKs:**
- `kunden.kundennummer` → UNIQUE NOT NULL
- `fahrzeuge.chassis_nr` → UNIQUE (nullable, aber wenn gesetzt eindeutig)
- `fahrzeuge.kennzeichen` → Index (nicht unique, kann wechseln)
- `fahrzeuge.kunde_id` → FK → `kunden(id)` ON DELETE RESTRICT
- `arbeitsrapporte.fahrzeug_id` → FK → `fahrzeuge(id)` ON DELETE RESTRICT, **NOT NULL**
- `rapport_positionen.rapport_id` → FK → `arbeitsrapporte(id)` ON DELETE CASCADE

**Trigger:**
- `update_updated_at_column` auf `kunden`, `fahrzeuge`, `arbeitsrapporte`
- `generate_rapport_nummer` BEFORE INSERT auf `arbeitsrapporte`

## 2. n8n-Mapping (für dich zur Info)

n8n muss ab sofort in dieser Reihenfolge schreiben:

```text
1. UPSERT kunden  (key: kundennummer)        → erhält kunden.id
2. UPSERT fahrzeuge (key: chassis_nr,
   sonst kennzeichen) mit kunde_id           → erhält fahrzeuge.id
3. INSERT arbeitsrapporte mit fahrzeug_id
4. INSERT rapport_positionen[] mit rapport_id
   (typ='material' oder 'arbeit')
```

## 3. Code-Anpassungen (alle Lese-Stellen auf JOIN umstellen)

Überall wo heute `rapport.kunde_name`, `rapport.kennzeichen`, `rapport.marke`, `rapport.material_liste`, `rapport.arbeit_beschreibung` etc. gelesen wird → über `fahrzeug:fahrzeuge(*, kunde:kunden(*))` joinen.

**Betroffene Dateien:**

| Datei | Änderung |
|---|---|
| `src/pages/AuftragDetail.tsx` | Select erweitern: `*, fahrzeug:fahrzeuge(*, kunde:kunden(*))`; Header liest aus `rapport.fahrzeug.kennzeichen` etc. |
| `src/components/AuftragDetailMobile.tsx` | Props-Typ erweitern, alle Snapshot-Lesungen → `rapport.fahrzeug?.…` / `rapport.fahrzeug?.kunde?.…` |
| `src/components/RapportUebersicht.tsx` | JOIN-Daten verwenden; `material_liste`/`arbeit_beschreibung` entfallen (kommt eh schon aus `rapport_positionen`) |
| `src/pages/Archiv.tsx` | Select um `fahrzeug:fahrzeuge(kennzeichen, marke, modell, kunde:kunden(name, ort, kundennummer))` erweitern; Filter/Sort/Suche/CSV anpassen |
| `src/pages/Wochenplan.tsx` + `MobileWochenplan.tsx` + `RapportCard` | Karten zeigen `fahrzeug.kennzeichen` + `fahrzeug.kunde.name` via JOIN |
| `src/pages/Statistiken.tsx` | Top-Kunden-Aggregation über `fahrzeug.kunde.kundennummer`/`name` |
| `src/pages/KundeDetail.tsx` | Query: `kunden` lesen + `arbeitsrapporte` über `fahrzeug.kunde_id` joinen |
| `src/pages/FahrzeugDetail.tsx` | Query: `fahrzeuge` per `kennzeichen` lesen, dann Rapporte über `fahrzeug_id` |
| `src/components/GlobalSearch.tsx` | Suche über `fahrzeuge` (kennzeichen, marke, modell) + `kunden` (name, kundennummer), dann zugehörige Rapporte |
| `src/hooks/useFahrzeugSuche.ts` | Komplett auf `fahrzeuge`-Tabelle + `kunden`-JOIN umstellen statt `arbeitsrapporte`-Snapshots |
| `src/components/NeuerAuftragDialog.tsx` + `NeuerAuftragSheet.tsx` | Beim Anlegen kein Snapshot mehr — `fahrzeug_id` ist beim manuellen Anlegen offen (Dialog erstellt Rapport ohne Fahrzeug; n8n setzt `fahrzeug_id` beim PDF-Verarbeiten) |
| `src/components/ErledigenDialog.tsx` | Typ anpassen, kein Snapshot-Read |
| `src/components/RapportActionSheet.tsx` | JOIN-Daten verwenden |
| `src/components/BelegMitRapport.tsx` | Falls Snapshot-Reads → JOIN |

## 4. Hinweise / Risiken

- **Manuell angelegte Aufträge** (über „Neuer Auftrag"-Dialog mit PDF) haben anfangs `fahrzeug_id = NULL`. Da die Spalte NOT NULL werden soll → entweder (a) `fahrzeug_id` doch nullable lassen, bis n8n verarbeitet hat, oder (b) UI zwingt vorher zur Fahrzeug-/Kundenauswahl. **Empfehlung: nullable lassen** — n8n füllt nach PDF-Parse nach.
- Nach der Migration sind **alle Daten weg** — du hast das so bestätigt.
- Bis n8n umgestellt ist, werden neue Rapporte ohne `fahrzeug_id` angelegt und zeigen leere Kennzeichen/Kunden — das ist erwartet.

## Bestätigung

Wenn du zustimmst, führe ich aus:
1. Migration (TRUNCATE + DROP columns + FKs + Trigger), `fahrzeug_id` bleibt **nullable**
2. Refactor aller oben gelisteten Code-Dateien auf JOIN-Reads

