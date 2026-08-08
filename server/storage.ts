// The game persists all progress client-side via localStorage (see
// `client/src/game/storage.ts`). This module is intentionally a no-op
// stub kept around so the express layer + future API endpoints have a
// uniform data-access seam to plug into. If/when a server-side feature
// is added (cloud-sync, leaderboards, …), reintroduce a real IStorage
// implementation here and wire it through `server/routes.ts`.
export interface IStorage {
  // Reserved for future use. Intentionally empty.
  readonly kind: 'noop';
}

export const storage: IStorage = { kind: 'noop' };
