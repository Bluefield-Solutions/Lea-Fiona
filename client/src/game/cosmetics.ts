/**
 * Kuschel-Shop — Kosmetik-Katalog (F1 „Münz-Senke").
 *
 * Rein kosmetische Hüte, die mit den gesammelten Münzen (Profile.totalCoins =
 * Wallet) gekauft werden. Dadurch bekommen Münzen endlich ein Ziel. Die Hüte
 * werden prozedural über der Spielfigur gezeichnet (siehe engine_internal/
 * render.ts → drawCosmeticHat), es sind KEINE Bild-Assets nötig.
 *
 * IDs sind stabile Strings; sie werden in Profile.ownedCosmetics /
 * equippedCosmetic persistiert. Append, niemals umbenennen (sonst verliert ein
 * Kind seinen gekauften Hut). Reihenfolge im Array = Reihenfolge im Shop
 * (aufsteigender Preis = sanfter Fortschritt).
 */

export interface CosmeticDef {
  id: string;
  name: string;
  /** Preis in Münzen (Wallet = Profile.totalCoins). */
  price: number;
  /** Emoji für die Shop-Kachel (nur UI, nicht das In-Game-Rendering). */
  emoji: string;
  /** Kurzer, kindgerechter Ein-Zeiler für die Kachel. */
  hint: string;
}

export const COSMETICS: CosmeticDef[] = [
  { id: 'blume',    name: 'Blümchen',    price: 15,  emoji: '🌸', hint: 'Ein fröhliches Blümchen im Haar.' },
  { id: 'schleife', name: 'Schleife',    price: 25,  emoji: '🎀', hint: 'Eine große Schleife obendrauf.' },
  { id: 'cap',      name: 'Cappy',       price: 40,  emoji: '🧢', hint: 'Eine coole Schirmmütze.' },
  { id: 'party',    name: 'Partyhut',    price: 60,  emoji: '🎉', hint: 'Bunt und spitz — für jede Party.' },
  { id: 'zylinder', name: 'Zylinder',    price: 85,  emoji: '🎩', hint: 'Ein schicker hoher Hut.' },
  { id: 'krone',    name: 'Krönchen',    price: 120, emoji: '👑', hint: 'Für echte Heldinnen: eine Goldkrone.' },
  { id: 'stern',    name: 'Sternenreif', price: 160, emoji: '⭐', hint: 'Ein leuchtender Sternen-Haarreif.' },
];

const BY_ID: Map<string, CosmeticDef> = new Map(COSMETICS.map(c => [c.id, c]));

export function getCosmetic(id: string | null): CosmeticDef | null {
  return id ? (BY_ID.get(id) ?? null) : null;
}
