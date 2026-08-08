import { audio } from '../audio';

/**
 * Bootstrap WebAudio on the first user gesture (browsers require this).
 *
 * Hardening notes:
 * - Wires both window AND document listeners (capture phase) so a focused
 *   button or overlay div can't swallow the gesture before us.
 * - audio.resume() returns a Promise on Chromium/Safari. We await it and
 *   only mark the bootstrap "done" once the AudioContext is actually in
 *   the `running` state. If resume rejects (rare; usually because the
 *   browser still considers the gesture insufficient), we keep the
 *   listeners attached so the *next* gesture retries automatically.
 * - The teardown returned to the engine clears all listeners cleanly so
 *   React hot-reloads / remounts don't leak handlers.
 */
export function installAudioBootstrap(onInit: () => void): () => void {
  let inited = false;

  const onFirstGesture = () => {
    if (inited) return;
    const ctxBefore = (audio as unknown as { ctx?: AudioContext }).ctx;
    try {
      // Skip re-init if we already have a context (avoids duplicate
      // graph construction when several gestures arrive before the
      // browser flips state to 'running').
      if (!ctxBefore) audio.init();
      // resume() returns a Promise on Chromium/Safari. We swallow
      // rejections so the next gesture can retry — listeners stay
      // armed until the context actually reaches 'running'.
      const maybe = audio.resume() as unknown;
      if (maybe && typeof (maybe as Promise<void>).then === 'function') {
        (maybe as Promise<void>).catch(() => { /* retry on next gesture */ });
      }
    } catch {
      return; // Try again on the next gesture.
    }
    // Confirm the context actually started. resume() is async on most
    // browsers, so we poll briefly before declaring success.
    const confirm = () => {
      const ctx = (audio as unknown as { ctx?: AudioContext }).ctx;
      if (ctx && ctx.state === 'running') {
        inited = true;
        onInit();
        teardown();
      }
      // Otherwise leave the listeners attached so the next gesture
      // retries automatically.
    };
    confirm();
    setTimeout(confirm, 50);
  };

  const teardown = () => {
    window.removeEventListener('keydown', onFirstGesture, true);
    window.removeEventListener('pointerdown', onFirstGesture, true);
    window.removeEventListener('touchstart', onFirstGesture, true);
    document.removeEventListener('keydown', onFirstGesture, true);
    document.removeEventListener('pointerdown', onFirstGesture, true);
    document.removeEventListener('touchstart', onFirstGesture, true);
  };

  window.addEventListener('keydown', onFirstGesture, true);
  window.addEventListener('pointerdown', onFirstGesture, true);
  window.addEventListener('touchstart', onFirstGesture, true);
  document.addEventListener('keydown', onFirstGesture, true);
  document.addEventListener('pointerdown', onFirstGesture, true);
  document.addEventListener('touchstart', onFirstGesture, true);
  return teardown;
}
