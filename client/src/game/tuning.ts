/**
 * Central tuning module — re-exports the gameplay-feel constants from
 * constants.ts under one heavily-commented umbrella so balancing the
 * "feel" of the controls (coyote time, jump buffer, P-meter, wall-jump,
 * etc.) is a one-stop affair instead of hunting through multiple files.
 *
 * The actual numeric values still live in constants.ts because many
 * other modules (physics, renderer, entities) import them from there.
 * This module is the *documented* contract that explains what each
 * value means and how it relates to the overall control flow.
 *
 * Tuning recipe (kid-friendly, mid-range mobile target):
 *
 * - Sprünge sollen großzügig sein → COYOTE_TIME ≥ 6 Frames,
 *   JUMP_BUFFER_TIME ≥ 6 Frames. Beide gemeinsam erlauben "fast verpasste"
 *   Sprünge (Springen kurz nach Verlassen einer Kante / kurz vor dem
 *   Aufkommen am Boden).
 * - Variabler Sprung: Solange jump gehalten wird, fügt VARIABLE_JUMP_FRAMES
 *   weiteren Auftrieb hinzu — kurze Tipps = niedrige Sprünge.
 * - P-Meter erfordert P_METER_FRAMES Frames Vollsprint, gibt anschließend
 *   P_METER_JUMP_BOOST × Standard-Sprungkraft (verbraucht beim Sprung).
 * - Wall-Jump: WALL_JUMP_LOCKOUT_FRAMES verhindert direktes Re-Greifen.
 *   Eingaben werden via JUMP_BUFFER_TIME gepuffert, sodass der nächste
 *   Wand-Sprung nach Ablauf der Lockout-Phase trotzdem feuert.
 */

export {
  // Beschleunigung & Geschwindigkeit
  PLAYER_SPEED, PLAYER_RUN_SPEED, ACCELERATION, RUN_ACCELERATION,
  AIR_ACCELERATION, AIR_ACCELERATION_LOCKED, FRICTION, AIR_FRICTION,
  ICE_FRICTION, SLIDE_FRICTION, DUCK_SPEED_MULT, SKID_DECEL_MULT,
  // Sprünge
  PLAYER_JUMP_FORCE, PLAYER_BOUNCE_FORCE, BOUNCE_BOOST_MULT,
  COYOTE_TIME, JUMP_BUFFER_TIME, VARIABLE_JUMP_FRAMES, APEX_THRESHOLD,
  // P-Meter / Sprint-Boost
  P_METER_FRAMES, P_METER_JUMP_BOOST,
  // Wall-Jump / Wall-Slide
  WALL_JUMP_LOCKOUT_FRAMES, WALL_JUMP_X_FACTOR, WALL_JUMP_Y_FACTOR,
  WALL_SLIDE_MAX_FALL,
  // Ground-Pound
  GROUND_POUND_SPEED, GROUND_POUND_MIN_AIRTIME, GROUND_POUND_LOCK_FRAMES,
  GROUND_POUND_RADIUS,
  // Sonstige
  GRAVITY, GRAVITY_FALLING, GRAVITY_APEX, MAX_FALL_SPEED, STOMP_FORGIVENESS,
} from './constants';
