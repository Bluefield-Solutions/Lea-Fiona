import { useEffect, useRef, useState } from 'react';
import leaStand from '@assets/lea_n00_stand.webp';
import fionaStand from '@assets/fiona_01.webp';
import { STEPHAN_FRAME_URLS } from '../../game/assets/stephanSprites';
import { SLOTS, itemsInSlot, slotMeta, getWardrobeItem, type WardrobeSlot } from '../../game/wardrobe';
import {
  getWalletCoins, getTotalStars, ownsItem, getEquippedInSlot, getEquippedSlots,
  buyItem, setEquippedInSlot,
} from '../../game/storage';
import { drawCosmeticHat, drawCosmeticGlasses, drawCosmeticAccessory } from '../../game/engine_internal/render';
import { audio } from '../../game/audio';

type Character = 'fiona' | 'lea' | 'stephan';
type Filter = 'alle' | 'bezahlbar' | 'besessen';

// Ankleide-Vorschau je Figur: Basis-Stand-Sprite + Hut-Anker (proportional wie
// im Spiel: headTop ~6 % von oben, Skalierung = Körperbreite). Die Werte sind je
// Sprite fein justiert, damit Hüte sauber sitzen.
const PREVIEW: Record<Character, { src: string; aspect: number; headTopFrac: number; wFrac: number; eyeYFrac: number; glassesWFrac: number; neckYFrac: number; accWFrac: number }> = {
  lea: { src: leaStand, aspect: 204 / 240, headTopFrac: 0.05, wFrac: 0.60, eyeYFrac: 0.165, glassesWFrac: 0.44, neckYFrac: 0.30, accWFrac: 0.52 },
  fiona: { src: fionaStand, aspect: 144 / 220, headTopFrac: 0.06, wFrac: 0.72, eyeYFrac: 0.185, glassesWFrac: 0.52, neckYFrac: 0.32, accWFrac: 0.60 },
  stephan: { src: STEPHAN_FRAME_URLS[0], aspect: 157 / 176, headTopFrac: 0.07, wFrac: 0.62, eyeYFrac: 0.205, glassesWFrac: 0.46, neckYFrac: 0.36, accWFrac: 0.52 },
};

const PREVIEW_H = 210;

// Bild-Layer-Cache (KI-Assets): einmal je Quelle laden, bei Fertigstellung neu
// zeichnen. Modulweit, damit er über Re-Renders/Slot-Wechsel erhalten bleibt.
const layerImgCache = new Map<string, HTMLImageElement>();
function getLayerImage(src: string, onReady: () => void): HTMLImageElement {
  let im = layerImgCache.get(src);
  if (!im) { im = new Image(); im.onload = onReady; im.src = src; layerImgCache.set(src, im); }
  return im;
}

/**
 * Boutique (Shop & Ankleide, E2): Reiter je Kleidungs-Slot, Filter, große
 * Ankleide-Vorschau der gewählten Figur mit live getragenem Hut, und
 * Kaufen/Anlegen/Wechseln über die neue Garderobe-API. Körper-Kategorien sind
 * v1 noch leer (Teile kommen mit den KI-Assets, E4) — der Reiter zeigt dann den
 * Kategorie-Hinweis.
 */
export function BoutiquePanel({ character }: { character: Character }) {
  const [, setTick] = useState(0);
  const bump = () => setTick(t => t + 1);
  const [imgTick, setImgTick] = useState(0); // steigt, wenn ein Bild-Layer fertig geladen ist → Preview neu zeichnen
  const [slot, setSlot] = useState<WardrobeSlot>('kopf');
  const [filter, setFilter] = useState<Filter>('alle');

  const wallet = getWalletCoins();
  const stars = getTotalStars();
  const equippedSig = JSON.stringify(getEquippedSlots());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cfg = PREVIEW[character];
  const previewW = Math.round(PREVIEW_H * cfg.aspect);
  // Richtung A: getragenes Outfit ersetzt die Basis-Figur (Bild-Tausch); Overlays
  // (Hut/Brille/Accessoire) werden darüber gezeichnet.
  const outfitSrc = getWardrobeItem(getEquippedInSlot('outfit'))?.img?.[character];
  const baseSrc = outfitSrc ?? cfg.src;

  // Hut-Overlay auf die Vorschau zeichnen (nur der Kopf-Slot ist v1 im Spiel/Preview sichtbar).
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const cx = previewW / 2;
    const equipped = getEquippedSlots();
    // Alle getragenen Teile in Z-Reihenfolge (klein → zuerst/hinten) zeichnen:
    // KI-Bild-Layer deckungsgleich, sonst prozedural (Hut/Brille).
    const ordered = SLOTS.slice().sort((a, b) => a.layer - b.layer);
    for (const sm of ordered) {
      if (sm.slot === 'outfit') continue; // Outfit = Basis-Bild (via <img>), kein Canvas-Overlay
      const id = equipped[sm.slot];
      if (!id) continue;
      const item = getWardrobeItem(id);
      const src = item?.img?.[character];
      if (src) {
        const im = getLayerImage(src, () => setImgTick(t => t + 1));
        if (im.complete && im.naturalWidth > 0) ctx.drawImage(im, 0, 0, previewW, PREVIEW_H);
      } else if (sm.slot === 'kopf') {
        drawCosmeticHat(ctx, id, cx, PREVIEW_H * cfg.headTopFrac, previewW * cfg.wFrac, 1);
      } else if (sm.slot === 'brille') {
        drawCosmeticGlasses(ctx, id, cx, PREVIEW_H * cfg.eyeYFrac, previewW * cfg.glassesWFrac, 1);
      } else if (sm.slot === 'accessoire') {
        drawCosmeticAccessory(ctx, id, cx, PREVIEW_H * cfg.neckYFrac, previewW * cfg.accWFrac, 1);
      }
    }
  }, [equippedSig, character, previewW, cfg, imgTick]);

  const onBuy = (id: string, price: number, s: WardrobeSlot, starReq: number) => {
    const res = buyItem(id, price, s, starReq);
    if (res === 'ok') { audio.playSfx('oneUp'); bump(); }
    else audio.playSfx('select');
  };
  const onEquip = (s: WardrobeSlot, id: string | null) => {
    setEquippedInSlot(s, id);
    audio.playSfx('select');
    bump();
  };

  const meta = slotMeta(slot);
  let items = itemsInSlot(slot);
  if (filter === 'bezahlbar') items = items.filter(i => !ownsItem(i.id) && wallet >= i.price && stars >= (i.starCost ?? 0));
  else if (filter === 'besessen') items = items.filter(i => ownsItem(i.id));

  return (
    <div data-testid="boutique-panel" style={{ textAlign: 'left' }}>
      <style>{`
        @keyframes shopPop { 0%{transform:scale(0.7);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        .bq-card { transition: transform 0.15s ease; }
        .bq-card:hover { transform: translateY(-3px) scale(1.03); }
        .bq-tab { transition: all 0.14s ease; }
      `}</style>

      {/* Kopf: Ankleide-Vorschau + Wallet/Sterne */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap', alignItems: 'stretch' }}>
        {/* Ankleide-Figur */}
        <div style={{
          position: 'relative', flex: '0 0 auto', width: previewW + 28, minHeight: PREVIEW_H + 20,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '10px 14px',
          borderRadius: 16, background: 'radial-gradient(120% 100% at 50% 15%, rgba(122,162,247,0.22), rgba(16,12,34,0.35))',
          border: '2px solid rgba(255,255,255,0.14)',
        }}>
          <div style={{ position: 'relative', width: previewW, height: PREVIEW_H }}>
            <img src={baseSrc} alt="Ankleide-Figur" draggable={false} style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'contain', imageRendering: 'auto',
            }} />
            <canvas ref={canvasRef} width={previewW} height={PREVIEW_H} style={{
              position: 'absolute', inset: 0, width: previewW, height: PREVIEW_H, pointerEvents: 'none',
            }} />
          </div>
        </div>

        {/* Wallet + Erklärung + Slot-Abnehmen */}
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 190 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            padding: '10px 14px', borderRadius: 14,
            background: 'linear-gradient(160deg,rgba(255,213,74,0.22),rgba(255,158,199,0.16))',
            border: '2px solid #ffd54a',
          }}>
            <span style={{ display: 'flex', gap: 12, whiteSpace: 'nowrap' }}>
              <span data-testid="text-boutique-wallet" style={{ fontSize: 20, fontWeight: 900, color: '#ffd54a' }}>🪙 {wallet}</span>
              <span data-testid="text-boutique-stars" style={{ fontSize: 20, fontWeight: 900, color: '#ffe45e' }}>⭐ {stars}</span>
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.35, color: 'rgba(255,255,255,0.82)', fontWeight: 600 }}>
            Sammle Münzen und kaufe Kleidung! Was du kaufst, trägt deine Figur — und beim nächsten Mal ist es wieder an. ⭐ Premium-Teile brauchen zusätzlich Sterne.
          </p>
          {meta && (
            <button
              type="button"
              data-testid={`button-boutique-unequip-${slot}`}
              onClick={() => onEquip(slot, null)}
              disabled={!getEquippedInSlot(slot)}
              style={{
                marginTop: 'auto', padding: '8px 10px', borderRadius: 12,
                cursor: getEquippedInSlot(slot) ? 'pointer' : 'not-allowed',
                fontSize: 12.5, fontWeight: 800,
                color: getEquippedInSlot(slot) ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.16)',
              }}
            >🚫 {meta.label} abnehmen</button>
          )}
        </div>
      </div>

      {/* Reiter (Slots) */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
        {SLOTS.map(s => {
          const active = s.slot === slot;
          const count = itemsInSlot(s.slot).length;
          return (
            <button
              key={s.slot} type="button" className="bq-tab"
              data-testid={`boutique-tab-${s.slot}`}
              onClick={() => { setSlot(s.slot); audio.playSfx('select'); }}
              style={{
                padding: '7px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: 800,
                color: active ? '#3a2a05' : 'rgba(255,255,255,0.85)',
                background: active ? 'linear-gradient(160deg,#ffd54a,#ffb347)' : 'rgba(255,255,255,0.08)',
                border: `2px solid ${active ? '#ffd54a' : 'rgba(255,255,255,0.16)'}`,
              }}
            >
              {s.label}{count > 0 ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* Filter-Chips */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
        {([['alle', 'Alle'], ['bezahlbar', 'Bezahlbar 🪙'], ['besessen', 'Meine ✓']] as [Filter, string][]).map(([f, label]) => {
          const active = filter === f;
          return (
            <button
              key={f} type="button" data-testid={`boutique-filter-${f}`}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 11px', borderRadius: 999, cursor: 'pointer', fontSize: 11.5, fontWeight: 800,
                color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                background: active ? 'linear-gradient(160deg,#8ad0ff,#5aa9e6)' : 'rgba(255,255,255,0.06)',
                border: `2px solid ${active ? '#8ad0ff' : 'rgba(255,255,255,0.14)'}`,
              }}
            >{label}</button>
          );
        })}
      </div>

      {/* Produkt-Grid oder Kategorie-Hinweis */}
      {items.length === 0 ? (
        <div data-testid="boutique-empty" style={{
          padding: '26px 16px', textAlign: 'center', borderRadius: 16,
          background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.18)',
          color: 'rgba(255,255,255,0.7)', fontSize: 13.5, fontWeight: 700,
        }}>
          {filter !== 'alle' ? 'Keine Teile in diesem Filter.' : (meta?.emptyHint ?? 'Bald verfügbar!')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 12 }}>
          {items.map(c => {
            const isOwned = ownsItem(c.id);
            const isEquipped = getEquippedInSlot(c.slot) === c.id;
            const starReq = c.starCost ?? 0;
            const enoughStars = stars >= starReq;
            const enoughCoins = wallet >= c.price;
            const canBuy = enoughCoins && enoughStars;
            return (
              <div
                key={c.id} data-testid={`boutique-card-${c.id}`} className="bq-card"
                style={{
                  padding: '13px 8px 10px', borderRadius: 16, textAlign: 'center',
                  background: isEquipped
                    ? 'linear-gradient(160deg,#fff7db 0%,#ffe3ef 55%,#e6f0ff 100%)'
                    : isOwned ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)',
                  border: `3px solid ${isEquipped ? '#ffd54a' : isOwned ? 'rgba(255,213,74,0.5)' : 'rgba(255,255,255,0.16)'}`,
                  boxShadow: isEquipped ? '0 4px 14px rgba(255,158,199,0.35)' : 'none',
                }}
              >
                <div style={{ fontSize: 38, marginBottom: 5, lineHeight: 1, animation: 'shopPop 0.4s ease both' }}>{c.emoji}</div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: isOwned ? '#ffe9a8' : 'rgba(255,255,255,0.9)' }}>{c.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: '3px 0 6px', lineHeight: 1.2, minHeight: 24 }}>{c.hint}</div>

                {starReq > 0 && !isOwned && (
                  <div data-testid={`boutique-starreq-${c.id}`} style={{ fontSize: 10.5, fontWeight: 800, marginBottom: 6, color: enoughStars ? '#7cf29b' : '#ff9ea0' }}>
                    {enoughStars ? '✓' : '🔒'} braucht ⭐ {starReq}
                  </div>
                )}

                {!isOwned ? (
                  <button
                    type="button" data-testid={`button-boutique-buy-${c.id}`}
                    onClick={() => onBuy(c.id, c.price, c.slot, starReq)}
                    disabled={!canBuy}
                    title={!enoughStars ? `Du brauchst noch ${starReq - stars} Sterne` : !enoughCoins ? `Du brauchst noch ${c.price - wallet} Münzen` : `Kaufen für ${c.price} Münzen`}
                    style={{
                      width: '100%', padding: '7px 6px', borderRadius: 10,
                      cursor: canBuy ? 'pointer' : 'not-allowed', fontSize: 12.5, fontWeight: 800,
                      color: canBuy ? '#5a3a00' : 'rgba(255,255,255,0.55)',
                      background: canBuy ? 'linear-gradient(160deg,#ffd54a,#ffb347)' : 'rgba(255,255,255,0.08)',
                      border: 'none', opacity: canBuy ? 1 : 0.8,
                    }}
                  >🪙 {c.price}{!canBuy ? ' 🔒' : ''}</button>
                ) : isEquipped ? (
                  <div data-testid={`boutique-equipped-${c.id}`} style={{ width: '100%', padding: '7px 6px', borderRadius: 10, fontSize: 12.5, fontWeight: 900, color: '#6a4a1a', background: 'rgba(255,255,255,0.85)' }}>✓ Angelegt</div>
                ) : (
                  <button
                    type="button" data-testid={`button-boutique-equip-${c.id}`}
                    onClick={() => onEquip(c.slot, c.id)}
                    style={{ width: '100%', padding: '7px 6px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: 800, color: '#fff', background: 'linear-gradient(160deg,#8ad0ff,#5aa9e6)', border: 'none' }}
                  >Anlegen</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
