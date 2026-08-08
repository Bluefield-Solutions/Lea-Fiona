import type React from 'react';
import { getSettings } from '../../game/storage';

export function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

// Vibration is gated by the per-profile setting so a parent can silence
// haptics without muting audio. Reads settings on every call — cheap.
export function vibrate(ms: number) {
  try {
    if (!getSettings().vibration) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch { /* ignore */ }
}

export function smallBtn(bg: string): React.CSSProperties {
  return {
    padding: '4px 10px',
    background: bg,
    color: bg === '#555' ? '#aaa' : '#1a1a1a',
    border: 'none',
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    cursor: bg === '#555' ? 'not-allowed' : 'pointer',
  };
}
