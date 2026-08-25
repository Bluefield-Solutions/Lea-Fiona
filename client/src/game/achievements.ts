/**
 * Sticker / achievement catalogue. IDs are stable strings persisted into
 * each profile's `stickers[]`. The engine emits `achievement` events with
 * the unlocked id; the React layer looks the metadata up here for the
 * toast + the album modal.
 *
 * Catalogue ≥ 8 entries (spec). Additions: append, never reorder; renames
 * silently lose the sticker on the next load (intentional — tiny scope).
 */

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_steps',
    name: 'Erste Schritte',
    description: 'Schaffe das erste Level.',
    icon: '🌱',
  },
  {
    id: 'jungle_clear',
    name: 'Dschungel-Heldin',
    description: 'Schaffe das Dschungel-Level.',
    icon: '🌴',
  },
  {
    id: 'all_levels',
    name: 'Welten-Meisterin',
    description: 'Schaffe alle 19 Welten.',
    icon: '🏆',
  },
  {
    id: 'coin_hoard',
    name: 'Münzsammlerin',
    description: 'Sammle in einem Level 30 Münzen.',
    icon: '🪙',
  },
  {
    id: 'fire_kill',
    name: 'Feuerwerferin',
    description: 'Besiege einen Gegner mit einem Feuerball.',
    icon: '🔥',
  },
  {
    id: 'star_smash',
    name: 'Sternensturm',
    description: 'Besiege einen Gegner im Sternen-Modus.',
    icon: '⭐',
  },
  {
    id: 'wall_jumper',
    name: 'Wand-Akrobatin',
    description: 'Springe von einer Wand ab.',
    icon: '🧗',
  },
  {
    id: 'p_runner',
    name: 'Sprint-Profi',
    description: 'Lade die P-Anzeige voll auf.',
    icon: '⚡',
  },
  {
    id: 'bomb_master',
    name: 'Sprengmeisterin',
    description: 'Lass eine Bomben-Omb hochgehen.',
    icon: '💣',
  },
  {
    id: 'no_hit_clear',
    name: 'Ohne Kratzer',
    description: 'Schaffe ein Level ohne Schaden.',
    icon: '🛡️',
  },
  {
    id: 'cave_clear',
    name: 'Höhlen-Forscherin',
    description: 'Schaffe das Höhlen-Level.',
    icon: '🦇',
  },
  {
    id: 'sky_clear',
    name: 'Wolken-Wanderin',
    description: 'Schaffe das Wolken-Level.',
    icon: '☁️',
  },
  {
    id: 'beach_clear',
    name: 'Strand-Star',
    description: 'Schaffe das Strand-Level.',
    icon: '🏖️',
  },
  {
    id: 'australia_clear',
    name: 'Outback-Pionierin',
    description: 'Schaffe das Australien-Level.',
    icon: '🪃',
  },
  {
    id: 'volcano_clear',
    name: 'Vulkan-Bezwingerin',
    description: 'Schaffe das Vulkan-Level.',
    icon: '🌋',
  },
  {
    id: 'ice_clear',
    name: 'Eis-Königin',
    description: 'Schaffe das Eis-Level.',
    icon: '❄️',
  },
  {
    id: 'castle_clear',
    name: 'Schloss-Befreierin',
    description: 'Schaffe das Schloss-Level.',
    icon: '🏰',
  },
  {
    id: 'underwater_clear',
    name: 'Tiefsee-Taucherin',
    description: 'Schaffe das Unterwasser-Level.',
    icon: '🐠',
  },
  {
    id: 'space_clear',
    name: 'Weltraum-Pilotin',
    description: 'Schaffe das Weltraum-Level.',
    icon: '🚀',
  },
  {
    id: 'combo_3',
    name: 'Triple-Stampfer',
    description: 'Erledige 3 Gegner in einem Sprung.',
    icon: '👟',
  },
  {
    id: 'combo_5',
    name: 'Stampf-Kette',
    description: 'Erledige 5 Gegner in einem Sprung.',
    icon: '💥',
  },
  {
    id: 'speedrun_clear',
    name: 'Blitz-Schnell',
    description: 'Schaffe ein Level mit über 250 Sekunden übrig.',
    icon: '⏱️',
  },
  // Welten 11–13 (append, niemals umsortieren — siehe Katalog-Hinweis oben).
  {
    id: 'school_clear',
    name: 'Klassenbeste',
    description: 'Schaffe das Schul-Level.',
    icon: '🎒',
  },
  {
    id: 'trampoline_clear',
    name: 'Superfly-Ass',
    description: 'Schaffe das Superfly-Level.',
    icon: '🤸',
  },
  {
    id: 'bluefield_clear',
    name: 'Blaue-Wiese-Profi',
    description: 'Schaffe die Blaue Wiese.',
    icon: '💙',
  },
  // Welt „Turnen" (append, niemals umsortieren).
  {
    id: 'gym_clear',
    name: 'Turn-Talent',
    description: 'Schaffe die Turnhalle.',
    icon: '🤸',
  },
  // Welt „Plüsch-Traumland" (append, niemals umsortieren).
  {
    id: 'plush_clear',
    name: 'Kuschel-Held',
    description: 'Schaffe das Plüsch-Traumland.',
    icon: '🧸',
  },
  {
    id: 'dragon_clear',
    name: 'Drachenbezwingerin',
    description: 'Besiege den grünen Drachen in der Drachenhöhle.',
    icon: '🐲',
  },
  // Fehlende Welt-Durchgespielt-Sticker ergänzt (Welt 3/18/19), damit das Album
  // vollständig komplettierbar ist (append, niemals umsortieren).
  {
    id: 'forest_clear',
    name: 'Dämmerwald-Heldin',
    description: 'Schaffe den Wald der Dämmerung.',
    icon: '🌲',
  },
  {
    id: 'city_clear',
    name: 'Dächer-Läuferin',
    description: 'Schaffe die Stadt über den Dächern.',
    icon: '🏙️',
  },
  {
    id: 'vacation_clear',
    name: 'Ferien-Heldin',
    description: 'Schaffe Stephans Urlaub.',
    icon: '🏝️',
  },
  // Sammelbare Kuschel-Sticker (versteckt im Plüsch-Traumland).
  {
    id: 'plush_teddy',
    name: 'Teddy-Sticker',
    description: 'Finde den versteckten Teddy im Plüsch-Traumland.',
    icon: '🧸',
  },
  {
    id: 'plush_hase',
    name: 'Hasen-Sticker',
    description: 'Finde den versteckten Hasen im Plüsch-Traumland.',
    icon: '🐰',
  },
  {
    id: 'plush_stern',
    name: 'Stern-Sticker',
    description: 'Finde den versteckten Plüschstern im Plüsch-Traumland.',
    icon: '🌟',
  },
  {
    id: 'plush_kuschelband',
    name: 'Kuschel-Sammlerin',
    description: 'Finde alle drei Kuschel-Sticker im Plüsch-Traumland.',
    icon: '🎀',
  },
  // Welt-Sammel-Sticker: alle 3 Sonder-Münzen einer Welt eingesammelt.
  { id: 'coins_jungle',     name: 'Dschungel-Sammlerin',  description: 'Sammle alle 3 Sonder-Münzen im Dschungel.',       icon: '🌴' },
  { id: 'coins_cave',       name: 'Höhlen-Sammlerin',     description: 'Sammle alle 3 Sonder-Münzen in der Höhle.',       icon: '💎' },
  { id: 'coins_sky',        name: 'Himmel-Sammlerin',     description: 'Sammle alle 3 Sonder-Münzen im Himmel.',          icon: '☁️' },
  { id: 'coins_beach',      name: 'Strand-Sammlerin',     description: 'Sammle alle 3 Sonder-Münzen am Strand.',          icon: '🐚' },
  { id: 'coins_australia',  name: 'Australien-Sammlerin', description: 'Sammle alle 3 Sonder-Münzen in Australien.',      icon: '🪃' },
  { id: 'coins_volcano',    name: 'Vulkan-Sammlerin',     description: 'Sammle alle 3 Sonder-Münzen im Vulkan.',          icon: '🌋' },
  { id: 'coins_ice',        name: 'Eis-Sammlerin',        description: 'Sammle alle 3 Sonder-Münzen im Eis.',             icon: '❄️' },
  { id: 'coins_castle',     name: 'Schloss-Sammlerin',    description: 'Sammle alle 3 Sonder-Münzen im Schloss.',         icon: '🏰' },
  { id: 'coins_underwater', name: 'Meer-Sammlerin',       description: 'Sammle alle 3 Sonder-Münzen unter Wasser.',       icon: '🐠' },
  { id: 'coins_space',      name: 'Weltraum-Sammlerin',   description: 'Sammle alle 3 Sonder-Münzen im Weltraum.',        icon: '🚀' },
  { id: 'coins_school',     name: 'Schul-Sammlerin',      description: 'Sammle alle 3 Sonder-Münzen in der Schule.',      icon: '✏️' },
  { id: 'coins_gym',        name: 'Turn-Sammlerin',       description: 'Sammle alle 3 Sonder-Münzen in der Turnhalle.',   icon: '🏅' },
  { id: 'coins_trampoline', name: 'Trampolin-Sammlerin',  description: 'Sammle alle 3 Sonder-Münzen im Trampolin-Land.',  icon: '🎪' },
  { id: 'coins_bluefield',  name: 'Wiesen-Sammlerin',     description: 'Sammle alle 3 Sonder-Münzen auf der blauen Wiese.', icon: '🌼' },
  // Kleine Zwischenziele (leichter erreichbar, mehr zum Entdecken).
  { id: 'first_special',   name: 'Sammel-Anfängerin',   description: 'Finde deine erste Sonder-Münze.',                icon: '🎒' },
  { id: 'half_worlds',     name: 'Halbzeit-Heldin',     description: 'Schaffe 8 Welten.',                              icon: '🎖️' },
  { id: 'plush_all_forms', name: 'Verwandlungskünstlerin', description: 'Sei im Plüsch-Traumland Affe, Panda UND Elefant.', icon: '🎭' },
  { id: 'double_jump',     name: 'Flügel-Fee',           description: 'Schnapp dir die Flügel — Doppelsprung freigeschaltet!', icon: '🪽' },
  // Großer Meilenstein: in JEDER Welt alle Sonder-Münzen gesammelt.
  { id: 'super_collector',  name: 'Super-Sammlerin',      description: 'Sammle in jeder Welt alle Sonder-Münzen!',        icon: '👑' },
  // Meilenstein-Sammel-Sticker: werden bei der 5-/10-Welten-Feier vergeben
  // (die alle-Welten-Feier vergibt 'all_levels'). Append, niemals umsortieren.
  { id: 'milestone_5',  name: '5-Welten-Fest',   description: 'Feiere deine ersten 5 geschafften Welten.', icon: '🎉' },
  { id: 'milestone_10', name: '10-Welten-Party',  description: 'Feiere 10 geschaffte Welten.',              icon: '🎊' },
];

const BY_ID: Map<string, AchievementDef> = new Map(ACHIEVEMENTS.map(a => [a.id, a]));

export function getAchievement(id: string): AchievementDef | null {
  return BY_ID.get(id) ?? null;
}
