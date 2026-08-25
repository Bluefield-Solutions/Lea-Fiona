import { useState } from 'react';
import { COSMETICS } from '../../game/cosmetics';
import {
  getWalletCoins, getOwnedCosmetics, getEquippedCosmetic,
  buyCosmetic, setEquippedCosmetic, getTotalStars,
} from '../../game/storage';
import { audio } from '../../game/audio';

/**
 * Kuschel-Shop (Audit F1 „Münz-Senke"): Kinder geben ihre gesammelten Münzen
 * (Wallet = Profile.totalCoins) für Kosmetik-Hüte aus, die dann sichtbar auf
 * der Spielfigur getragen werden. Storage ist die Wahrheit; ein kleiner
 * tick-Counter erzwingt nach Kauf/Anlegen ein Neu-Lesen.
 */
export function ShopPanel() {
  const [, setTick] = useState(0);
  const bump = () => setTick(t => t + 1);

  const wallet = getWalletCoins();
  const stars = getTotalStars();
  const owned = new Set(getOwnedCosmetics());
  const equipped = getEquippedCosmetic();

  const onBuy = (id: string, price: number, starReq: number) => {
    const res = buyCosmetic(id, price, starReq);
    if (res === 'ok') { audio.playSfx('oneUp'); bump(); }
    else { audio.playSfx('select'); } // zu wenig Münzen/Sterne — dezent
  };
  const onEquip = (id: string | null) => {
    setEquippedCosmetic(id);
    audio.playSfx('select');
    bump();
  };

  return (
    <div data-testid="shop-panel" style={{ textAlign: 'left', marginBottom: 12 }}>
      <style>{`
        @keyframes shopPop { 0%{transform:scale(0.7);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        .shop-card { transition: transform 0.15s ease; }
        .shop-card:hover { transform: translateY(-3px) scale(1.03); }
      `}</style>

      {/* Wallet + Erklärung */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, padding: '10px 14px', marginBottom: 12, borderRadius: 14,
        background: 'linear-gradient(160deg,rgba(255,213,74,0.22),rgba(255,158,199,0.16))',
        border: '2px solid #ffd54a',
      }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>
          Münzen kaufen Hüte — Premium-Hüte brauchen zusätzlich Sterne! ⭐
        </span>
        <span style={{ display: 'flex', gap: 12, whiteSpace: 'nowrap' }}>
          <span data-testid="text-shop-wallet" style={{ fontSize: 20, fontWeight: 900, color: '#ffd54a' }}>
            🪙 {wallet}
          </span>
          <span data-testid="text-shop-stars" style={{ fontSize: 20, fontWeight: 900, color: '#ffe45e' }}>
            ⭐ {stars}
          </span>
        </span>
      </div>

      {/* Hut abnehmen */}
      <button
        type="button"
        data-testid="button-shop-unequip"
        onClick={() => onEquip(null)}
        style={{
          width: '100%', marginBottom: 12, padding: '8px 10px', borderRadius: 12,
          cursor: 'pointer', fontSize: 13, fontWeight: 800,
          color: equipped === null ? '#6a4a1a' : 'rgba(255,255,255,0.9)',
          background: equipped === null ? 'linear-gradient(160deg,#fff7db,#ffe3ef)' : 'rgba(255,255,255,0.08)',
          border: `2px solid ${equipped === null ? '#ffd54a' : 'rgba(255,255,255,0.16)'}`,
        }}
      >
        {equipped === null ? '🚫 Kein Hut (angelegt)' : '🚫 Hut abnehmen'}
      </button>

      {/* Kacheln */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 12,
      }}>
        {COSMETICS.map(c => {
          const isOwned = owned.has(c.id);
          const isEquipped = equipped === c.id;
          const starReq = c.starCost ?? 0;
          const enoughStars = stars >= starReq;
          const enoughCoins = wallet >= c.price;
          const canBuy = enoughCoins && enoughStars;
          return (
            <div
              key={c.id}
              data-testid={`shop-card-${c.id}`}
              className="shop-card"
              style={{
                padding: '14px 8px 10px', borderRadius: 16, textAlign: 'center',
                background: isEquipped
                  ? 'linear-gradient(160deg,#fff7db 0%,#ffe3ef 55%,#e6f0ff 100%)'
                  : isOwned ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)',
                border: `3px solid ${isEquipped ? '#ffd54a' : isOwned ? 'rgba(255,213,74,0.5)' : 'rgba(255,255,255,0.16)'}`,
                boxShadow: isEquipped ? '0 4px 14px rgba(255,158,199,0.35)' : 'none',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 6, lineHeight: 1, animation: 'shopPop 0.4s ease both' }}>
                {c.emoji}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: isOwned ? '#ffe9a8' : 'rgba(255,255,255,0.9)' }}>
                {c.name}
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.65)', margin: '3px 0 6px', lineHeight: 1.2, minHeight: 26 }}>
                {c.hint}
              </div>

              {/* Sterne-Voraussetzung (nur Premium-Hüte). */}
              {starReq > 0 && !isOwned && (
                <div
                  data-testid={`shop-starreq-${c.id}`}
                  style={{
                    fontSize: 11, fontWeight: 800, marginBottom: 6,
                    color: enoughStars ? '#7cf29b' : '#ff9ea0',
                  }}
                >
                  {enoughStars ? '✓' : '🔒'} braucht ⭐ {starReq}
                </div>
              )}

              {!isOwned ? (
                <button
                  type="button"
                  data-testid={`button-shop-buy-${c.id}`}
                  onClick={() => onBuy(c.id, c.price, starReq)}
                  disabled={!canBuy}
                  title={
                    !enoughStars ? `Du brauchst noch ${starReq - stars} Sterne`
                    : !enoughCoins ? `Du brauchst noch ${c.price - wallet} Münzen`
                    : `Kaufen für ${c.price} Münzen`
                  }
                  style={{
                    width: '100%', padding: '7px 6px', borderRadius: 10,
                    cursor: canBuy ? 'pointer' : 'not-allowed',
                    fontSize: 12.5, fontWeight: 800,
                    color: canBuy ? '#5a3a00' : 'rgba(255,255,255,0.55)',
                    background: canBuy ? 'linear-gradient(160deg,#ffd54a,#ffb347)' : 'rgba(255,255,255,0.08)',
                    border: 'none', opacity: canBuy ? 1 : 0.8,
                  }}
                >
                  🪙 {c.price}{!canBuy ? ' 🔒' : ''}
                </button>
              ) : isEquipped ? (
                <div
                  data-testid={`shop-equipped-${c.id}`}
                  style={{
                    width: '100%', padding: '7px 6px', borderRadius: 10, fontSize: 12.5,
                    fontWeight: 900, color: '#6a4a1a', background: 'rgba(255,255,255,0.85)',
                  }}
                >
                  ✓ Angelegt
                </div>
              ) : (
                <button
                  type="button"
                  data-testid={`button-shop-equip-${c.id}`}
                  onClick={() => onEquip(c.id)}
                  style={{
                    width: '100%', padding: '7px 6px', borderRadius: 10, cursor: 'pointer',
                    fontSize: 12.5, fontWeight: 800, color: '#fff',
                    background: 'linear-gradient(160deg,#8ad0ff,#5aa9e6)', border: 'none',
                  }}
                >
                  Anlegen
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
