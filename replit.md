# Lea und Fiona im Abenteuerland - 2D Platformer Game

## Overview

"Lea und Fiona im Abenteuerland" is a browser-based 2D platformer game implemented as a full-stack TypeScript application. The game features a custom, from-scratch game engine handling physics, rendering, camera, entity management, and level generation, all running client-side using HTML5 Canvas. A minimal Express backend serves static files and provides API capabilities. The project aims to deliver a highly controlled and performant game experience without relying on external game frameworks.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, bundled by Vite.
- **UI/Canvas Split**: Gameplay (background, tiles, entities, particles) is rendered on a `<canvas>` element. All UI elements (title screen, HUD, modals, mobile gamepad) are React DOM overlays, interacting with the engine via an event bus.
- **Game Engine**: Custom-built, canvas-based engine in `client/src/game/`.
    - **Core Components**: `engine.ts` (main loop, state machine, audio, persistence, event bus), `renderer.ts` (2D rendering, tile caching, parallax backgrounds, sprite loading), `physics.ts` (tile-based collision, hazard/edge detection), `entities.ts` (Player, various enemies, collectibles, particles).
    - **Player Mechanics**: Includes coyote time, jump buffer, double-jump, variable jump, duck/un-duck, skid/turnaround, run-slide, P-Meter for boosted jumps, wall-slide/wall-jump, refined air-control, ground-pound (Down im Sprung), and Star-Mode-Invincibility (8s, kills enemies on touch). Stomp mechanics include bounce and combo systems.
    - **Enemies**: Goomba, Koopa, Bat, PiranhaPlant, Spider, Crab, Jellyfish, Kangaroo, Snake, Fireball, Ghost, Fish, Wizard (castle: teleports + sinusoidal MagicBolts, stompable), the Bomb-Omb (walks, stomp lights a fuse, detonates after a short delay with an AOE that kills enemies, breaks bricks and chain-detonates other Bomb-Ombs), the Stachelkugel (spike-ball — heavy roller, top-stomp damages, killed only by fire/bomb/star/shell, falls off ledges) the Hornisse (sine-wave flier; dives at the player inside HORNET_AGGRO_RANGE, stompable from above), Banzai Bill (riesiges schwereloses Geschoss, aktiviert in BANZAI_BILL_AGGRO_RANGE, stompbar von oben), Chargin' Chuck (Football-Gegner, schlendert langsam, sprintet bei Sicht in CHUCK_AGGRO_RANGE, braucht CHUCK_HITS_TO_KILL=3 Stomps mit Stun zwischen Treffern) und Big Boo (riesiger SMW-Geist; bewegt sich nur, wenn Spieler nicht hinschaut — `player.direction` zeigt vom Boo weg —, ist intangibel solange `hidden`, sonst stompbar; Feuerball zerschellt an ihm).
    - **Power-ups & Gadgets**: Heart (mushroom-equivalent: grow/shrink), Star (rainbow aura, 8s invincibility, melee enemy kill), Fire-Flower (grants the Feuerball ability — F-key on desktop / on-screen F-button on touch — which spawns bouncing fireballs that kill stompable enemies), Coin-Magnet (timed gadget that pulls all on-screen coins toward the player), Schmetterlingsumhang (cape — hold jump while falling to glide at CAPE_GLIDE_GRAVITY/CAPE_GLIDE_MAX_FALL; ground-pound short-circuits the glide), Schutzschild-Blase (one-shot bubble that absorbs the next hit and grants brief i-frames) and Zeitlupen-Uhr (4 s window in which every freezable enemy + their projectiles skip update entirely). Damage cascade is now Fire→Cape→Powered→Small→Dead. Special-block APIs on each level: `heartBlocks`, `starBlocks`, `fireBlocks`, `magnetBlocks`, `capeBlocks`, `shieldBlocks`, `clockBlocks` — all share the `["col,row", ...]` declaration form.
    - **Level Design**: 10 themed levels (jungle, cave, sky, beach, australia, volcano, ice, castle, underwater, space) defined via `LevelBuilder`.
    - **Input/Audio/Storage**: Custom modules for keyboard/touch input, procedural WebAudio for music and SFX, and `localStorage`-backed persistence for game progress.
    - **Tuning**: All game parameters are defined in `constants.ts` for fine-grained control over gameplay feel. The documented umbrella module `client/src/game/tuning.ts` re-exports the gameplay-feel constants (coyote time, jump buffer, P-meter, wall-jump, ground-pound) with explanatory comments — start there when balancing controls.
    - **Wall-Jump Buffer**: Wall-jumps trigger on a buffered jump press (JUMP_BUFFER_TIME) so taps during the short WALL_JUMP_LOCKOUT_FRAMES window still fire as soon as the player re-grips the wall.
    - **Audio Bootstrap**: `engine_internal/audio_bootstrap.ts` arms keydown/pointerdown/touchstart on both window and document (capture phase), and only tears down once the AudioContext reaches `running`. If the browser ignores the first gesture, listeners stay armed for the next.
    - **Adaptive Quality**: The engine averages frame deltas every ~60 frames; if FPS drops below ~50, `engine.lowFx` flips on and cosmetic particle bursts (block/coin/star/heart) self-throttle to 50%. Hysteresis clears the flag once FPS recovers above ~58.
    - **Level QS**: At `startLevel()` the engine validates every `*Blocks` declaration; entries that don't sit on a `QUESTION_BLOCK` tile are auto-remapped to the nearest QUESTION_BLOCK within ±2 tiles. Whatever can't be fixed is logged AND surfaced via `engine.devBlockWarnings`, which the React layer renders as a red banner in DEV builds (`import.meta.env.DEV`).
    - **Touch Controls**: PadButtons are 92×92 / 72×72 px with `touch-action: none`. The right cluster includes a "P!" combo button that holds RUN and JUMP simultaneously to make P-meter sprint-jumps comfortable on mobile.
    - **Shared Helpers**: `client/src/game/util/random.ts` exports the deterministic LCG `pseudoRandom(n)` reused by every decoration jitter (cave specks, jungle leaves, clouds, …). `client/src/game/util/enemy-tags.ts` is the single source of truth for "is this enemy AOE-killable / freezable" — `shockwave.ts`, `blocks.ts` (clock freeze) and the entity step all delegate here instead of carrying their own copy-pasted `instanceof` chains. Adding a new enemy = registering it in one of those `Ctor[]` arrays.
    - **Spielbarkeit & Fairness (Task #29)**:
      - **Mid-Level-Checkpoint**: jedes Level liefert ein optionales `checkpoint: { col, row }` (siehe `LevelData`); die Engine hält pro Run `checkpointActive`, `checkpointSpawn`, `checkpointTriggerX` und `checkpointDrawPos` in `engine.ts`. Sobald die Spielerin die Säule passiert, feuert die Engine `'checkpoint'` (+ Goldsterne, "Checkpoint!"-Floating-Text, `powerup`-SFX); `respawnPlayer()` benutzt danach den Checkpoint-Spawn statt `playerStart`. `startLevel()` setzt den Checkpoint pro Level neu auf — Game-Over / Restart resetten ihn implizit.
      - **Level-Intro-Karte**: 1.2 s Einblender mit Welt-Nummer, Levelname und Restleben. React abonniert das neue `'levelStart'`-Engine-Event und animiert die Karte über die `@keyframes levelIntroFade` in `index.css`.
      - **Animierter Zeit-Bonus**: `runFlagCollision()` schreibt den Score nicht mehr sofort gut; stattdessen ruft sie `engine.setTimeBonus(Math.ceil(time))` auf. Im `LEVEL_COMPLETE`-Tick drained die Engine `timeBonusRemaining` mit `TIME_BONUS_DURATION_FRAMES` Frames, `TIME_BONUS_PER_TIME=50` Punkten pro Sekunde und Coin-SFX. `finalizeLevelComplete()` schreibt erst nach Drain (oder beim Skip via Enter) `recordBestScore` + `carryStats`. Enter überspringt eine laufende Animation, addiert den Rest und springt sofort weiter.
      - Stimmkonstanten: `LEVEL_INTRO_FRAMES`, `TIME_BONUS_PER_TIME`, `TIME_BONUS_DURATION_FRAMES` in `constants.ts`.
    - **Sonder-Münzen + Sterne-Rating (Task #30)**:
      - Pro Level liegen drei versteckte SpecialCoins (28×28, gold, slotIndex 0..2). Deklariert via `LevelData.specialCoins: ["col,row", ...]` (siehe `client/src/game/levels/*.ts`); `engine.startLevel()` zentriert sie in das jeweilige 32×32-Tile und überspringt persistierte Slots.
      - Persistenz: `Profile.specialCoinsCollected: Record<string, [bool,bool,bool]>` und `Profile.levelStars: Record<string, number>` in `client/src/game/storage.ts` (sanitized, max-only). APIs: `getSpecialCoinsCollected`, `markSpecialCoinCollected`, `getLevelStars`, `recordLevelStars`.
      - Punkte: `SPECIAL_COIN_VALUE = 1000` Score (zählt NICHT in `coins`/`coinsThisLevel`/Extra-Life-Tally).
      - Sterne-Kriterien (in `engine.finalizeLevelComplete()`): (1) alle drei Sonder-Münzen, (2) Level ohne Treffer (`!tookHitThisLevel`), (3) Restzeit beim Flag-Touch ≥ `STAR_TIME_THRESHOLD = 200`. `engine.lastLevelStars` und `engine.specialCoinsThisRun` werden via `getStats()` an die HUD gepusht.
      - UI: HUD-Pille "★ X/3" (neben P-Meter), Level-Complete-Overlay mit drei Stern-Slots (Pop-Animation `@keyframes starPop` in `index.css`), Level-Select-Karten mit Stern-Reihe + 🪙-Pille, Album-Sektion "Sonder-Münzen" (Gesamtfortschritt + Pro-Level-Grid).
    - **Modal UX**: `ModalOverlay` (in `client/src/pages/game.tsx`) traps focus inside the dialog (Tab/Shift+Tab cycle within), focuses the first focusable element on mount and restores the previously focused element on close. Esc still closes via the page-level handler (and toggles pause for the pause overlay through the engine's input). Profile deletion uses an in-game styled confirmation overlay (`confirm-delete-overlay`) instead of the native `window.confirm`.
- **UI Components**: Shadcn/ui (new-york style) with Radix UI primitives and Tailwind CSS.
- **Routing**: No client-side router; `App.tsx` provides an `ErrorBoundary` for game/rendering errors.
- **Path Aliases**: `@/` for `client/src/`, `@shared/` for `shared/`, `@assets/` for `attached_assets/`.

### Backend
- **Framework**: Express 5 on Node.js with TypeScript.
- **Structure**: `server/index.ts` handles server creation and routing; `server/routes.ts` exposes a single `/api/health` probe; `server/storage.ts` is now a no-op stub (the game persists fully client-side via `localStorage`, see `client/src/game/storage.ts`); `server/static.ts` serves built client files; `server/vite.ts` is the Vite dev server integration. If a server-side feature is ever needed, reintroduce a real `IStorage` implementation in `server/storage.ts` and wire it through `server/routes.ts`.

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect.
- **Schema**: Defined in `shared/schema.ts`, including a `users` table. `drizzle-zod` is used for validation.
- **Migrations**: Managed via `drizzle-kit`.
- **Note**: The database is currently not actively used by the game; game progress is stored client-side.

### Build System
- **Development**: `npm run dev` uses `tsx` and Vite middleware.
- **Production**: `npm run build` compiles client (Vite) and server (esbuild); `npm run start` runs the compiled server.

### Testing
- **E2E Tests**: Playwright (`tests/mario-moves.spec.ts`) drives the engine deterministically via a `window.__game` test hook (exposed by `client/src/pages/game.tsx`) and the engine's `testStep(frames)` / `testSpawnGoomba(x, y)` helpers. The whole suite runs under ~12s in headless Chromium.
- **Run**: `npx playwright test` (config: `playwright.config.ts`, auto-discovers the system Chromium binary via PATH lookup at config load — falls back to Playwright's bundled browser if available. Override with `PLAYWRIGHT_CHROMIUM_PATH=/abs/path/to/chromium` if needed). `webServer` reuses the running `npm run dev`.
- **Coverage**: P-Meter charge + HUD, P-Meter jump-boost, Run-Slide pose, Wall-Slide/Wall-Jump impulse, Stomp-Combo escalation.

### Key Design Decisions
1.  **Custom Game Engine**: Prioritizes full control and performance over ease of development provided by game frameworks.
2.  **Swappable Storage**: The server's storage interface allows easy transition from in-memory to database persistence. Game progress is managed client-side in `localStorage`.
3.  **Shared Schema**: `shared/` directory ensures type safety across client and server.
4.  **Fixed Timestep Game Loop**: Guarantees deterministic physics updates at 60fps.
5.  **Persistent Game Stats**: Lives, coins, and score persist across levels within a single game run.
6.  **Centralized Player Damage**: All damage logic funnels through `GameEngine.playerHit()` for consistent behavior (invincibility, SFX, camera shake).
7.  **Procedural Audio**: All audio is synthesized via WebAudio, eliminating audio file dependencies and satisfying browser autoplay policies.

## External Dependencies

### Core Infrastructure
- **PostgreSQL**: Database for Drizzle ORM (requires `DATABASE_URL`).
- **Drizzle ORM**: `drizzle-orm`, `drizzle-kit`, `drizzle-zod` for database interaction.
- **Express 5**: Node.js web application framework.

### Frontend Libraries
- **React 18** & **React DOM**: UI framework.
- **Vite**: Build tool.
- **@tanstack/react-query**: Server state management (configured).
- **Tailwind CSS**: Utility-first CSS framework.
- **Shadcn/ui** & **Radix UI**: Component library and headless UI primitives.
- **Lucide React**: Icon library.
- **class-variance-authority**, **clsx**, **tailwind-merge**: CSS class utilities.

### Game Assets
- **Player Sprite**: Loaded from `attached_assets/image_1771096265545.png`.
- **Audio**: Entirely procedurally synthesized via WebAudio.