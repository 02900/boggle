import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { TileRack } from "../TileRack";
import { setupGame, tile } from "./test-utils";

const store = () => useScrabbleGameStore.getState();
const rackLetters = () =>
  screen.getAllByRole("button", { name: /^Ficha/ }).map((b) => b.getAttribute("data-letter"));

// jsdom has no DataTransfer; the rack only sets data on it
const dataTransfer = () => ({ setData: vi.fn(), effectAllowed: "", dropEffect: "" });

describe("TileRack", () => {
  beforeEach(() => {
    setupGame({ rack: [tile("A"), tile("B", 3), tile("C", 3)] });
  });

  it("shows the rack in the player's order, without tiles placed on the board, plus empty slots", () => {
    store().moveRackTile("t-C", "t-A");
    store().setTentativePlacements([{ tile: tile("B", 3), row: 7, col: 7 }]);
    const { container } = render(<TileRack />);

    expect(rackLetters()).toEqual(["C", "A"]);
    expect(container.querySelectorAll('[data-testid="tile-rack"] > [aria-hidden]')).toHaveLength(5);
  });

  it("clicking a tile selects it, clicking again deselects", async () => {
    render(<TileRack />);
    const a = screen.getByRole("button", { name: "Ficha A, 1 puntos" });

    await userEvent.click(a);
    expect(a).toHaveAttribute("aria-pressed", "true");
    expect(store().selectedTile?.id).toBe("t-A");

    await userEvent.click(a);
    expect(store().selectedTile).toBeNull();
  });

  it("in exchange mode clicking toggles tiles for the exchange", async () => {
    store().setExchangeMode(true);
    render(<TileRack />);

    await userEvent.click(screen.getByRole("button", { name: "Ficha B, 3 puntos" }));

    expect([...store().selectedForExchange]).toEqual(["t-B"]);
    expect(store().selectedTile).toBeNull();
  });

  it("shuffle keeps the same tiles and is disabled with fewer than two", async () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    render(<TileRack />);

    await userEvent.click(screen.getByRole("button", { name: "Mezclar fichas" }));
    expect(rackLetters()).not.toEqual(["A", "B", "C"]);
    expect([...rackLetters()].sort()).toEqual(["A", "B", "C"]);
    random.mockRestore();

    store().setRack([tile("A")]);
    expect(await screen.findByRole("button", { name: "Mezclar fichas" })).toBeDisabled();
  });

  it("dragging a tile onto another takes its place", () => {
    render(<TileRack />);
    const holder = (letter: string) => screen.getByRole("button", { name: new RegExp(`^Ficha ${letter},`) }).parentElement!;

    fireEvent.dragStart(holder("A"), { dataTransfer: dataTransfer() });
    fireEvent.dragOver(holder("C"), { dataTransfer: dataTransfer() });
    fireEvent.drop(holder("C"), { dataTransfer: dataTransfer() });

    expect(rackLetters()).toEqual(["B", "C", "A"]);
  });
});
