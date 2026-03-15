import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";

vi.mock("fs");
vi.mock("../../../utils/scoreboard", () => ({ updateScoreboard: vi.fn() }));
vi.mock("../../../utils/debug", () => ({ debugLog: vi.fn() }));

// Mock dictionary
vi.mocked(fs.readFileSync).mockReturnValue(
  "casa\nmesa\nsilla\nagua\nfuego\ngato\nperro\ntierra\naire\namor\ntiempo\nlugar\ncosa\npersona\nanimal\nplanta\ncomida\nsol\nsal\nmar\npan\nrio\nluz\n"
);

import { ScrabbleGame } from "../ScrabbleGame";
import { updateScoreboard } from "../../../utils/scoreboard";
import type { ScrabbleTile, TilePlacement } from "../../../src/interfaces/scrabble";
import {
  SCRABBLE_RACK_SIZE,
  SCRABBLE_BOARD_SIZE,
  SCRABBLE_TURN_TIME_LIMIT,
} from "../../../config/scrabbleConstants";

// ---- Helpers ----

function setupGameForPlay(game: ScrabbleGame): { p1: string; p2: string } {
  game.addPlayer("p1", "Alice");
  game.addPlayer("p2", "Bob");
  game.startGame();
  game.clearTimers();
  return { p1: "p1", p2: "p2" };
}

function makeTile(letter: string, value: number, id?: string): ScrabbleTile {
  return {
    id: id || `test-${letter}-${Math.random().toString(36).slice(2)}`,
    letter,
    value,
    isBlank: false,
  };
}

/**
 * Sets the current player's rack to the tiles needed to spell a word,
 * then places them on the board. Returns the placements for later use.
 */
function setRackAndPlace(
  game: ScrabbleGame,
  playerId: string,
  tiles: ScrabbleTile[],
  positions: Array<[number, number]>
): TilePlacement[] {
  // Replace the player's rack with our known tiles
  game.playerRacks.set(playerId, [...tiles]);

  const placements: TilePlacement[] = tiles.map((tile, i) => ({
    tile,
    row: positions[i][0],
    col: positions[i][1],
  }));

  game.placeTiles(playerId, placements);
  return placements;
}

/**
 * Creates tiles for the word "casa" (C=3, A=1, S=1, A=1) and returns
 * tiles + positions covering center (7,7) for a valid first move.
 */
function makeCasaTiles(): { tiles: ScrabbleTile[]; positions: Array<[number, number]> } {
  return {
    tiles: [
      makeTile("C", 3, "t-C"),
      makeTile("A", 1, "t-A1"),
      makeTile("S", 1, "t-S"),
      makeTile("A", 1, "t-A2"),
    ],
    positions: [
      [7, 6],
      [7, 7],
      [7, 8],
      [7, 9],
    ],
  };
}

// ---- Tests ----

describe("ScrabbleGame", () => {
  let game: ScrabbleGame;

  beforeEach(() => {
    vi.clearAllMocks();
    game = new ScrabbleGame();
  });

  afterEach(() => {
    game.clearTimers();
    vi.useRealTimers();
  });

  // ===========================================================================
  // constructor
  // ===========================================================================
  describe("constructor", () => {
    it("initializes with gameState 'waiting'", () => {
      expect(game.gameState).toBe("waiting");
    });

    it("creates a 15x15 board with null tiles", () => {
      expect(game.board).toHaveLength(SCRABBLE_BOARD_SIZE);
      for (const row of game.board) {
        expect(row).toHaveLength(SCRABBLE_BOARD_SIZE);
        for (const cell of row) {
          expect(cell.tile).toBeNull();
        }
      }
    });

    it("starts with empty playerRacks and playerOrder", () => {
      expect(game.playerRacks.size).toBe(0);
      expect(game.playerOrder).toHaveLength(0);
    });
  });

  // ===========================================================================
  // addPlayer / removePlayer
  // ===========================================================================
  describe("addPlayer / removePlayer", () => {
    it("addPlayer adds to playerOrder and creates empty rack", () => {
      game.addPlayer("p1", "Alice");
      expect(game.playerOrder).toContain("p1");
      expect(game.playerRacks.has("p1")).toBe(true);
      expect(game.playerRacks.get("p1")).toHaveLength(0);
    });

    it("addPlayer during an active game draws tiles for the new player", () => {
      setupGameForPlay(game);
      const bagBefore = game.tileBag.length;
      game.addPlayer("p3", "Charlie");
      const rack = game.playerRacks.get("p3")!;
      expect(rack.length).toBe(SCRABBLE_RACK_SIZE);
      expect(game.tileBag.length).toBe(bagBefore - SCRABBLE_RACK_SIZE);
    });

    it("removePlayer removes from playerOrder and playerRacks", () => {
      game.addPlayer("p1", "Alice");
      game.removePlayer("p1");
      expect(game.playerOrder).not.toContain("p1");
      expect(game.playerRacks.has("p1")).toBe(false);
    });

    it("removePlayer returns tiles to the bag", () => {
      setupGameForPlay(game);
      const rack = game.playerRacks.get("p1")!;
      const rackSize = rack.length;
      const bagBefore = game.tileBag.length;
      game.removePlayer("p1");
      expect(game.tileBag.length).toBe(bagBefore + rackSize);
    });

    it("removePlayer advances turn if it was that player's turn", () => {
      setupGameForPlay(game);
      const currentPlayer = game.getCurrentTurnPlayerId();
      // The other player should get the turn after removal
      const otherPlayer = currentPlayer === "p1" ? "p2" : "p1";
      game.removePlayer(currentPlayer!);
      expect(game.getCurrentTurnPlayerId()).toBe(otherPlayer);
    });
  });

  // ===========================================================================
  // startGame
  // ===========================================================================
  describe("startGame", () => {
    it("returns false with fewer than 2 players", () => {
      game.addPlayer("p1", "Alice");
      const result = game.startGame();
      game.clearTimers();
      expect(result).toBe(false);
    });

    it("sets gameState to 'playing'", () => {
      game.addPlayer("p1", "Alice");
      game.addPlayer("p2", "Bob");
      game.startGame();
      game.clearTimers();
      expect(game.gameState).toBe("playing");
    });

    it("draws 7 tiles for each player", () => {
      game.addPlayer("p1", "Alice");
      game.addPlayer("p2", "Bob");
      game.startGame();
      game.clearTimers();
      expect(game.playerRacks.get("p1")).toHaveLength(SCRABBLE_RACK_SIZE);
      expect(game.playerRacks.get("p2")).toHaveLength(SCRABBLE_RACK_SIZE);
    });

    it("creates a fresh tileBag (100 minus tiles drawn)", () => {
      game.addPlayer("p1", "Alice");
      game.addPlayer("p2", "Bob");
      game.startGame();
      game.clearTimers();
      const expectedBagSize = 100 - 2 * SCRABBLE_RACK_SIZE;
      expect(game.tileBag.length).toBe(expectedBagSize);
    });
  });

  // ===========================================================================
  // drawTiles
  // ===========================================================================
  describe("drawTiles", () => {
    it("draws the requested number of tiles", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      // Clear their rack first
      game.playerRacks.set(playerId, []);
      const drawn = game.drawTiles(playerId, 3);
      expect(drawn).toHaveLength(3);
    });

    it("does not draw more tiles than the bag has", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      game.playerRacks.set(playerId, []);
      // Drain the bag to 2 tiles
      game.tileBag.splice(0, game.tileBag.length - 2);
      const drawn = game.drawTiles(playerId, 5);
      expect(drawn).toHaveLength(2);
    });

    it("adds drawn tiles to the player's rack", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      game.playerRacks.set(playerId, []);
      game.drawTiles(playerId, 4);
      expect(game.playerRacks.get(playerId)).toHaveLength(4);
    });
  });

  // ===========================================================================
  // placeTiles
  // ===========================================================================
  describe("placeTiles", () => {
    it("valid placement succeeds", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const tile = makeTile("A", 1, "place-test-1");
      game.playerRacks.set(playerId, [tile]);

      const result = game.placeTiles(playerId, [
        { tile, row: 7, col: 7 },
      ]);
      expect(result.success).toBe(true);
    });

    it("rejects placement if it is not the player's turn", () => {
      setupGameForPlay(game);
      const currentPlayer = game.getCurrentTurnPlayerId()!;
      const otherPlayer = currentPlayer === "p1" ? "p2" : "p1";
      const tile = makeTile("A", 1, "wrong-turn");
      game.playerRacks.set(otherPlayer, [tile]);

      const result = game.placeTiles(otherPlayer, [
        { tile, row: 7, col: 7 },
      ]);
      expect(result.success).toBe(false);
    });

    it("rejects placement if tile is not in the player's rack", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const fakeTile = makeTile("Z", 10, "not-in-rack");
      // Don't put fakeTile in the rack

      const result = game.placeTiles(playerId, [
        { tile: fakeTile, row: 7, col: 7 },
      ]);
      expect(result.success).toBe(false);
    });

    it("rejects placement if the cell is already occupied", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      // Put a tile on the board at (7,7)
      game.board[7][7].tile = makeTile("X", 8, "existing");
      const tile = makeTile("A", 1, "occupy-test");
      game.playerRacks.set(playerId, [tile]);

      const result = game.placeTiles(playerId, [
        { tile, row: 7, col: 7 },
      ]);
      expect(result.success).toBe(false);
    });

    it("removes placed tiles from the player's rack", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const tile = makeTile("A", 1, "rack-remove-test");
      game.playerRacks.set(playerId, [tile, makeTile("B", 3, "extra")]);

      game.placeTiles(playerId, [{ tile, row: 7, col: 7 }]);
      const rack = game.playerRacks.get(playerId)!;
      expect(rack.find((t) => t.id === tile.id)).toBeUndefined();
      expect(rack).toHaveLength(1);
    });
  });

  // ===========================================================================
  // recallTiles
  // ===========================================================================
  describe("recallTiles", () => {
    it("returns tentatively placed tiles to the rack", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const tile = makeTile("A", 1, "recall-test");
      game.playerRacks.set(playerId, [tile]);
      game.placeTiles(playerId, [{ tile, row: 7, col: 7 }]);

      // Tile should be gone from rack after placement
      expect(game.playerRacks.get(playerId)!.find((t) => t.id === tile.id)).toBeUndefined();

      game.recallTiles(playerId);

      // Tile should be back in rack
      const rack = game.playerRacks.get(playerId)!;
      expect(rack.find((t) => t.id === tile.id)).toBeDefined();
    });

    it("clears tentative placements map", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const tile = makeTile("A", 1, "recall-clear");
      game.playerRacks.set(playerId, [tile]);
      game.placeTiles(playerId, [{ tile, row: 7, col: 7 }]);

      game.recallTiles(playerId);

      const tentative = game.tentativePlacements.get(playerId);
      expect(!tentative || tentative.length === 0).toBe(true);
    });

    it("works when no placements exist (no crash)", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      expect(() => game.recallTiles(playerId)).not.toThrow();
    });
  });

  // ===========================================================================
  // submitTurn
  // ===========================================================================
  describe("submitTurn", () => {
    it("rejects if not the player's turn", () => {
      setupGameForPlay(game);
      const currentPlayer = game.getCurrentTurnPlayerId()!;
      const otherPlayer = currentPlayer === "p1" ? "p2" : "p1";
      const result = game.submitTurn(otherPlayer);
      expect(result.valid).toBe(false);
    });

    it("rejects if no tiles have been placed", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const result = game.submitTurn(playerId);
      expect(result.valid).toBe(false);
    });

    it("rejects if placement is not in the same line", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const tiles = [
        makeTile("C", 3, "scatter-C"),
        makeTile("A", 1, "scatter-A"),
        makeTile("S", 1, "scatter-S"),
      ];
      game.playerRacks.set(playerId, [...tiles]);
      // Place tiles not in a line: (7,7), (8,8), (9,7) -- diagonal/scattered
      game.placeTiles(playerId, [
        { tile: tiles[0], row: 7, col: 7 },
        { tile: tiles[1], row: 8, col: 8 },
        { tile: tiles[2], row: 9, col: 7 },
      ]);
      const result = game.submitTurn(playerId);
      expect(result.valid).toBe(false);
    });

    it("rejects if word is not in the dictionary", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      // Spell "XYZ" which is not in the dictionary
      const tiles = [
        makeTile("X", 8, "dict-X"),
        makeTile("Y", 4, "dict-Y"),
        makeTile("Z", 10, "dict-Z"),
      ];
      game.playerRacks.set(playerId, [...tiles]);
      game.placeTiles(playerId, [
        { tile: tiles[0], row: 7, col: 6 },
        { tile: tiles[1], row: 7, col: 7 },
        { tile: tiles[2], row: 7, col: 8 },
      ]);
      const result = game.submitTurn(playerId);
      expect(result.valid).toBe(false);
    });

    it("valid submission scores correctly", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const { tiles, positions } = makeCasaTiles();
      game.playerRacks.set(playerId, [...tiles]);
      game.placeTiles(playerId, tiles.map((t, i) => ({
        tile: t,
        row: positions[i][0],
        col: positions[i][1],
      })));

      const result = game.submitTurn(playerId);
      expect(result.valid).toBe(true);
      expect(typeof result.score).toBe("number");
      expect(result.score!).toBeGreaterThan(0);
      expect(result.words).toBeDefined();
      expect(result.words!.length).toBeGreaterThan(0);
    });

    it("commits tiles to the board after valid submission", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const { tiles, positions } = makeCasaTiles();
      game.playerRacks.set(playerId, [...tiles]);
      game.placeTiles(playerId, tiles.map((t, i) => ({
        tile: t,
        row: positions[i][0],
        col: positions[i][1],
      })));

      game.submitTurn(playerId);

      // Tiles should be committed (not tentative) on the board
      for (let i = 0; i < positions.length; i++) {
        const [r, c] = positions[i];
        expect(game.board[r][c].tile).not.toBeNull();
        expect(game.board[r][c].tile!.letter).toBe(tiles[i].letter);
      }
    });

    it("draws new tiles after valid submission", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const { tiles, positions } = makeCasaTiles();
      game.playerRacks.set(playerId, [...tiles]);
      game.placeTiles(playerId, tiles.map((t, i) => ({
        tile: t,
        row: positions[i][0],
        col: positions[i][1],
      })));

      const bagBefore = game.tileBag.length;
      const rackBefore = game.playerRacks.get(playerId)!.length; // 0 after placing all 4
      game.submitTurn(playerId);

      // Player should have drawn tiles to fill rack up to SCRABBLE_RACK_SIZE
      const rack = game.playerRacks.get(playerId)!;
      const tilesToDraw = SCRABBLE_RACK_SIZE - rackBefore;
      expect(rack.length).toBe(Math.min(tilesToDraw, bagBefore));
      expect(game.tileBag.length).toBe(bagBefore - rack.length);
    });

    it("advances to the next player after valid submission", () => {
      setupGameForPlay(game);
      const firstPlayer = game.getCurrentTurnPlayerId()!;
      const secondPlayer = firstPlayer === "p1" ? "p2" : "p1";
      const { tiles, positions } = makeCasaTiles();
      game.playerRacks.set(firstPlayer, [...tiles]);
      game.placeTiles(firstPlayer, tiles.map((t, i) => ({
        tile: t,
        row: positions[i][0],
        col: positions[i][1],
      })));

      game.submitTurn(firstPlayer);
      game.clearTimers();

      expect(game.getCurrentTurnPlayerId()).toBe(secondPlayer);
    });

    it("resets consecutivePasses on valid submission", () => {
      setupGameForPlay(game);
      const firstPlayer = game.getCurrentTurnPlayerId()!;

      // Pass first to increment consecutivePasses
      game.passTurn(firstPlayer);
      game.clearTimers();
      expect(game.consecutivePasses).toBeGreaterThan(0);

      // Now the second player makes a valid move
      const secondPlayer = game.getCurrentTurnPlayerId()!;
      const { tiles, positions } = makeCasaTiles();
      game.playerRacks.set(secondPlayer, [...tiles]);
      game.placeTiles(secondPlayer, tiles.map((t, i) => ({
        tile: t,
        row: positions[i][0],
        col: positions[i][1],
      })));

      game.submitTurn(secondPlayer);
      game.clearTimers();

      expect(game.consecutivePasses).toBe(0);
    });

    it("records move in moveHistory", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const { tiles, positions } = makeCasaTiles();
      game.playerRacks.set(playerId, [...tiles]);
      game.placeTiles(playerId, tiles.map((t, i) => ({
        tile: t,
        row: positions[i][0],
        col: positions[i][1],
      })));

      const historyBefore = game.moveHistory.length;
      game.submitTurn(playerId);
      game.clearTimers();

      expect(game.moveHistory.length).toBe(historyBefore + 1);
      const lastMove = game.moveHistory[game.moveHistory.length - 1];
      expect(lastMove.type).toBe("place");
      expect(lastMove.score).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // passTurn
  // ===========================================================================
  describe("passTurn", () => {
    it("advances to the next player", () => {
      setupGameForPlay(game);
      const firstPlayer = game.getCurrentTurnPlayerId()!;
      const secondPlayer = firstPlayer === "p1" ? "p2" : "p1";

      game.passTurn(firstPlayer);
      game.clearTimers();

      expect(game.getCurrentTurnPlayerId()).toBe(secondPlayer);
    });

    it("increments consecutivePasses", () => {
      setupGameForPlay(game);
      const passesBefore = game.consecutivePasses;
      const firstPlayer = game.getCurrentTurnPlayerId()!;

      game.passTurn(firstPlayer);
      game.clearTimers();

      expect(game.consecutivePasses).toBe(passesBefore + 1);
    });

    it("ends the game when all players pass consecutively", () => {
      setupGameForPlay(game);

      // Both players pass (2 players, 2 consecutive passes should end the game)
      const first = game.getCurrentTurnPlayerId()!;
      game.passTurn(first);
      game.clearTimers();

      const second = game.getCurrentTurnPlayerId()!;
      game.passTurn(second);
      game.clearTimers();

      expect(game.gameState).toBe("finished");
    });

    it("recalls tentative tiles before passing", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const tile = makeTile("A", 1, "pass-recall");
      game.playerRacks.set(playerId, [tile]);
      game.placeTiles(playerId, [{ tile, row: 7, col: 7 }]);

      // Tile should be on the board tentatively
      game.passTurn(playerId);
      game.clearTimers();

      // Tile should have been recalled: cell is empty, tile is back in rack
      expect(game.board[7][7].tile).toBeNull();
      const rack = game.playerRacks.get(playerId)!;
      expect(rack.find((t) => t.id === tile.id)).toBeDefined();
    });
  });

  // ===========================================================================
  // exchangeTiles
  // ===========================================================================
  describe("exchangeTiles", () => {
    it("swaps selected tiles with tiles from the bag", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const rack = game.playerRacks.get(playerId)!;
      const tileToExchange = rack[0];
      const bagBefore = game.tileBag.length;

      const result = game.exchangeTiles(playerId, [tileToExchange.id]);
      game.clearTimers();

      expect(result.success).toBe(true);
      // Rack size should stay the same
      expect(game.playerRacks.get(playerId)!.length).toBe(rack.length);
      // Bag size should stay the same (one removed, one returned)
      expect(game.tileBag.length).toBe(bagBefore);
    });

    it("rejects exchange if not enough tiles in the bag", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const rack = game.playerRacks.get(playerId)!;
      // Drain the bag
      game.tileBag.splice(0, game.tileBag.length);

      const tileIds = rack.map((t) => t.id);
      const result = game.exchangeTiles(playerId, tileIds);
      game.clearTimers();

      expect(result.success).toBe(false);
    });

    it("rejects exchange if not the player's turn", () => {
      setupGameForPlay(game);
      const currentPlayer = game.getCurrentTurnPlayerId()!;
      const otherPlayer = currentPlayer === "p1" ? "p2" : "p1";
      const rack = game.playerRacks.get(otherPlayer)!;

      const result = game.exchangeTiles(otherPlayer, [rack[0].id]);
      game.clearTimers();

      expect(result.success).toBe(false);
    });

    it("advances turn after exchange", () => {
      setupGameForPlay(game);
      const firstPlayer = game.getCurrentTurnPlayerId()!;
      const secondPlayer = firstPlayer === "p1" ? "p2" : "p1";
      const rack = game.playerRacks.get(firstPlayer)!;

      game.exchangeTiles(firstPlayer, [rack[0].id]);
      game.clearTimers();

      expect(game.getCurrentTurnPlayerId()).toBe(secondPlayer);
    });
  });

  // ===========================================================================
  // validatePlacement
  // ===========================================================================
  describe("validatePlacement", () => {
    it("rejects empty placements", () => {
      setupGameForPlay(game);
      const result = game.validatePlacement([]);
      expect(result.valid).toBe(false);
    });

    it("accepts tiles placed in the same row", () => {
      setupGameForPlay(game);
      const placements: TilePlacement[] = [
        { tile: makeTile("C", 3), row: 7, col: 6 },
        { tile: makeTile("A", 1), row: 7, col: 7 },
        { tile: makeTile("S", 1), row: 7, col: 8 },
        { tile: makeTile("A", 1), row: 7, col: 9 },
      ];
      const result = game.validatePlacement(placements);
      expect(result.valid).toBe(true);
    });

    it("accepts tiles placed in the same column", () => {
      setupGameForPlay(game);
      const placements: TilePlacement[] = [
        { tile: makeTile("C", 3), row: 5, col: 7 },
        { tile: makeTile("A", 1), row: 6, col: 7 },
        { tile: makeTile("S", 1), row: 7, col: 7 },
        { tile: makeTile("A", 1), row: 8, col: 7 },
      ];
      const result = game.validatePlacement(placements);
      expect(result.valid).toBe(true);
    });

    it("rejects tiles not in a line (scattered)", () => {
      setupGameForPlay(game);
      const placements: TilePlacement[] = [
        { tile: makeTile("C", 3), row: 7, col: 7 },
        { tile: makeTile("A", 1), row: 8, col: 8 },
        { tile: makeTile("S", 1), row: 9, col: 7 },
      ];
      const result = game.validatePlacement(placements);
      expect(result.valid).toBe(false);
    });

    it("first turn must cover the center square (7,7)", () => {
      setupGameForPlay(game);
      // Place tiles in valid row but not covering center
      const placements: TilePlacement[] = [
        { tile: makeTile("S", 1), row: 0, col: 0 },
        { tile: makeTile("O", 1), row: 0, col: 1 },
        { tile: makeTile("L", 1), row: 0, col: 2 },
      ];
      const result = game.validatePlacement(placements);
      expect(result.valid).toBe(false);
    });

    it("subsequent turn must touch an existing tile", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;

      // First: place "casa" covering center
      const { tiles, positions } = makeCasaTiles();
      game.playerRacks.set(playerId, [...tiles]);
      game.placeTiles(playerId, tiles.map((t, i) => ({
        tile: t,
        row: positions[i][0],
        col: positions[i][1],
      })));
      game.submitTurn(playerId);
      game.clearTimers();

      // Second player places tiles far from existing tiles
      const secondPlayer = game.getCurrentTurnPlayerId()!;
      const isolatedPlacements: TilePlacement[] = [
        { tile: makeTile("S", 1), row: 0, col: 0 },
        { tile: makeTile("O", 1), row: 0, col: 1 },
        { tile: makeTile("L", 1), row: 0, col: 2 },
      ];
      game.playerRacks.set(secondPlayer, isolatedPlacements.map((p) => p.tile));
      game.placeTiles(secondPlayer, isolatedPlacements);

      const result = game.submitTurn(secondPlayer);
      expect(result.valid).toBe(false);
    });
  });

  // ===========================================================================
  // advanceTurn / getCurrentTurnPlayerId
  // ===========================================================================
  describe("advanceTurn / getCurrentTurnPlayerId", () => {
    it("advances to the next player in order", () => {
      setupGameForPlay(game);
      const first = game.getCurrentTurnPlayerId()!;
      const expected = first === "p1" ? "p2" : "p1";

      game.advanceTurn();
      game.clearTimers();

      expect(game.getCurrentTurnPlayerId()).toBe(expected);
    });

    it("wraps around when reaching the end of playerOrder", () => {
      setupGameForPlay(game);
      const first = game.getCurrentTurnPlayerId()!;

      // Advance twice to wrap around (2 players)
      game.advanceTurn();
      game.clearTimers();
      game.advanceTurn();
      game.clearTimers();

      expect(game.getCurrentTurnPlayerId()).toBe(first);
    });

    it("getCurrentTurnPlayerId returns the correct player ID", () => {
      setupGameForPlay(game);
      const currentId = game.getCurrentTurnPlayerId();
      expect(currentId).not.toBeNull();
      expect(game.playerOrder).toContain(currentId);
    });
  });

  // ===========================================================================
  // getGameState
  // ===========================================================================
  describe("getGameState", () => {
    it("returns the correct structure with board, players, and turn info", () => {
      setupGameForPlay(game);
      const state = game.getGameState();

      expect(state.board).toBeDefined();
      expect(state.board).toHaveLength(SCRABBLE_BOARD_SIZE);
      expect(state.players).toBeDefined();
      expect(state.players.length).toBeGreaterThanOrEqual(2);
      expect(state.gameState).toBe("playing");
      expect(state.currentTurnPlayerId).not.toBeNull();
      expect(typeof state.turnTimeLeft).toBe("number");
      expect(typeof state.consecutivePasses).toBe("number");
    });

    it("includes tileBagCount", () => {
      setupGameForPlay(game);
      const state = game.getGameState();
      expect(typeof state.tileBagCount).toBe("number");
      expect(state.tileBagCount).toBe(game.tileBag.length);
    });
  });

  // ===========================================================================
  // resetGame
  // ===========================================================================
  describe("resetGame", () => {
    it("resets to waiting state", () => {
      setupGameForPlay(game);
      game.resetGame();
      expect(game.gameState).toBe("waiting");
    });

    it("clears board and racks", () => {
      setupGameForPlay(game);
      game.resetGame();

      // Board should have all null tiles
      for (const row of game.board) {
        for (const cell of row) {
          expect(cell.tile).toBeNull();
        }
      }

      // Racks should be empty
      for (const rack of game.playerRacks.values()) {
        expect(rack).toHaveLength(0);
      }
    });
  });

  // ===========================================================================
  // endGame
  // ===========================================================================
  describe("endGame", () => {
    it("sets gameState to 'finished'", () => {
      setupGameForPlay(game);
      game.endGame();
      expect(game.gameState).toBe("finished");
    });

    it("deducts remaining tile values from player scores", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;

      // Give player a known score and known remaining tiles
      game.players.get(playerId)!.score = 20;
      game.playerRacks.set(playerId, [
        makeTile("Z", 10, "end-Z"),
        makeTile("Q", 5, "end-Q"),
      ]);

      game.endGame();

      // Score should be reduced by sum of remaining tile values (10 + 5 = 15)
      const finalScore = game.players.get(playerId)!.score;
      expect(finalScore).toBe(20 - 15);
    });

    it("calls updateScoreboard", () => {
      setupGameForPlay(game);
      game.endGame();
      expect(updateScoreboard).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // findFormedWords
  // ===========================================================================
  describe("findFormedWords", () => {
    it("finds words formed by a horizontal placement", () => {
      setupGameForPlay(game);
      const playerId = game.getCurrentTurnPlayerId()!;
      const { tiles, positions } = makeCasaTiles();
      game.playerRacks.set(playerId, [...tiles]);

      const placements = tiles.map((t, i) => ({
        tile: t,
        row: positions[i][0],
        col: positions[i][1],
      }));
      game.placeTiles(playerId, placements);

      const words = game.findFormedWords(placements);
      expect(words.length).toBeGreaterThan(0);
      const wordStrings = words.map((w) => w.word.toLowerCase());
      expect(wordStrings).toContain("casa");
    });
  });

  // ===========================================================================
  // isGameOver
  // ===========================================================================
  describe("isGameOver", () => {
    it("returns true when all players have passed consecutively", () => {
      setupGameForPlay(game);
      // Set consecutivePasses to equal player count
      game.consecutivePasses = game.playerOrder.length;
      expect(game.isGameOver()).toBe(true);
    });

    it("returns true when bag is empty and a player has no tiles", () => {
      setupGameForPlay(game);
      game.tileBag.splice(0, game.tileBag.length);
      const playerId = game.playerOrder[0];
      game.playerRacks.set(playerId, []);
      expect(game.isGameOver()).toBe(true);
    });

    it("returns false during normal play", () => {
      setupGameForPlay(game);
      expect(game.isGameOver()).toBe(false);
    });
  });
});
