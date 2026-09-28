/** Stable per-seat colors so a player reads the same everywhere (lobby, panel, history). */
export const PLAYER_COLORS = ["bg-accent", "bg-info", "bg-success", "bg-board-dw"] as const;

export function playerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
