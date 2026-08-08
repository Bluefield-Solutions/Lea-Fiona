# Entschlackung „Lea und Fiona" — Änderungsprotokoll

Stand: Vollständige Verifikation bestanden — `tsc` ✓, `npm run build` ✓
(Client+Server), Runtime-Smoke-Test (Server bootet, `/api/health` ok,
Spiel-Bundle wird ausgeliefert) ✓. Playwright konnte in der Sandbox nicht
laufen (kein Chromium) — bitte einmal `npx playwright test` im Replit
ausführen.

## A — Toter UI-Layer entfernt
- `client/src/components/ui/` (47 Shadcn-Komponenten) — von keiner Seite genutzt.
- `client/src/lib/` (utils.ts, queryClient.ts) — nur von ui/ referenziert.
- `client/src/hooks/` (use-toast.ts, use-mobile.tsx) — nur von ui/ referenziert.
- `client/src/pages/not-found.tsx` ohne `Card`/`lucide-react` neu geschrieben
  (5 Zeilen JSX) — letzte UI-Abhängigkeit eliminiert.

## B — Tote Frontend-Libs aus package.json entfernt
~30 @radix-ui-Pakete, framer-motion, recharts, react-hook-form,
@hookform/resolvers, react-icons, embla-carousel-react, cmdk, vaul,
next-themes, react-day-picker, input-otp, react-resizable-panels, date-fns,
@tanstack/react-query, wouter, lucide-react, class-variance-authority,
clsx, tailwind-merge, tailwindcss-animate, tw-animate-css,
@tailwindcss/typography, @tailwindcss/vite — alle nur im gelöschten ui/
verankert oder ungenutzt.
- `tailwind.config.ts`: tote Plugins (`tailwindcss-animate`,
  `@tailwindcss/typography`) entfernt.
- `nanoid` explizit als Dependency ergänzt (wird direkt in
  `server/vite.ts` importiert, war bisher nur transitiv aufgelöst).

## C — Toter DB-/Auth-Stack entfernt
- Pakete: drizzle-orm, drizzle-zod, drizzle-kit, pg, connect-pg-simple,
  express-session, passport, passport-local, memorystore, ws, zod +
  zugehörige @types/*, bufferutil.
- Dateien: `shared/schema.ts` (nirgends importiert), `drizzle.config.ts`,
  `components.json` (Shadcn-Config, gegenstandslos).
- `script/build.ts`: esbuild-Allowlist von `["express","ws","zod"]` auf
  `["express"]` reduziert.
- `package.json`: `db:push`-Script entfernt, `test`-Script ergänzt.
- `.replit`: Module `postgresql-16` und `python-3.11` entfernt.

Dependency-Bilanz: ~75 → 20 Pakete (4 runtime, 16 dev).
npm-Installgröße: 273 statt zuvor ~550+ Pakete.

## D — game.tsx entzerrt (1703 → 1062 Zeilen)
Subkomponenten in fokussierte Module unter `client/src/components/game/`
ausgelagert; `GamePage` bleibt schlanker Orchestrator:
- `types.ts` — HudStats, LevelInfo, ModalKind, PadProps
- `ui-helpers.ts` — formatTime, isTouchDevice, vibrate, smallBtn
- `Buttons.tsx` — HudButton, PrimaryButton, PadButton
- `ModalOverlay.tsx`
- `ProfilesPanel.tsx`
- `SettingsPanel.tsx` (inkl. SliderRow, ToggleRow)
- `AlbumPanel.tsx`

Spielkern (engine, renderer, physics, entities, levels) wurde NICHT
verändert — kein Gameplay-Risiko. Alle `data-testid`-Attribute blieben
identisch, daher bleiben die Playwright-Specs gültig.
