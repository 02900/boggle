import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { ScrabbleBoard } from "../ScrabbleBoard";
import { blank, setupGame, socketActions, tile } from "./test-utils";

vi.mock("@/hooks/use-scrabble-socket", () => ({ useScrabbleSocket: () => socketActions }));

const cell = (name: string) => screen.getByRole("gridcell", { name: new RegExp(`^${name}(,|$)`) });
const store = () => useScrabbleGameStore.getState();

describe("ScrabbleBoard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders 225 cells named by coordinate", () => {
    setupGame();
    render(<ScrabbleBoard />);

    expect(screen.getAllByRole("gridcell")).toHaveLength(225);
    expect(cell("H8")).toHaveAccessibleName("H8, centro");
    expect(cell("A1")).toHaveAccessibleName("A1, palabra triple");
  });

  it("places the selected tile on a clicked cell", async () => {
    const c = tile("C", 3);
    setupGame({ rack: [c] });
    store().setSelectedTile(c);
    render(<ScrabbleBoard />);

    await userEvent.click(cell("H8"));

    expect(socketActions.placeTiles).toHaveBeenCalledWith([{ tile: c, row: 7, col: 7 }]);
    expect(store().tentativePlacements).toEqual([{ tile: c, row: 7, col: 7 }]);
    expect(store().selectedTile).toBeNull();
    expect(within(cell("H8")).getByTestId("tile")).toHaveAttribute("data-letter", "C");
  });

  it("clicking a tentative tile takes it back", async () => {
    const c = tile("C", 3);
    setupGame({ rack: [c] });
    store().setTentativePlacements([{ tile: c, row: 7, col: 7 }]);
    render(<ScrabbleBoard />);

    expect(cell("H8")).toHaveAccessibleName(/^H8, C colocada/);
    await userEvent.click(cell("H8"));

    expect(socketActions.recallTile).toHaveBeenCalledWith(c.id);
  });

  it("does nothing when it isn't my turn", async () => {
    const c = tile("C", 3);
    setupGame({ myTurn: false, rack: [c] });
    store().setSelectedTile(c);
    render(<ScrabbleBoard />);

    await userEvent.click(cell("H8"));

    expect(socketActions.placeTiles).not.toHaveBeenCalled();
    expect(cell("H8")).toHaveAttribute("aria-disabled", "true");
  });

  it("asks which letter a blank stands for, offering only valid Spanish letters", async () => {
    const b = blank();
    setupGame({ rack: [b] });
    store().setSelectedTile(b);
    render(<ScrabbleBoard />);

    await userEvent.click(cell("H8"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "K" })).toBeNull();
    await userEvent.click(within(dialog).getByRole("button", { name: "LL" }));

    expect(socketActions.placeTiles).toHaveBeenCalledWith([{ tile: { ...b, assignedLetter: "LL" }, row: 7, col: 7 }]);
  });

  describe("keyboard", () => {
    it("H8 is the tab stop; arrows move focus", async () => {
      setupGame();
      render(<ScrabbleBoard />);

      await userEvent.tab();
      expect(cell("H8")).toHaveFocus();
      await userEvent.keyboard("{ArrowUp}{ArrowLeft}");
      expect(cell("G7")).toHaveFocus();
      expect(cell("G7")).toHaveAttribute("tabindex", "0");
      expect(cell("H8")).toHaveAttribute("tabindex", "-1");
    });

    it("typing places matching rack tiles and advances across", async () => {
      const c = tile("C", 3);
      const a = tile("A", 1);
      setupGame({ rack: [a, c] });
      render(<ScrabbleBoard />);

      await userEvent.tab();
      await userEvent.keyboard("ca");

      expect(socketActions.placeTiles).toHaveBeenNthCalledWith(1, [{ tile: c, row: 7, col: 7 }]);
      expect(socketActions.placeTiles).toHaveBeenNthCalledWith(2, [{ tile: a, row: 7, col: 8 }]);
      expect(cell("J8")).toHaveFocus();
    });

    it("a blank covers a letter I don't have; a missing letter is reported", async () => {
      const b = blank();
      setupGame({ rack: [b] });
      render(<ScrabbleBoard />);

      await userEvent.tab();
      await userEvent.keyboard("k");
      expect(socketActions.placeTiles).not.toHaveBeenCalled();
      expect(store().notifications.at(-1)?.text).toBe("No tienes la letra K");

      await userEvent.keyboard("e");
      expect(socketActions.placeTiles).toHaveBeenCalledWith([{ tile: { ...b, assignedLetter: "E" }, row: 7, col: 7 }]);
    });

    it("Backspace steps back and takes the previous tile back", async () => {
      const c = tile("C", 3);
      setupGame({ rack: [c] });
      render(<ScrabbleBoard />);

      await userEvent.tab();
      await userEvent.keyboard("c");
      expect(cell("I8")).toHaveFocus();
      await userEvent.keyboard("{Backspace}");

      expect(cell("H8")).toHaveFocus();
      expect(socketActions.recallTile).toHaveBeenCalledWith(c.id);
    });
  });
});
