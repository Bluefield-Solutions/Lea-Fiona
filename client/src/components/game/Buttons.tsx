import React from 'react';
import type { PadProps } from './types';

export function HudButton({
  children, onClick, testId, title, ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  testId: string;
  title?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      title={title}
      aria-label={ariaLabel ?? title}
      onClick={onClick}
      style={{
        background: 'rgba(0,0,0,0.55)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: 10,
        width: 46,
        height: 46,
        fontSize: 20,
        cursor: 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ children, onClick, testId }: { children: React.ReactNode; onClick: () => void; testId: string }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      style={{
        display: 'block',
        margin: '8px auto',
        padding: '10px 22px',
        background: '#FFD700',
        color: '#1a1a1a',
        border: 'none',
        borderRadius: 8,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        fontSize: 14,
        cursor: 'pointer',
        minWidth: 220,
      }}
    >
      {children}
    </button>
  );
}

export function PadButton({ children, testId, small, onActivate }: PadProps) {
  const [pressed, setPressed] = React.useState(false);
  const set = (v: boolean) => {
    setPressed(v);
    onActivate(v);
  };
  return (
    <button
      type="button"
      data-testid={testId}
      data-pressed={pressed ? 'true' : 'false'}
      aria-label={testId.replace('button-touch-', '')}
      onPointerDown={(e) => {
        // No setPointerCapture: see bindHold comment in game.tsx for why.
        set(true);
        e.preventDefault();
      }}
      onPointerUp={(e) => {
        set(false);
        e.preventDefault();
      }}
      onPointerCancel={() => set(false)}
      // Always release when the pointer leaves this button — combined with
      // onPointerEnter on the sibling, a finger sliding from one button
      // to the next correctly hands off the press.
      onPointerLeave={() => { if (pressed) set(false); }}
      onPointerEnter={(e) => {
        // Picks up an in-flight finger that started on a sibling button.
        if ((e.buttons & 1) === 1 && !pressed) set(true);
      }}
      style={{
        width: small ? 72 : 92,
        height: small ? 72 : 92,
        borderRadius: '50%',
        background: pressed ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)',
        color: pressed ? '#000' : '#fff',
        border: pressed ? '2px solid rgba(255,255,255,0.95)' : '2px solid rgba(255,255,255,0.45)',
        boxShadow: pressed ? 'inset 0 2px 6px rgba(0,0,0,0.35)' : 'none',
        transform: pressed ? 'scale(0.94)' : 'scale(1)',
        transition: 'transform 60ms ease-out, background 60ms ease-out',
        fontSize: small ? 15 : 28,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        cursor: 'pointer',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  );
}
