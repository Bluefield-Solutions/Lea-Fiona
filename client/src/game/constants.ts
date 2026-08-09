export const TILE_SIZE = 32;
export const GRAVITY = 0.48;
export const GRAVITY_FALLING = 0.72;
export const GRAVITY_APEX = 0.22;
export const MAX_FALL_SPEED = 12;
export const PLAYER_SPEED = 3.5;
// Top-speed when sprinting — bumped a notch so running feels noticeably
// faster than walking instead of a small nudge.
export const PLAYER_RUN_SPEED = 7.5;
export const PLAYER_JUMP_FORCE = -10.5;
export const PLAYER_BOUNCE_FORCE = -9.5;
// Sprungfeder (SPRING_STONE): katapultiert die Spielerin deutlich höher als ein
// normaler Sprung — Umwelt-Interaktion, erreicht sonst unerreichbare Bereiche.
export const SPRING_FORCE = -16.5;
export const FRICTION = 0.87;
export const AIR_FRICTION = 0.94;
export const ICE_FRICTION = 0.985;
export const ACCELERATION = 0.5;
// Higher run accel so the player ramps up to the new run-top-speed quickly
// instead of feeling sluggish for the first half-second of holding shift.
export const RUN_ACCELERATION = 0.9;
export const AIR_ACCELERATION = 0.35;
// Crawl-speed multiplier when ducking. PLAYER_SPEED * 0.45 ≈ 1.6 px/frame —
// clearly slower than walking but enough to creep through low passages.
export const DUCK_SPEED_MULT = 0.45;
// Hitbox height while ducking AND powered up. Smaller than upright powered
// (80) but bigger than the small duck (48), so the powered crouch still
// reads as the bigger character.
export const POWERED_DUCK_HEIGHT = 60;

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 480;

export const COIN_VALUE = 100;
export const BLOCK_COIN_VALUE = 200;
export const ENEMY_KILL_SCORE = 100;
export const EXTRA_LIFE_COINS = 50;

export const PLAYER_MAX_LIVES = 5;
export const PLAYER_START_LIVES = 3;
export const LEVEL_TIME = 300;

export const ENEMY_SPEED = 1.2;
export const ENEMY_FAST_SPEED = 2.0;
export const BAT_SPEED = 1.5;
export const BAT_FLY_AMPLITUDE = 40;
export const BAT_FLY_SPEED = 0.03;

export const CAMERA_LOOKAHEAD = 18;
// Richtungs-Hysterese (dual-forward-focus, wie Super Mario World / NSMBU): die
// Blickrichtung des Vorausblicks wechselt erst, wenn die Figur so viele Frames
// konsequent in die neue Richtung läuft. Kurze Korrekturen/Richtungswechsel
// schwenken die Kamera dadurch NICHT, bewusste Wechsel schon.
export const CAMERA_LOOK_DIR_SWITCH_FRAMES = 10;
// Glättung der Vorausschau (0..1 pro Frame): höher = Kamera führt schneller
// in Laufrichtung, springt aber leichter bei Tempowechsel.
export const CAMERA_LOOKAHEAD_SMOOTH = 0.1;
// Tempoabhängiges Aufholen: bei vollem Sprint wird das horizontale Folge-Lerp
// um diesen Faktor verstärkt, damit die Figur nicht zum Rand davonläuft.
export const CAMERA_FOLLOW_SPEED_BOOST = 1.4;
// Vertikaler Vorausblick beim Fallen: schiebt die Sicht nach unten, damit man
// früher sieht, wo man landet. Greift erst ab spürbarer Fallgeschwindigkeit.
export const CAMERA_FALL_LOOKAHEAD = 11;       // px pro velY-Einheit über Schwelle
export const CAMERA_FALL_LOOKAHEAD_MAX = 150;  // Deckel (px nach unten)
export const CAMERA_FALL_LOOK_SMOOTH = 0.06;   // Glättung (Steigen / Abbau)
export const CAMERA_FALL_LOOK_SMOOTH_FAST = 0.16; // schnellerer Aufbau beim Fallen
// Vertikaler Vorausblick beim Steigen (Celeste-Drittel-Regel): bei anhaltender
// Aufwärtsbewegung (Klettern, Sprungketten) schiebt sich die Sicht weich nach
// oben, damit man früher sieht, wohin es geht. Bewusst kleiner/zurückhaltender
// als der Fall-Vorausblick und gleich langsam geglättet, damit einzelne kleine
// Sprünge die Kamera NICHT verschieben (Platform-Snapping-Philosophie bleibt).
export const CAMERA_RISE_LOOKAHEAD = 10;       // px pro velY-Einheit über Schwelle
export const CAMERA_RISE_LOOKAHEAD_MAX = 110;  // Deckel (px nach oben)
// Basis-Zoom des Bildausschnitts (>1 = näher heran, Figur größer). Auf Touch-
// Geräten (iPhone-Querformat) näher, damit die Figuren auf dem kleinen Display
// präsent sind; Desktop etwas weiter für mehr Übersicht.
export const CAMERA_TOUCH_ZOOM = 1.9;
export const CAMERA_DESKTOP_ZOOM = 1.3;
// Dynamischer Zoom-out bei Highspeed: bei vollem Sprint zoomt die Kamera leicht
// heraus (mehr Übersicht/Vorausschau). 0.11 = bis 11 % weiter weg. Geglättet.
export const CAMERA_SPEED_ZOOM_MAX = 0.11;
export const CAMERA_SPEED_ZOOM_SMOOTH = 0.05;
export const CAMERA_SMOOTH = 0.08;
export const CAMERA_VERTICAL_SMOOTH = 0.07;
// Beim schnellen Fallen folgt die Kamera vertikal spürbar schneller, damit man
// früh sieht, wo die Figur landet (sonst hinkt die Sicht beim Sturz hinterher).
// Faktor auf CAMERA_VERTICAL_SMOOTH bei voller Fallgeschwindigkeit.
export const CAMERA_FALL_FOLLOW_BOOST = 7.0;
// Platform-snapping vertical camera: the view anchors to the height of the
// platform the player stands on, so normal jumps don't bob the camera.
// While airborne the anchor only moves if the player leaves this deadzone
// (so big falls/rises still track). On landing, the anchor eases to the new
// platform height at ANCHOR_SNAP per frame.
export const CAMERA_VERTICAL_DEADZONE = 128;
// Beim Fallen folgt die Kamera mit einer viel kleineren Deadzone nach unten
// (statt der vollen 128 px), damit sie eng mitfällt und man die Landung früh
// sieht. Nach oben (Springen) bleibt die volle Deadzone für ein ruhiges Bild.
export const CAMERA_FALL_DEADZONE = 36;
export const CAMERA_ANCHOR_SNAP = 0.12;
// Vertikale Grundposition der Figur im Bild (Anteil der Sichthöhe, um den sie
// UNTER die Mitte rückt). Standard bei Platformern: bei horizontaler Bewegung
// im unteren Drittel sitzen, damit mehr Raum/Vorausschau OBERHALB sichtbar ist
// (höhere Plattformen, Himmel) statt unnötig viel Untergrund. 0.14 ≈ Figur bei
// ~64 % der Sichthöhe. Fall-/Steig-Vorausblick wirken zusätzlich.
export const CAMERA_VERTICAL_BIAS = 0.14;

export const PARTICLE_GRAVITY = 0.15;
export const PARTICLE_LIFETIME = 40;

export const COYOTE_TIME = 8;
export const JUMP_BUFFER_TIME = 8;
export const VARIABLE_JUMP_FRAMES = 16;
// Bumped from 2.8 → 3.2 so the apex of a jump has a touch more "hangtime",
// which makes precise enemy-hopping and wall-jump aim feel more Mario-like.
export const APEX_THRESHOLD = 3.2;
export const STOMP_FORGIVENESS = 14;

// ---------------------------------------------------------------------------
// Mario-feel tuning
// ---------------------------------------------------------------------------
// Skid / turn-around: when the player presses the opposite direction at
// |velX| > PLAYER_SPEED, normal accel is replaced by SKID_DECEL_MULT × accel
// so braking is visibly faster than re-accelerating.
export const SKID_DECEL_MULT = 2.0;
// P-meter: frames of full-throttle running needed to charge.
// Tuning note: the P-charge is CONSUMED by the boost-jump (authentic SMB3
// behavior — see Player.handleInput in entities.ts). After a boosted jump
// the player must sprint for another P_METER_FRAMES frames to re-arm it,
// otherwise quickly landing and re-jumping would grant the boost for free.
export const P_METER_FRAMES = 60;
// P-meter jump force multiplier while charged.
export const P_METER_JUMP_BOOST = 1.20;
// Slide: weak friction while sliding so momentum bleeds slowly.
export const SLIDE_FRICTION = 0.97;
// Wall-slide: maximum downward speed while gripping a wall.
export const WALL_SLIDE_MAX_FALL = 1.5;
// Wall-jump: frames of air-control lock-out so the player can't immediately
// reattach to the same wall. Kept short so a buffered jump press can still
// fire as soon as the player re-touches the wall (siehe Player.handleInput
// — JUMP_BUFFER_TIME erlaubt Vorab-Tippen während der Lockout-Phase).
export const WALL_JUMP_LOCKOUT_FRAMES = 6;
// Wall-jump impulses (relative to the standard run/jump constants).
export const WALL_JUMP_X_FACTOR = 0.7;
export const WALL_JUMP_Y_FACTOR = 0.85;
// Stomp-bounce while jump is held: trampoline-style high bounce.
export const BOUNCE_BOOST_MULT = 1.5;
// Air-control reduction while a sprinted jump is in progress (Mario-typical
// momentum-preservation feel).
export const AIR_ACCELERATION_LOCKED = 0.25;
// Stomp-combo escalation. The 6th stomp also grants a 1up.
export const STOMP_COMBO_SCORES = [100, 200, 400, 800, 1000];
export const STOMP_COMBO_ONEUP_INDEX = 5;

// ---------------------------------------------------------------------------
// New abilities & power-ups
// ---------------------------------------------------------------------------
// Ground-pound: Down + airborne after a short minimum air-time triggers a
// fast vertical dive. On landing it emits a shockwave that kills any
// stompable enemies inside GROUND_POUND_RADIUS and breaks adjacent BRICK
// tiles. Lockout prevents instant re-pound on bounce.
export const GROUND_POUND_SPEED = 14;
export const GROUND_POUND_MIN_AIRTIME = 6;
export const GROUND_POUND_LOCK_FRAMES = 8;
export const GROUND_POUND_RADIUS = 64;
// Star power-up: total invincibility (kill on touch) for this many frames.
// 8 seconds @ 60 fps. The last 90 frames flash to telegraph wear-off.
export const STAR_DURATION_FRAMES = 480;
export const STAR_FADE_FRAMES = 90;
export const STAR_KILL_SCORE = 200;

// Superkraft (cartwheel / one-leg-hop). Picking up the power-up grants
// SUPER_MAX_CHARGES uses; each button press plays a SUPER_MOVE_FRAMES-long
// move that wipes every on-screen enemy. Brief i-frames cover the move.
export const SUPER_MAX_CHARGES = 3;
export const SUPER_MOVE_FRAMES = 50;
export const SUPER_KILL_SCORE = 200;
// Magic bolt projectile fired by the Magier (Wizard) enemy.
export const MAGIC_BOLT_SPEED = 2.6;
export const MAGIC_BOLT_AMP = 22;
export const MAGIC_BOLT_FREQ = 0.09;
export const MAGIC_BOLT_LIFETIME = 260;
// Wizard: idle → cast → teleport cadence. Teleport range is in pixels
// relative to the spawn position.
export const WIZARD_CAST_INTERVAL = 150;
export const WIZARD_TELEPORT_INTERVAL = 240;
export const WIZARD_TELEPORT_RANGE = 96;
export const WIZARD_TELEPORT_FADE = 18;

// ---------------------------------------------------------------------------
// Bomb-Omb: walks like a Goomba, but stomping it doesn't kill — it lights
// a fuse. After the fuse runs out it detonates a short-lived explosion
// that kills any stompable enemy in BOMB_EXPLOSION_RADIUS and breaks
// adjacent BRICK tiles. Walking into an unlit Bomb-Omb hurts the player
// like any other enemy. Walking/standing on the explosion also hurts.
export const BOMB_OMB_SPEED = ENEMY_SPEED * 0.85;
export const BOMB_OMB_FUSE_FRAMES = 90; // 1.5 s

// Stampf-Boss: großer Gegner, der drei Treffer von oben braucht.
export const BOSS_SPEED = ENEMY_SPEED * 0.65;
export const BOSS_HP = 3;
export const BOSS_W = 54;
export const BOSS_H = 50;
export const BOSS_HIT_STUN = 34;   // i-frames nach einem Treffer
export const BOSS_JUMP_FORCE = 10.5;
export const BOSS_JUMP_INTERVAL = 130; // Frames zwischen Sprüngen (Phase 1)
export const BOSS_THROW_INTERVAL = 160; // Frames zwischen Projektil-Würfen (Phase 1)

// Greifhaken: schräg-oben in Blickrichtung schießen, am ersten festen Block
// einhaken und heranziehen.
export const GRAPPLE_RANGE = 7;          // maximale Reichweite in Tiles
export const GRAPPLE_PULL_SPEED = 11;    // Zug-Geschwindigkeit (px/Frame)
export const GRAPPLE_RELEASE_DIST = 22;  // Ablöse-Distanz zum Anker (px)
export const GRAPPLE_DIR_X = 0.6;        // Schuss-Richtung horizontal (Blickrichtung)
export const GRAPPLE_DIR_Y = -0.8;       // Schuss-Richtung vertikal (nach oben)
export const BOMB_EXPLOSION_FRAMES = 24; // 0.4 s
export const BOMB_EXPLOSION_RADIUS = 56;
export const BOMB_EXPLOSION_BRICK_REACH = 1; // tiles around blast center

// ---------------------------------------------------------------------------
// Fire-Flower power-up: third tier above the heart-grow. While in fire
// mode the player can hurl a bouncing fireball with the F key (or the
// mobile fire button). Pressing throws a single shot; cooldown limits
// fire rate. Taking a hit drops fire-mode back to powered (one shrink
// step, like Mario).
export const FIRE_FLOWER_FRAMES = 0; // (no decay — power persists until hit)
export const PLAYER_FIREBALL_SPEED = 6;
export const PLAYER_FIREBALL_BOUNCE = -5;
export const PLAYER_FIREBALL_GRAVITY = 0.55;
export const PLAYER_FIREBALL_LIFETIME = 150;
export const PLAYER_FIREBALL_COOLDOWN = 18; // frames between throws
export const PLAYER_FIREBALL_KILL_SCORE = 200;

// Münz-Magnet: 6 s window where every Coin within MAGNET_RANGE is pulled
// toward the player at MAGNET_PULL_SPEED. Visual: gentle yellow halo
// around the player.
export const MAGNET_DURATION_FRAMES = 360;
export const MAGNET_FADE_FRAMES = 60;
export const MAGNET_RANGE = 200;
export const MAGNET_PULL_SPEED = 5;

// ---------------------------------------------------------------------------
// Stachelkugel (Spike Ball): heavy rolling enemy. Cannot be stomped — top
// contact damages the player like any other side. Falls off ledges. Killed
// only by PlayerFireball, BombExplosion, star-mode contact, or shells.
// ---------------------------------------------------------------------------
export const SPIKE_BALL_SPEED = ENEMY_SPEED * 0.7;
export const SPIKE_BALL_ROLL_RATE = 0.18; // radians per frame at full speed

// ---------------------------------------------------------------------------
// Hornisse (Hornet): flying enemy that drifts in a sine wave. When the
// player enters HORNET_AGGRO_RANGE, the hornet dives toward them with
// HORNET_DIVE_SPEED. Stompable from above, contact damages otherwise.
// ---------------------------------------------------------------------------
export const HORNET_SPEED = 1.2;
export const HORNET_AMPLITUDE = 22;
export const HORNET_FLY_SPEED = 0.05;
export const HORNET_DIVE_SPEED = 3.2;
export const HORNET_AGGRO_RANGE = 180;

// ---------------------------------------------------------------------------
// Schmetterlingsumhang (Cape / Glider) ability: while held jump in the
// air during a fall, gravity is replaced with CAPE_GLIDE_GRAVITY and the
// fall speed is capped at CAPE_GLIDE_MAX_FALL. Cape is lost on hit
// (after fire-mode is consumed in the damage cascade).
// ---------------------------------------------------------------------------
export const CAPE_GLIDE_GRAVITY = 0.06;
export const CAPE_GLIDE_MAX_FALL = 1.6;

// ---------------------------------------------------------------------------
// Schutzschild-Blase (Shield Bubble) gadget: absorbs the next hit. While
// shieldCharges > 0 the player has a translucent aura. On hit the bubble
// pops (sparkle particles + brief i-frame) and shieldCharges drops to 0.
// ---------------------------------------------------------------------------
export const SHIELD_POP_IFRAMES = 60;

// ---------------------------------------------------------------------------
// Zeitlupen-Uhr (Slow-Time Clock) gadget: while slowTimer > 0 every
// freezable enemy + their projectiles skip their update entirely. Player
// wades through the frozen tableau. Star + Clock stack cleanly.
// ---------------------------------------------------------------------------
export const CLOCK_DURATION_FRAMES = 240; // 4 s

export enum GameState {
  TITLE = 'title',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  LEVEL_COMPLETE = 'level_complete',
}

export enum TileType {
  EMPTY = 0,
  GROUND = 1,
  GROUND_TOP = 2,
  GROUND_LEFT = 3,
  GROUND_RIGHT = 4,
  GROUND_TOP_LEFT = 5,
  GROUND_TOP_RIGHT = 6,
  PLATFORM = 7,
  QUESTION_BLOCK = 8,
  QUESTION_BLOCK_USED = 9,
  BRICK = 10,
  PIPE_TOP_LEFT = 11,
  PIPE_TOP_RIGHT = 12,
  PIPE_BODY_LEFT = 13,
  PIPE_BODY_RIGHT = 14,
  DECORATION_VINE = 15,
  DECORATION_FLOWER = 16,
  WATER_TOP = 17,
  WATER = 18,
  STONE = 19,
  WOOD_PLATFORM = 20,
  MOSS_GROUND = 21,
  LAVA_TOP = 22,
  LAVA = 23,
  ICE = 24,
  ICE_TOP = 25,
  CASTLE_STONE = 26,
  CASTLE_TOP = 27,
  SPACE_METAL = 28,
  SPACE_TOP = 29,
  DEEP_WATER = 30,
  SEAWEED = 31,
  SPIKE = 32,
  SIGN = 33,
  // Task #31 — Neue Level-Gimmicks.
  NOTE_BLOCK = 34,      // solid; spielerisch federnd (Bounce)
  DONUT_BLOCK = 35,     // solid; bricht nach DONUT_FALL_DELAY weg
  INVISIBLE_BLOCK = 36, // unsichtbar; nicht solid (nur Decken-Hit per hit_block)
  COIN_TILE = 37,       // nicht solid; Aufsammeln gibt Coin (P-Switch)
  // 45° slopes (non-solid; resolved via a height-map post-step in physics).
  // RIGHT rises toward the right, LEFT rises toward the left.
  SLOPE_RIGHT_45 = 38,
  SLOPE_LEFT_45 = 39,
  // Theme-abhängige, nicht-solide Boden-Deko (Farn/Muschel/Kristall/…).
  DECORATION_PROP = 40,
  // Kletterseil (nicht solid): Spielerin klinkt sich ein und klettert vertikal.
  ROPE = 41,
}

// Kletter-Geschwindigkeit am Seil (px/frame).
export const CLIMB_SPEED = 2.2;

// Schwing-Ringe (getriebenes Pendel): Amplitude (rad, sanft, bleibt in der Grube)
// + Antriebsrate pro Frame. Das Loslassen gibt einen festen Vorwärts-Absprung.
export const SWING_AMP = 0.4;
export const SWING_DRIVE = 0.045;
export const SWING_RELEASE_VX = 6.5; // Vorwärts-Schub beim Loslassen
export const SWING_RELEASE_VY = -6.5;

// Tarzan-Schwingseile (getriebenes Pendel, weiter als die Ringe): Man greift ein
// Seil in der Luft, hängt sich dran, schwingt mit und lässt im richtigen Moment
// los. Der Absprung folgt dem Schwung (Tangential-Impuls * Boost) — im tiefsten
// Punkt loslassen fliegt am weitesten (Tarzan-Timing). VINE_MIN_* garantiert
// einen fairen Mindest-Absprung, damit auch schlechtes Timing herüberkommt.
export const ROPE_SWING_AMP = 0.85;
export const ROPE_SWING_DRIVE = 0.05;
export const VINE_RELEASE_BOOST = 2.6;   // Impuls-Verstärkung beim Loslassen
export const VINE_RELEASE_VX_CAP = 13;   // Deckel für den Vorwärts-Schub
export const VINE_RELEASE_POP = -3.5;     // zusätzlicher Aufwärts-Pop (Bogen)
export const VINE_MIN_VX = 4.5;           // fairer Mindest-Vorwärts-Schub
// Seil-Absprung: klarer Sprung mit Bogen (fester Aufwärts- + Vorwärts-Schub),
// damit man vom Seil sauber wegspringt und das nächste Seil erreicht.
export const VINE_JUMP_VY = -10.5;        // kräftiger Aufwärts-Bogen (echter Sprung)
export const VINE_JUMP_VX = 7.5;          // fester Vorwärts-Schub Richtung nächstes Seil
export const VINE_GRAB_COOLDOWN = 14;     // Frames nach Absprung ohne erneutes Greifen

export const PIRANHA_SPEED = 0.8;
export const PIRANHA_HIDE_TIME = 120;
export const PIRANHA_SHOW_TIME = 90;
export const SPIDER_SPEED = 1.8;
export const SPIDER_DROP_SPEED = 3.5;

export const CRAB_SPEED = 1.0;
export const JELLYFISH_SPEED = 0.8;
export const JELLYFISH_FLY_AMPLITUDE = 35;
export const JELLYFISH_FLY_SPEED = 0.025;
export const KANGAROO_SPEED = 1.6;
export const KANGAROO_JUMP_FORCE = -8;
export const KANGAROO_JUMP_INTERVAL = 90;

// Eisreh (Wald-Gegner): trabt gemächlich und macht ab und zu einen sanften,
// gut vorhersehbaren Satz — kinderfreundlich für Level 3.
export const DEER_SPEED = 1.15;
export const DEER_JUMP_FORCE = -7;
export const DEER_JUMP_INTERVAL = 150;
export const SNAKE_SPEED = 2.0;
// Baby-Drachen (Welt 16): hüpfen aktiv Richtung Spielerin (etwas fordernder),
// stampfbar, schaden bei Berührung. Ei schlüpft bei Annäherung.
export const BABY_DRAGON_SPEED = 1.9;
export const BABY_DRAGON_JUMP_FORCE = -7.5;
export const BABY_DRAGON_JUMP_INTERVAL = 70;
export const BABY_DRAGON_AGGRO = 300;
export const DRAGON_EGG_HATCH_RANGE = 96;   // ~3 Tiles: kurz davor schlüpft es
export const DRAGON_EGG_CRACK_FRAMES = 26;  // Riss-Animation vor dem Schlüpfen

export const FIREBALL_SPEED = 4;
export const FIREBALL_LIFETIME = 240;
export const GHOST_SPEED = 1.0;
export const GHOST_FLY_AMPLITUDE = 28;
export const GHOST_FLY_SPEED = 0.028;

// Banzai Bill — riesiges horizontales Geschoss aus SMW. Driftet
// schwerelos in eine feste Richtung (vom Level vorgegeben), kann von
// oben gestompt werden, alle anderen Berührungen schaden. Aktiviert
// erst wenn der Spieler in Sichtweite kommt.
export const BANZAI_BILL_SPEED = 1.5;
export const BANZAI_BILL_SIZE = 64;
export const BANZAI_BILL_AGGRO_RANGE = 480;

// Chargin' Chuck — gepanzerter Footballer aus SMW. Schlendert
// langsam in eine Richtung, sieht er den Spieler in Reichweite,
// sprintet er mit Vollgas auf ihn zu. Braucht drei Stomps, weil
// sein Helm den ersten zweimal abfängt; jeder Treffer betäubt ihn
// kurz, in der Stun-Phase ist er ungefährlich.
export const CHUCK_WALK_SPEED = 1.0;
export const CHUCK_CHARGE_SPEED = 3.6;
export const CHUCK_AGGRO_RANGE = 240;
export const CHUCK_HITS_TO_KILL = 3;
export const CHUCK_STUN_FRAMES = 30;

// Big Boo — riesiger Geist aus SMW. Bewegt sich nur, wenn der
// Spieler NICHT in seine Richtung schaut. Schaut der Spieler hin,
// hält er die Hände vors Gesicht und wird intangibel (ihn berühren
// schadet nicht, ihn stompen kann man auch nicht — pure Ausweich-
// Mechanik). Stompbar von oben, sonst normaler Schaden.
export const BIG_BOO_SPEED = 1.4;
export const BIG_BOO_SIZE = 56;
export const BIG_BOO_ACTIVATE_DISTANCE = 360;
export const FISH_SPEED = 1.2;
export const FISH_FLY_AMPLITUDE = 24;
export const FISH_FLY_SPEED = 0.035;

export enum EntityType {
  PLAYER = 'player',
  GOOMBA = 'goomba',
  KOOPA = 'koopa',
  BOSS = 'boss',
  BAT = 'bat',
  PIRANHA = 'piranha',
  SPIDER = 'spider',
  CRAB = 'crab',
  JELLYFISH = 'jellyfish',
  KANGAROO = 'kangaroo',
  SNAKE = 'snake',
  FIREBALL = 'fireball',
  GHOST = 'ghost',
  FISH = 'fish',
  COIN = 'coin',
  COIN_SPINNING = 'coin_spinning',
  SPECIAL_COIN = 'special_coin',
  POWERUP = 'powerup',
  STAR = 'star',
  WIZARD = 'wizard',
  MAGIC_BOLT = 'magic_bolt',
  BOMB_OMB = 'bomb_omb',
  BOMB_EXPLOSION = 'bomb_explosion',
  FIRE_FLOWER = 'fire_flower',
  COIN_MAGNET = 'coin_magnet',
  PLAYER_FIREBALL = 'player_fireball',
  SPIKE_BALL = 'spike_ball',
  HORNET = 'hornet',
  BANZAI_BILL = 'banzai_bill',
  CHARGIN_CHUCK = 'chargin_chuck',
  BIG_BOO = 'big_boo',
  APE = 'ape',
  COCONUT = 'coconut',
  SEAGULL = 'seagull',
  LAVA_SLIME = 'lava_slime',
  YETI = 'yeti',
  DRAGON_EGG = 'dragon_egg',
  BABY_DRAGON = 'baby_dragon',
  SNOWBALL = 'snowball',
  KNIGHT = 'knight',
  DEER = 'deer',
  MINI_UFO = 'mini_ufo',
  UFO_LASER = 'ufo_laser',
  CAPE = 'cape',
  WINGS = 'wings',
  SHIELD = 'shield',
  CLOCK = 'clock',
  // Task #31 — Neue Level-Gimmicks (Plattformen, Tragobjekte, Schalter).
  MOVING_PLATFORM = 'moving_platform',
  SPRING_STONE = 'spring_stone',
  CRATE = 'crate',
  P_SWITCH = 'p_switch',
  DOOR = 'door',
  FIRE_BARRIER = 'fire_barrier',
  FLAG = 'flag',
  FLAG_POLE = 'flag_pole',
  PARTICLE = 'particle',
  FLOATING_TEXT = 'floating_text',
}

export enum Direction {
  LEFT = -1,
  RIGHT = 1,
}

export type ThemeName =
  | 'jungle' | 'cave' | 'sky' | 'beach' | 'australia'
  | 'volcano' | 'ice' | 'castle' | 'underwater' | 'space' | 'school' | 'gym' | 'trampoline' | 'bluefield' | 'plush'
  | 'dragon' | 'forest';

export const THEME_NAMES: ThemeName[] = [
  'jungle', 'cave', 'sky', 'beach', 'australia',
  'volcano', 'ice', 'castle', 'underwater', 'space', 'school', 'gym', 'trampoline', 'bluefield', 'plush', 'dragon', 'forest',
];

// ---------------------------------------------------------------------------
// Theme-spezifische Gegner (Task #18)
// ---------------------------------------------------------------------------
// Affe (Jungle): wirft Kokosnüsse im Bogen
export const APE_THROW_INTERVAL = 120;
export const APE_AGGRO_RANGE = 320;
export const COCONUT_SPEED = 3.5;
export const COCONUT_GRAVITY = 0.4;
export const COCONUT_LIFETIME = 200;

// Möwe (Beach): kreist und stürzt herab
export const SEAGULL_SPEED = 1.4;
export const SEAGULL_AMPLITUDE = 18;
export const SEAGULL_FLY_SPEED = 0.04;
export const SEAGULL_DIVE_SPEED = 4.5;
export const SEAGULL_AGGRO_RANGE = 220;

// Lava-Slime (Volcano): hüpft langsam
export const LAVA_SLIME_HOP_INTERVAL = 75;
export const LAVA_SLIME_HOP_FORCE = -7.5;
export const LAVA_SLIME_SPEED = 0.6;

// Schneeball-Yeti (Ice): rollt Schneebälle
export const YETI_SPEED = 0.7;
export const YETI_THROW_INTERVAL = 160;
export const YETI_AGGRO_RANGE = 320;
export const YETI_HITS_TO_KILL = 2;
export const YETI_STUN_FRAMES = 30;
export const SNOWBALL_SPEED = 2.6;
export const SNOWBALL_GROW_RATE = 0.04;
export const SNOWBALL_START_SIZE = 18;
export const SNOWBALL_MAX_SIZE = 40;
export const SNOWBALL_LIFETIME = 240;

// Rüstungs-Ritter (Castle): 2 Stomps, seitliches Schild
export const KNIGHT_SPEED = 0.8;
export const KNIGHT_HITS_TO_KILL = 2;
export const KNIGHT_STUN_FRAMES = 30;
export const KNIGHT_RECOIL_FORCE = 5;

// Mini-UFO (Space): jagt und schießt Laser
export const MINI_UFO_SPEED = 1.8;
export const MINI_UFO_HOVER_HEIGHT = 96;
export const MINI_UFO_LASER_INTERVAL = 130;
export const MINI_UFO_AGGRO_RANGE = 320;
export const UFO_LASER_SPEED = 5;
export const UFO_LASER_LIFETIME = 80;

// --- Spielbarkeit & Fairness (Task #29) ---
// Dauer der Level-Intro-Karte (1.2 s @ 60 fps).
export const LEVEL_INTRO_FRAMES = 72;
// Punkte pro verbleibender Sekunde — beim Levelende als Zeit-Bonus gutgeschrieben.
export const TIME_BONUS_PER_TIME = 50;
// Animationsdauer für die Zeit-Bonus-Tickerei am Levelende.
export const TIME_BONUS_DURATION_FRAMES = 30;

// --- Sonder-Münzen + Sterne-Rating (Task #30) ---
// Punkte pro eingesammelter Sonder-Münze. Werden direkt auf player.score
// addiert, fließen NICHT in coinsThisLevel/lifetimeCoins (es sind keine
// regulären Münzen, sondern Sammelobjekte).
export const SPECIAL_COIN_VALUE = 1000;
// Schwellwert (verbleibende Sekunden beim Flag-Touch) für den Zeit-Stern.
// Jede Welt hat LEVEL_TIME=300 Sekunden — wer das Level mit ≥200s beendet
// hat <100s gebraucht und bekommt den dritten Stern.
export const STAR_TIME_THRESHOLD = 200;
// Anzahl Sonder-Münzen pro Level (fest verdrahtet — Levels deklarieren
// genau drei Tile-Koordinaten in `specialCoins`).
export const SPECIAL_COINS_PER_LEVEL = 3;

// --- Neue Level-Gimmicks (Task #31) ---
// Note-Block: Spielerin landet → Bounce nach oben; Kopfstoß → Bounce nach unten.
export const NOTE_BLOCK_BOUNCE_FORCE = -12;
export const NOTE_BLOCK_HEAD_BOUNCE_FORCE = 8;
// Donut-Block: bröselt nach DONUT_FALL_DELAY Frames Standzeit weg.
export const DONUT_FALL_DELAY = 30;
// P-Switch: tausch BRICK ↔ COIN_TILE für 8 Sekunden.
export const P_SWITCH_DURATION_FRAMES = 480;
// SpringStone: Wurf-Geschwindigkeit beim Aufgeben.
export const SPRING_STONE_THROW_SPEED = 8;
// MovingPlatform-Default — kann im Level-Spec überschrieben werden.
export const MOVING_PLATFORM_SPEED = 1.2;
