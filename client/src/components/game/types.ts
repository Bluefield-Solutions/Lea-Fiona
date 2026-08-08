import type React from 'react';

export interface HudStats {
  lives: number;
  coins: number;
  score: number;
  time: number;
  // Mario-feel: P-meter UI state pulled straight from engine.getStats().
  isPCharged: boolean;
  runChargePct: number;
  // Superkraft-Ladungen (0..3) für die HUD-/Button-Anzeige.
  superCharges?: number;
  // Sonder-Münzen (Task #30): Slot-Status für die HUD-Pille "★ X/3" und
  // letzte Sterne-Bewertung des abgeschlossenen Levels (0..3).
  specialCoins?: [boolean, boolean, boolean];
  lastLevelStars?: number;
}

export interface LevelInfo {
  index: number;
  name: string;
  hasNext: boolean;
  nextName: string | null;
}

// One of: 'profiles' | 'settings' | 'album' | null. Modals are mutually
// exclusive — opening one closes the others to keep focus management
// simple and predictable for keyboard users.
export type ModalKind = null | 'profiles' | 'settings' | 'album';

export interface PadProps {
  children: React.ReactNode;
  testId: string;
  small?: boolean;
  onActivate: (active: boolean) => void;
}
