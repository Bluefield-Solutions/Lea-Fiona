/**
 * Garderobe-Katalog (Shop & Ankleide, E1).
 *
 * Struktur für den kommenden Boutique-Shop: Kleidungs-/Kosmetik-Teile, in
 * Slots/Reiter gegliedert, mit Preisen und (später) KI-Bild-Layern. In v1
 * bleibt der Katalog bewusst auf die bestehenden 7 Hüte (Slot `kopf`) begrenzt;
 * Körper-Kategorien (Oberteil/Hose/…) bekommen ihre Teile mit den KI-Assets
 * (Etappe E4). IDs sind stabil & append-only — niemals umbenennen (sonst
 * verliert ein Kind ein gekauftes Teil).
 *
 * Die Hut-Definitionen werden aus cosmetics.ts abgeleitet (eine Quelle der
 * Wahrheit), damit der bestehende Kuschel-Shop und die neue Garderobe nicht
 * auseinanderlaufen.
 */
import { COSMETICS } from './cosmetics';
import type { WardrobeSlot } from './storage';

export type { WardrobeSlot };

export interface SlotMeta {
  slot: WardrobeSlot;
  /** Reiter-Beschriftung im Shop. */
  label: string;
  /** Kurzer, kindgerechter Hinweis, wenn die Kategorie (noch) leer ist. */
  emptyHint: string;
  /** Z-Reihenfolge auf der Ankleide-Figur (klein = weiter hinten). */
  layer: number;
  /** Wird das Teil auch auf der laufenden Spielfigur getragen (Overlay)? */
  ingame: boolean;
  /** Anker fürs In-Game-Overlay (nur bei ingame=true relevant). */
  anchor?: 'head' | 'face' | 'back';
}

/**
 * Slot-/Reiter-Reihenfolge im Shop. Richtung A (komplette Outfits): Kleidung
 * kommt als ganzes Outfit (Figur-Bild-Tausch in der Vorschau), Kopf/Brille/
 * Accessoire bleiben frei kombinierbare Overlays obendrauf.
 */
export const SLOTS: SlotMeta[] = [
  { slot: 'outfit',     label: 'Outfits',    emptyHint: 'Komplette Outfits — die Figur zieht sich ganz um! Bald da.', layer: 0, ingame: false },
  { slot: 'kopf',       label: 'Kopf',       emptyHint: 'Hüte, Mützen & Reifen.',        layer: 9, ingame: true,  anchor: 'head' },
  { slot: 'brille',     label: 'Brillen',    emptyHint: 'Sonnenbrillen & lustige Gläser.', layer: 8, ingame: true, anchor: 'face' },
  { slot: 'accessoire', label: 'Accessoires', emptyHint: 'Rucksack, Cape, Ketten — bald da!',        layer: 1, ingame: true, anchor: 'back' },
];

const SLOT_META = new Map<WardrobeSlot, SlotMeta>(SLOTS.map(s => [s.slot, s]));
export function slotMeta(slot: WardrobeSlot): SlotMeta | undefined { return SLOT_META.get(slot); }

export interface WardrobeItem {
  id: string;
  slot: WardrobeSlot;
  /** Bei Sets: zusätzliche Slots, die dieses Teil belegt (z. B. Badeoutfit). */
  occupies?: WardrobeSlot[];
  name: string;
  /** Preis in Münzen (Wallet = Profile.totalCoins). */
  price: number;
  /** Zusätzlich nötige gesammelte Sterne (Sterne-Senke). 0 = nur Münzen. */
  starCost?: number;
  /** Für welche Figur geeignet. 'both' = universell. */
  fit: 'both' | 'lea' | 'fiona';
  /** Emoji für die Shop-Kachel (UI-Fallback, nicht das In-Game-Rendering). */
  emoji: string;
  /** Kurzer, kindgerechter Ein-Zeiler für die Kachel. */
  hint: string;
  /** Wird das Teil auch im Spiel getragen (Overlay-Slot)? */
  ingame: boolean;
  /** Z-Reihenfolge auf der Ankleide-Figur. */
  layer: number;
  /**
   * Optionaler KI-Bild-Layer je Figur (transparentes PNG auf der Mannequin-
   * Leinwand, siehe KI-Asset-Spezifikation). Wenn gesetzt, zeichnet die
   * Ankleide-Vorschau dieses Bild deckungsgleich über das Basis-Sprite —
   * andernfalls wird (falls vorhanden) prozedural gezeichnet.
   */
  img?: Partial<Record<'lea' | 'fiona' | 'stephan', string>>;
}

/**
 * Katalog. v1: die 7 Hüte aus cosmetics.ts als Slot `kopf`. Weitere Kategorien
 * werden mit den KI-Assets (E4) befüllt — bis dahin bleiben ihre Reiter leer
 * (der Shop zeigt dort den emptyHint der Kategorie).
 */
export const WARDROBE: WardrobeItem[] = [
  ...COSMETICS.map((c): WardrobeItem => ({
    id: c.id,
    slot: 'kopf',
    name: c.name,
    price: c.price,
    starCost: c.starCost,
    fit: 'both',
    emoji: c.emoji,
    hint: c.hint,
    ingame: true,
    layer: 9,
  })),
  // Brillen (E4-Muster, prozedural gezeichnet — In-Game-tauglicher Gesichts-Overlay).
  { id: 'sonnenbrille', slot: 'brille', name: 'Sonnenbrille', price: 30, fit: 'both', emoji: '🕶️', hint: 'Coole dunkle Gläser.', ingame: true, layer: 8 },
  { id: 'herzbrille', slot: 'brille', name: 'Herz-Brille', price: 45, fit: 'both', emoji: '😍', hint: 'Herzchen-Gläser zum Verlieben.', ingame: true, layer: 8 },
  // Accessoires (E4-Muster, prozedural — Hals-/Front-Overlay, auch im Spiel getragen).
  { id: 'schal', slot: 'accessoire', name: 'Schal', price: 35, fit: 'both', emoji: '🧣', hint: 'Ein kuscheliger roter Schal.', ingame: true, layer: 7 },
  { id: 'kette', slot: 'accessoire', name: 'Herz-Kette', price: 50, fit: 'both', emoji: '💛', hint: 'Goldkette mit Herz-Anhänger.', ingame: true, layer: 7 },
];

const BY_ID = new Map<string, WardrobeItem>(WARDROBE.map(i => [i.id, i]));

export function getWardrobeItem(id: string | null): WardrobeItem | null {
  return id ? (BY_ID.get(id) ?? null) : null;
}

/** Alle Teile eines Slots (Katalog-Reihenfolge = aufsteigender Preis). */
export function itemsInSlot(slot: WardrobeSlot): WardrobeItem[] {
  return WARDROBE.filter(i => i.slot === slot);
}
