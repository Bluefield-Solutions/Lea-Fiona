import { LEVELS } from '../../game/level';
import { ACHIEVEMENTS } from '../../game/achievements';
import type { AchievementDef } from '../../game/achievements';
import { getSpecialCoinsCollected, getLevelStars } from '../../game/storage';

/**
 * Kindgerechtes Sticker-Album: große bunte Kacheln, sanfter Glanz auf
 * gefundenen Stickern, ein farbiger Fortschrittsbalken und — zur besseren
 * Übersicht — nach Kategorien gruppiert (Welten / Sammel-Ziele / Kunststücke).
 * Rein präsentativ; Datenlogik unverändert.
 */

// Sticker einer Kategorie zuordnen (regelbasiert, keine Datenänderung nötig).
const COLLECT_IDS = new Set([
  'plush_teddy', 'plush_hase', 'plush_stern', 'plush_kuschelband',
  'first_special', 'super_collector',
  'milestone_5', 'milestone_10', 'half_worlds',
]);
// '_clear'-Sticker sind Welt-Abschlüsse — außer diese beiden Kunststücke.
const NOT_WORLD = new Set(['no_hit_clear', 'speedrun_clear']);
function categoryOf(id: string): 'worlds' | 'collect' | 'tricks' {
  if (id.endsWith('_clear') && !NOT_WORLD.has(id)) return 'worlds';
  if (id.startsWith('coins_') || COLLECT_IDS.has(id)) return 'collect';
  return 'tricks';
}
const GROUPS: { key: 'worlds' | 'collect' | 'tricks'; title: string; icon: string }[] = [
  { key: 'worlds', title: 'Welten', icon: '🗺️' },
  { key: 'collect', title: 'Sammel-Ziele', icon: '🎒' },
  { key: 'tricks', title: 'Kunststücke', icon: '✨' },
];

export function AlbumPanel({ unlocked }: { unlocked: string[] }) {
  const set = new Set(unlocked);
  const total = ACHIEVEMENTS.length;
  const got = ACHIEVEMENTS.filter(a => set.has(a.id)).length;
  const pct = total > 0 ? Math.round((got / total) * 100) : 0;

  const grouped: Record<string, AchievementDef[]> = { worlds: [], collect: [], tricks: [] };
  for (const a of ACHIEVEMENTS) grouped[categoryOf(a.id)].push(a);

  const coinTotals = LEVELS.map((_, i) => {
    const sc = getSpecialCoinsCollected(i);
    return (sc[0] ? 1 : 0) + (sc[1] ? 1 : 0) + (sc[2] ? 1 : 0);
  });
  const totalCoins = coinTotals.reduce((a, b) => a + b, 0);
  const totalStars = LEVELS.reduce((acc, _, i) => acc + getLevelStars(i), 0);

  const renderSticker = (a: AchievementDef) => {
    const have = set.has(a.id);
    return (
      <div
        key={a.id}
        data-testid={`sticker-${a.id}`}
        className={`album-sticker ${have ? 'album-sticker-got' : ''}`}
        aria-label={`${a.name}, ${have ? 'freigeschaltet' : 'noch gesperrt'}`}
        style={{
          position: 'relative', overflow: 'hidden',
          padding: '14px 8px 10px', borderRadius: 16,
          background: have
            ? 'linear-gradient(160deg,#fff7db 0%,#ffe3ef 55%,#e6f0ff 100%)'
            : 'rgba(255,255,255,0.06)',
          border: `3px solid ${have ? '#ffd54a' : 'rgba(255,255,255,0.16)'}`,
          boxShadow: have ? '0 4px 14px rgba(255,158,199,0.35)' : 'none',
          opacity: have ? 1 : 0.6, textAlign: 'center',
        }}
      >
        {have && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '45%', height: '100%',
            background: 'linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.7) 50%,rgba(255,255,255,0) 100%)',
            animation: 'albumShine 3.2s ease-in-out infinite', pointerEvents: 'none',
          }} />
        )}
        <div style={{
          fontSize: 42, marginBottom: 6, lineHeight: 1,
          filter: have ? 'drop-shadow(0 2px 3px rgba(0,0,0,0.15))' : 'grayscale(1)',
          animation: have ? 'albumPop 0.4s ease both' : 'none',
        }}>
          {have ? a.icon : '❔'}
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: have ? '#6a4a1a' : 'rgba(255,255,255,0.6)', lineHeight: 1.15 }}>
          {a.name}
        </div>
        <div style={{ fontSize: 10, color: have ? 'rgba(90,70,30,0.75)' : 'rgba(255,255,255,0.5)', marginTop: 3, lineHeight: 1.2 }}>
          {have ? a.description : '❓ Noch zu finden'}
        </div>
      </div>
    );
  };

  return (
    <div data-testid="album-panel" style={{ textAlign: 'left', marginBottom: 12 }}>
      <style>{`
        @keyframes albumShine {
          0% { transform: translateX(-120%) rotate(8deg); }
          60%,100% { transform: translateX(240%) rotate(8deg); }
        }
        @keyframes albumPop {
          0% { transform: scale(0.6); opacity: 0; }
          70% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        .album-sticker-got:hover { transform: translateY(-3px) scale(1.03); }
        .album-sticker { transition: transform 0.15s ease; }
      `}</style>

      {/* Fortschrittsbalken */}
      <div style={{ marginBottom: 14 }}>
        <p data-testid="text-album-progress" style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: '#ffd54a' }}>
          ⭐ {got} von {total} Stickern gefunden!
        </p>
        <div style={{
          height: 18, borderRadius: 999, background: 'rgba(255,255,255,0.14)',
          overflow: 'hidden', border: '2px solid rgba(255,255,255,0.18)',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: 999,
            background: 'linear-gradient(90deg,#ffd54a,#ff9ec7,#8ad0ff)',
            transition: 'width 0.5s ease', minWidth: pct > 0 ? 14 : 0,
            boxShadow: '0 0 10px rgba(255,213,74,0.5)',
          }} />
        </div>
      </div>

      {/* Sticker nach Kategorien */}
      {GROUPS.map(g => {
        const list = grouped[g.key];
        if (list.length === 0) return null;
        const gGot = list.filter(a => set.has(a.id)).length;
        return (
          <div key={g.key} style={{ marginBottom: 18 }}>
            <h3 style={{ margin: '4px 0 8px', fontSize: 15, fontWeight: 800, color: '#ffd54a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{g.icon} {g.title}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{gGot}/{list.length}</span>
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: 12,
            }}>
              {list.map(renderSticker)}
            </div>
          </div>
        );
      })}

      {/* Sonder-Münzen pro Welt */}
      <h3 style={{ margin: '4px 0 4px', fontSize: 15, fontWeight: 800, color: '#ffd54a' }}>🪙 Sonder-Münzen</h3>
      <p
        data-testid="text-album-special-coins"
        style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}
      >
        Münzen: {totalCoins} / {LEVELS.length * 3} · Sterne: {totalStars} / {LEVELS.length * 3}
      </p>
      <div
        data-testid="grid-album-special-coins"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 8,
        }}
      >
        {LEVELS.map((lv, i) => {
          const sc = getSpecialCoinsCollected(i);
          const stars = getLevelStars(i);
          const done = sc[0] && sc[1] && sc[2];
          return (
            <div
              key={i}
              data-testid={`album-coin-row-${i}`}
              style={{
                padding: 9, borderRadius: 12,
                background: done ? 'linear-gradient(160deg,rgba(255,215,74,0.22),rgba(255,158,199,0.18))' : 'rgba(0,0,0,0.3)',
                border: `2px solid ${done ? '#ffd54a' : 'rgba(255,255,255,0.12)'}`,
                fontSize: 11, color: 'rgba(255,255,255,0.9)',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: 5, fontSize: 11, lineHeight: 1.1 }}>
                {done ? '🎉 ' : ''}{i + 1}. {lv.name.replace(/^World \d+:\s*/, '')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ letterSpacing: 2, fontSize: 14 }}>
                  {sc.map((gc, k) => <span key={k}>{gc ? '🪙' : '·'}</span>)}
                </span>
                <span style={{ color: stars > 0 ? '#ffd54a' : 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                  {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
