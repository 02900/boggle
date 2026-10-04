import { vi } from "vitest";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import type { ScrabbleGameState, ScrabblePlayer, ScrabbleTile } from "@/interfaces/scrabble";
import { createEmptyBoard } from "../../../../game/scrabble/scrabbleConfig";

/** Socket actions the components call; tests assert on these instead of a real socket. */
export const socketActions = {
  joinGame: vi.fn(),
  startGame: vi.fn(),
  placeTiles: vi.fn(),
  recallTiles: vi.fn(),
  recallTile: vi.fn(),
  submitTurn: vi.fn(),
  passTurn: vi.fn(),
  exchangeTiles: vi.fn(),
  skipTurn: vi.fn(),
  leaveGame: vi.fn(),
  requestScoreboard: vi.fn(),
  resetGame: vi.fn(),
};

export const ME = "me";
export const OTHER = "other";

export function tile(letter: string, value = 1, id = `t-${letter}`): ScrabbleTile {
  return { id, letter, value, isBlank: false };
}

export function blank(id = "t-blank"): ScrabbleTile {
  return { id, letter: "", value: 0, isBlank: true };
}

function player(id: string, name: string, overrides: Partial<ScrabblePlayer> = {}): ScrabblePlayer {
  return {
    id,
    name,
    score: 0,
    wordsFound: [],
    rackSize: 7,
    isCurrentTurn: false,
    isConnected: true,
    timeUsed: 0,
    overtime: 0,
    ...overrides,
  };
}

/** Puts the store in a playing game between "me" (Ana) and "other" (Bob). */
export function setupGame(
  opts: { myTurn?: boolean; rack?: ScrabbleTile[]; state?: Partial<ScrabbleGameState> } = {}
) {
  const { myTurn = true, rack = [], state = {} } = opts;
  const store = useScrabbleGameStore.getState();
  store.reset();
  store.setCurrentPlayerId(ME);
  store.setIsJoined(true);
  store.setRack(rack);
  store.setGameState({
    board: createEmptyBoard(),
    players: [player(ME, "Ana"), player(OTHER, "Bob")],
    gameState: "playing",
    currentTurnPlayerId: myTurn ? ME : OTHER,
    turnTimeLeft: 100,
    tileBagCount: 80,
    consecutivePasses: 0,
    moveHistory: [],
    ...state,
  });
}
