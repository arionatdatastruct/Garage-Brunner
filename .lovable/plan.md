## Vorgehen

### Teil 1: Du machst manuell in Supabase
1. **Authentication → Users → Add user** für den neuen Garagisten + neuen Admin anlegen (mit gewünschtem Passwort, "Auto Confirm User" aktivieren).
2. Neue **User-IDs kopieren** (aus der User-Liste).
3. **SQL Editor** öffnen und in `user_roles` die Rollen für die neuen IDs setzen:
   ```sql
   INSERT INTO public.user_roles (user_id, role) VALUES
     ('<neue-admin-uuid>', 'admin'),
     ('<neue-garagist-uuid>', 'garagist');
   ```
4. Testen: mit neuen Logins einloggen → alles funktioniert.
5. Alte User in **Authentication → Users** löschen (löscht via Cascade auch deren `user_roles`-Einträge).

Daten in `arbeitsrapporte`, `fahrzeuge`, `kunden`, `rapport_positionen` sind **nicht** an `auth.users` gekoppelt → bleiben unberührt.

### Teil 2: Ich räume den Reset-Password-Code auf (Build Mode)

**Löschen:**
- `src/pages/ResetPassword.tsx`
- `public/sw.js` (Kill-Switch nicht mehr nötig — kann bleiben, schadet nicht; ich entferne ihn trotzdem, da PWA eh deaktiviert wurde)
- `VITE_PASSWORD_RESET_REDIRECT` aus `.env.example`

**Zurückbauen:**
- `src/main.tsx` → Recovery-Token-Interception entfernen, zurück auf simples `createRoot().render(<App />)`.
- `src/App.tsx` → `/reset-password` und `/reset-password/*` Routen entfernen, zurück auf normale Router-Struktur mit `NotFound` als Catch-all.
- `vercel.json` → Catch-all-Rewrite prüfen; SPA-Standard-Rewrite (`/* → /index.html`) bleibt, da generell für React-Router nötig.
- Service-Worker-Unregister-Logik in `src/main.tsx` bleibt drin (schützt User mit altem PWA-Cache).

**Behalten:**
- `vite.config.ts` ohne `vite-plugin-pwa` (war eh problematisch).
- `public/manifest.webmanifest` (harmlos, App bleibt installierbar).

### Teil 3: Supabase-Konfiguration (optional, manuell)
Falls du es aufgeräumt willst:
- **Authentication → URL Configuration → Site URL** zurück auf `https://forms.datastruct.ch`.
- **Redirect URLs**: alle `/reset-password`-Einträge entfernen.

### Ergebnis
- Reset-Link-Logik komplett weg, kein toter Code mehr.
- Du verwaltest Passwörter ab jetzt über User-Neuanlage in Supabase.
- Falls du später doch eine Admin-Funktion „Passwort setzen" in der App willst → separate kleine Edge Function mit `service_role`, die nur Admins aufrufen dürfen. Können wir bei Bedarf nachziehen.

Soll ich so loslegen?
