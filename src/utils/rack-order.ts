import type { ScrabbleTile } from "@/interfaces/scrabble";

/**
 * The rack's display order is a client-side preference (shuffle / drag), kept as a
 * list of tile ids. Tiles the preference doesn't know yet (freshly drawn) go last,
 * in the server's order; ids no longer in the rack are ignored.
 */
export function orderRack(rack: ScrabbleTile[], order: string[]): ScrabbleTile[] {
  const byId = new Map(rack.map((t) => [t.id, t]));
  const known = order.flatMap((id) => {
    const tile = byId.get(id);
    return tile ? [tile] : [];
  });
  const knownIds = new Set(known.map((t) => t.id));
  return [...known, ...rack.filter((t) => !knownIds.has(t.id))];
}

/** Moves `tileId` into `targetId`'s position (or to the end when there is no target). */
export function moveTile(ids: string[], tileId: string, targetId: string | null): string[] {
  const from = ids.indexOf(tileId);
  if (from === -1 || tileId === targetId) return ids;
  const next = ids.filter((id) => id !== tileId);
  const to = targetId === null ? next.length : ids.indexOf(targetId);
  if (to === -1) return ids;
  next.splice(to, 0, tileId);
  return next;
}

export function shuffleIds(ids: string[], random: () => number = Math.random): string[] {
  const next = [...ids];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}
