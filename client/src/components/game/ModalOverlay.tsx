import React from 'react';

export function ModalOverlay({
  children, title, testId, onClose,
}: {
  children: React.ReactNode;
  title: string;
  testId: string;
  onClose?: () => void;
}) {
  // Click on the dimmed backdrop closes the modal when an onClose is
  // provided (true for user-opened modals; not for game-state overlays
  // like Game Over / Level Complete which are explicit-only).
  const onBackdrop = (e: React.MouseEvent) => {
    if (!onClose) return;
    if (e.target === e.currentTarget) onClose();
  };
  // Focus-trap: cycle Tab / Shift+Tab between the first and last
  // focusable elements inside the dialog so keyboard users can't tab
  // out into the (paused) game beneath. Initial focus moves to the
  // first focusable element on mount; previous focus is restored on
  // unmount.
  const cardRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const getFocusables = () => Array.from(
      card.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const focusables = getFocusables();
    if (focusables.length > 0) focusables[0].focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = getFocusables();
      if (els.length === 0) { e.preventDefault(); return; }
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !card.contains(active)) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (active === last || !card.contains(active)) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    card.addEventListener('keydown', onKey);
    return () => {
      card.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, []);
  return (
    <div
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={onBackdrop}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        style={{
          background: 'rgba(20, 20, 30, 0.95)',
          border: '2px solid rgba(255,215,0,0.5)',
          borderRadius: 12,
          padding: '22px 28px',
          color: '#fff',
          textAlign: 'center',
          minWidth: 280,
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          outline: 'none',
        }}
      >
        <h2 style={{ margin: '0 0 12px', fontSize: 22, color: '#FFD700' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
