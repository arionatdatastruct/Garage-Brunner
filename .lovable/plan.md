
# Plan: Auth, RLS, OCR & sichere Secrets

## Teil 1 – Supabase-Auth mit 2 Rollen

**Rollen:** `admin` (du) und `garage` (Werkstatt). Beide dürfen praktisch alles – inkl. **Löschen** und **Export**. Unterschied bleibt minimal (nur Rollenverwaltung selbst ist admin-only).

### Datenbank-Migration
1. Enum `app_role` mit `admin`, `garage`
2. Tabelle `user_roles (id, user_id → auth.users, role, unique)` mit RLS
3. `SECURITY DEFINER`-Funktion `public.has_role(_user_id, _role)`
4. RLS-Policies neu für `arbeitsrapporte`, `fahrzeuge`, `kunden`, `rapport_positionen`:
   - `SELECT/INSERT/UPDATE/DELETE` für **beide** Rollen (`has_role(uid,'admin') OR has_role(uid,'garage')`)
5. `user_roles`: SELECT für eigenen User, Mutationen nur admin
6. Storage `fotos` + `belege`: Policies von `anon` auf `authenticated`-mit-Rolle umstellen

### Frontend
- **Minimales Login-Sheet** (`/login`): Logo klein oben, ein E-Mail-Feld, ein Passwort-Feld, ein „Anmelden"-Button. Kein Signup, kein „Passwort vergessen", keine Marketing-Texte. Dark-Theme wie Rest der App.
- `AuthGate`: `signInAnonymously()` raus → ohne Session redirect auf `/login`
- Header bekommt kleines User-Menü mit Logout
- Session: 30 Tage (Supabase Default), `persistSession` + `autoRefreshToken` schon aktiv → 1× alle 30 Tage einloggen reicht

### Setup nach Migration (du im Supabase Dashboard)
- Email-Provider aktivieren, „Confirm email" aus
- 2 User anlegen (admin@…, garage@…)
- Per SQL Rollen zuweisen
- Cloudflare Access danach in Cloudflare deaktivieren

---

## Teil 2 – OCR für Belege (Mistral, automatisch, unsichtbar)

Bleibt wie bisher: Beleg-Upload löst OCR **automatisch im Hintergrund** aus, kein extra Button. Ergebnis wird intern verarbeitet wie aktuell.

- Bereits vorhandene Logik bleibt unverändert
- Falls noch nicht in Edge Function: in `ocr-beleg` Edge Function verschieben (siehe Teil 3, warum)

---

## Teil 3 – Wie API-Keys nie in der Konsole/im Browser auftauchen

Das ist die wichtigste Regel und der Grund für die ganze Architektur:

### Aktuelle Situation (sicher)
Was im Browser/Netzwerk-Tab sichtbar ist:
- `VITE_SUPABASE_URL` → öffentliche URL, kein Geheimnis
- `VITE_SUPABASE_PUBLISHABLE_KEY` → das ist der **anon key**, **by design öffentlich**. Er erlaubt nur das, was RLS zulässt. Ohne RLS = Tür offen. Mit RLS = nutzlos ohne gültigen User-Login.
- → Diese zwei sind kein Problem, **sollen** im Frontend sein.

### Was niemals im Browser sein darf
- `SUPABASE_SERVICE_ROLE_KEY` (bypasst RLS)
- `LOVABLE_API_KEY` (Mistral/AI Gateway)
- `N8N_PDF_WEBHOOK_URL`, `CF_ACCESS_*`
- Alle zukünftigen Drittanbieter-Keys

### Wie wir das technisch sicherstellen

```text
┌─────────────────────────┐         ┌─────────────────────────────┐         ┌──────────────────┐
│ Browser (Frontend)      │         │ Supabase Edge Function      │         │ Externer Dienst  │
│                         │  HTTPS  │ (Deno, serverseitig)        │  HTTPS  │ (Mistral, n8n…)  │
│ kennt nur:              │ ──────► │                             │ ──────► │                  │
│ - SUPABASE_URL          │  JWT    │ liest Secrets via           │ Secret  │                  │
│ - PUBLISHABLE_KEY       │ Bearer  │ Deno.env.get('LOVABLE_…')   │ in      │                  │
│ - User-JWT (nach Login) │         │ validiert JWT + Rolle       │ Header  │                  │
└─────────────────────────┘         └─────────────────────────────┘         └──────────────────┘
```

**Konkrete Regeln im Code:**

1. **Keine `VITE_`-Variable für Secrets.** Alles mit `VITE_`-Prefix wird in das Browser-Bundle eincompiliert und ist via DevTools sichtbar. Wir lassen nur `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` zu.

2. **Alle Drittanbieter-Aufrufe gehen über Edge Functions.** Das Frontend ruft nie `fetch('https://api.mistral.ai/...')` – immer nur `supabase.functions.invoke('ocr-beleg', ...)`. Der Mistral-Key liegt nur in `Deno.env.get('LOVABLE_API_KEY')` innerhalb der Edge Function, läuft auf Supabase-Servern und ist im Browser-Network-Tab nicht sichtbar (du siehst nur den Call zu deiner eigenen Edge Function).

3. **Edge Function validiert immer JWT + Rolle**, bevor sie den Secret nutzt. Anonyme Calls = 401.

4. **Vercel-Env-Vars für Secrets: nein.** Vercel-Vars mit `VITE_`-Prefix landen im Bundle, ohne Prefix sind sie nur zur Build-Zeit verfügbar und nutzlos zur Laufzeit. Vercel hostet bei uns nur statische Files → es gibt keinen sicheren Runtime-Ort dort. **Einziger sicherer Ort: Supabase Edge Function Secrets.**

5. **`SUPABASE_SERVICE_ROLE_KEY`** wird **nie** an Frontend gegeben und **nie** als Caller-Token zu Edge Functions geschickt. Wird nur innerhalb von Edge Functions verwendet, wenn RLS gezielt umgangen werden muss (selten).

### Was du in der Konsole sehen wirst nach Umsetzung
- Network-Tab: Calls zu `*.supabase.co/auth/v1/...` (Login), `*.supabase.co/rest/v1/...` (Daten, mit User-JWT), `*.supabase.co/functions/v1/ocr-beleg` (OCR-Proxy)
- **Nicht sichtbar:** `api.mistral.ai`, `LOVABLE_API_KEY`, Webhook-URLs, Service-Role-Key
- Sources-Tab im Bundle: nur die zwei `VITE_SUPABASE_*` Strings

### Verifikation nach Umsetzung
Ich teste am Ende: `view-source:` + DevTools-Suche im gesamten Bundle nach Strings wie `mistral`, `n8n`, `service_role`, `LOVABLE_API_KEY`. Treffer = Fehler, kein Treffer = sauber.

---

## Reihenfolge

1. Migration (Enum, `user_roles`, `has_role`, neue Policies, Storage-Policies)
2. Minimales Login-Sheet + `AuthGate`-Umbau + Logout im Header
3. OCR-Aufrufe (falls noch im Frontend) in `ocr-beleg` Edge Function verschieben, Lovable AI Gateway nutzen (kein neues Secret)
4. Verifikation: Bundle nach Geheim-Strings durchsuchen
5. Du legst 2 User an + Rollen → testen → Cloudflare Access deaktivieren

---

## Offene Bestätigung

- OK, dass beide Rollen (admin + garage) wirklich alles dürfen inkl. Löschen und Export?
- OK, dass Login nur E-Mail + Passwort hat (kein Signup, kein Passwort-Reset v1 – Reset machst du bei Bedarf im Supabase Dashboard)?
- OK, dass wir Mistral weiterhin über `LOVABLE_API_KEY` (Lovable AI Gateway) laufen lassen, statt einen separaten Mistral-Account?
