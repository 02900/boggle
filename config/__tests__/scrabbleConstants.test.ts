import { describe, it, expect } from "vitest";
import {
  SCRABBLE_TURN_TIME_LIMIT,
  SCRABBLE_GRACE_PERIOD,
  SCRABBLE_BOARD_SIZE,
  SCRABBLE_RACK_SIZE,
  SCRABBLE_BINGO_BONUS,
} from "../scrabbleConstants";

describe("scrabble constants", () => {
  it("SCRABBLE_TURN_TIME_LIMIT es 120 segundos", () => {
    expect(SCRABBLE_TURN_TIME_LIMIT).toBe(120);
  });

  it("SCRABBLE_GRACE_PERIOD es 30000ms", () => {
    expect(SCRABBLE_GRACE_PERIOD).toBe(30000);
  });

  it("SCRABBLE_BOARD_SIZE es 15", () => {
    expect(SCRABBLE_BOARD_SIZE).toBe(15);
  });

  it("SCRABBLE_RACK_SIZE es 7", () => {
    expect(SCRABBLE_RACK_SIZE).toBe(7);
  });

  it("SCRABBLE_BINGO_BONUS es 50", () => {
    expect(SCRABBLE_BINGO_BONUS).toBe(50);
  });
});
