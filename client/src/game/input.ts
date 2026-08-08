export class InputManager {
  keys: Map<string, boolean> = new Map();
  private justPressedKeys: Map<string, boolean> = new Map();
  private previousKeys: Map<string, boolean> = new Map();

  touchLeft = false;
  touchRight = false;
  touchJump = false;
  touchRun = false;
  // New: dedicated "down" / duck-slide button for the mobile gamepad.
  // Behaves like ArrowDown so the engine's existing `down` getter sees it.
  touchDown = false;
  // Dedicated mobile button to throw a fireball when the player is in
  // fire-mode. Mirrors the keyboard 'F' key.
  touchFire = false;
  touchSuper = false;
  touchJumpJustPressed = false;
  touchFireJustPressed = false;
  touchSuperJustPressed = false;
  touchDash = false;
  touchDashJustPressed = false;
  touchGrapple = false;
  touchGrappleJustPressed = false;
  prevTouchGrapple = false;
  private prevTouchDash = false;
  private prevTouchJump = false;
  private prevTouchFire = false;
  private prevTouchSuper = false;
  // Doppeltipp in eine Richtung = Rennen (Tastatur). Frame-Zähler, Zeitpunkte
  // des letzten Links-/Rechts-Tipps und die aktuell aktive Lauf-Richtung.
  private frame = 0;
  private lastTapLeft = -100;
  private lastTapRight = -100;
  private doubleTapRunDir: 'left' | 'right' | null = null;
  isMobile = false;
  // Listener handles retained so dispose() can detach them on engine
  // shutdown / hot-reload. Avoids leaking duplicate keydown handlers
  // every time the React layer remounts during dev.
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onBlur: () => void;

  constructor() {
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    this.onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Shift', 'Enter', 'Escape', 'p', 'P',
           'a', 'A', 'd', 'D', 'w', 'W', 's', 'S', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
           'm', 'M', 'f', 'F', 'Alt'].includes(e.key)) {
        e.preventDefault();
      }
      this.keys.set(e.key, true);
    };
    this.onKeyUp = (e: KeyboardEvent) => {
      this.keys.set(e.key, false);
    };
    this.onBlur = () => {
      this.keys.clear();
      this.touchLeft = false;
      this.touchRight = false;
      this.touchJump = false;
      this.touchRun = false;
      this.touchDown = false;
      this.touchFire = false;
      this.touchSuper = false;
    };
    // Listen on BOTH window (capture phase) and document so a focused button,
    // overlay div, or iframe-hosted preview doesn't swallow the keydown
    // before it reaches us.
    window.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('keyup', this.onKeyUp, true);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  /** Detach all global listeners. Called by GameEngine.stop(). */
  dispose() {
    window.removeEventListener('keydown', this.onKeyDown, true);
    window.removeEventListener('keyup', this.onKeyUp, true);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.keys.clear();
    this.previousKeys.clear();
    this.justPressedKeys.clear();
    this.resetTouchState();
  }

  update() {
    this.justPressedKeys.clear();
    const allKeys = new Set<string>();
    this.keys.forEach((_v, k) => allKeys.add(k));
    this.previousKeys.forEach((_v, k) => allKeys.add(k));
    allKeys.forEach((key) => {
      if (this.keys.get(key) === true && this.previousKeys.get(key) !== true) {
        this.justPressedKeys.set(key, true);
      }
    });
    this.previousKeys = new Map(this.keys);

    this.touchJumpJustPressed = this.touchJump && !this.prevTouchJump;
    this.prevTouchJump = this.touchJump;

    this.touchFireJustPressed = this.touchFire && !this.prevTouchFire;
    this.prevTouchFire = this.touchFire;
    this.touchSuperJustPressed = this.touchSuper && !this.prevTouchSuper;
    this.prevTouchSuper = this.touchSuper;
    this.touchDashJustPressed = this.touchDash && !this.prevTouchDash;
    this.prevTouchDash = this.touchDash;
    this.touchGrappleJustPressed = this.touchGrapple && !this.prevTouchGrapple;
    this.prevTouchGrapple = this.touchGrapple;

    // ── Doppeltipp in eine Richtung = Rennen ────────────────────────
    // Zwei schnelle Tipps derselben Richtungstaste aktivieren den Lauf; er
    // hält an, solange die Richtung gehalten wird, und endet beim Loslassen.
    // Reines Halten löst keinen Lauf aus (nur ein justPressed-Ereignis).
    this.frame++;
    const DT_WINDOW = 16; // Frames (~0,27 s) zwischen den beiden Tipps
    const rightTap = this.justPressed('ArrowRight') || this.justPressed('d') || this.justPressed('D');
    const leftTap = this.justPressed('ArrowLeft') || this.justPressed('a') || this.justPressed('A');
    if (rightTap) {
      if (this.frame - this.lastTapRight <= DT_WINDOW) this.doubleTapRunDir = 'right';
      this.lastTapRight = this.frame;
    }
    if (leftTap) {
      if (this.frame - this.lastTapLeft <= DT_WINDOW) this.doubleTapRunDir = 'left';
      this.lastTapLeft = this.frame;
    }
    if (this.doubleTapRunDir === 'right' && !this.right) this.doubleTapRunDir = null;
    if (this.doubleTapRunDir === 'left' && !this.left) this.doubleTapRunDir = null;
  }

  isDown(key: string): boolean {
    return this.keys.get(key) === true;
  }

  justPressed(key: string): boolean {
    return this.justPressedKeys.get(key) === true;
  }

  get left(): boolean {
    return this.isDown('ArrowLeft') || this.isDown('a') || this.isDown('A') || this.touchLeft;
  }

  get right(): boolean {
    return this.isDown('ArrowRight') || this.isDown('d') || this.isDown('D') || this.touchRight;
  }

  get jump(): boolean {
    return this.isDown('ArrowUp') || this.isDown('w') || this.isDown('W') || this.isDown(' ') || this.touchJump;
  }

  get jumpPressed(): boolean {
    return this.justPressed('ArrowUp') || this.justPressed('w') || this.justPressed('W') || this.justPressed(' ') || this.touchJumpJustPressed;
  }

  get down(): boolean {
    return this.isDown('ArrowDown') || this.isDown('s') || this.isDown('S') || this.touchDown;
  }

  get run(): boolean {
    return this.isDown('Shift') || this.isDown('x') || this.isDown('X') || this.touchRun || this.doubleTapRunDir !== null;
  }

  get enter(): boolean {
    return this.justPressed('Enter') || this.justPressed(' ');
  }

  get pause(): boolean {
    return this.justPressed('Escape') || this.justPressed('p') || this.justPressed('P');
  }

  get muteToggle(): boolean {
    return this.justPressed('m') || this.justPressed('M');
  }

  // Fire-throw key — separate from Run (Shift/X) so sprinting never
  // accidentally launches a fireball.
  get firePressed(): boolean {
    return this.justPressed('f') || this.justPressed('F') || this.touchFireJustPressed;
  }

  // Superkraft-Auslöser — Tasten Q und Alt + Touch-Button.
  get superPressed(): boolean {
    return this.justPressed('q') || this.justPressed('Q') || this.justPressed('Alt') || this.touchSuperJustPressed;
  }

  // Dash („Ship it!") — Taste E + Touch-Button.
  get dashPressed(): boolean {
    return this.justPressed('e') || this.justPressed('E') || this.touchDashJustPressed;
  }

  // Greifhaken — Taste G + Touch-Button.
  get grapplePressed(): boolean {
    return this.justPressed('g') || this.justPressed('G') || this.touchGrappleJustPressed;
  }
  // Greifhaken gehalten (fürs Schwingen am Seil).
  get grappleHeld(): boolean {
    return this.isDown('g') || this.isDown('G') || this.touchGrapple;
  }

  resetTouchState() {
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJump = false;
    this.touchRun = false;
    this.touchDown = false;
    this.touchFire = false;
    this.touchSuper = false;
    this.touchJumpJustPressed = false;
    this.touchFireJustPressed = false;
    this.touchSuperJustPressed = false;
    this.touchDash = false;
    this.touchDashJustPressed = false;
    this.touchGrapple = false;
    this.touchGrappleJustPressed = false;
    this.prevTouchJump = false;
    this.prevTouchFire = false;
    this.prevTouchSuper = false;
  }
}
