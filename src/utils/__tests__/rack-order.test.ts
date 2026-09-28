import { describe, it, expect } from "vitest";
import { moveTile, orderRack, shuffleIds } from "../rack-order";
import type { ScrabbleTile } from "@/interfaces/scrabble";

const t = (id: string): ScrabbleTile => ({ id, letter: id.toUpperCase(), value: 1, isBlank: false });
const ids = (tiles: ScrabbleTile[]) => tiles.map((x) => x.id);

describe("orderRack", () => {
  it("follows the saved order, appends unknown tiles, ignores stale ids", () => {
    const rack = [t("a"), t("b"), t("c"), t("d")];
    expect(ids(orderRack(rack, ["c", "gone", "a"]))).toEqual(["c", "a", "b", "d"]);
  });

  it("is the server order when there's no preference", () => {
    expect(ids(orderRack([t("a"), t("b")], []))).toEqual(["a", "b"]);
  });
});

describe("moveTile", () => {
  it("takes the target's place moving right and left", () => {
    expect(moveTile(["a", "b", "c", "d"], "a", "c")).toEqual(["b", "c", "a", "d"]);
    expect(moveTile(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
  });

  it("moves to the end without a target and ignores unknown ids", () => {
    expect(moveTile(["a", "b", "c"], "a", null)).toEqual(["b", "c", "a"]);
    expect(moveTile(["a", "b"], "x", "a")).toEqual(["a", "b"]);
    expect(moveTile(["a", "b"], "a", "a")).toEqual(["a", "b"]);
  });
});

describe("shuffleIds", () => {
  it("keeps every id exactly once", () => {
    expect(shuffleIds(["a", "b", "c", "d"], () => 0).sort()).toEqual(["a", "b", "c", "d"]);
    expect(shuffleIds(["a", "b", "c", "d"], () => 0)).not.toEqual(["a", "b", "c", "d"]);
  });
});
