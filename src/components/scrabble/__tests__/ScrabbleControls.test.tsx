import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { ScrabbleControls } from "../ScrabbleControls";
import { setupGame, socketActions, tile } from "./test-utils";

vi.mock("@/hooks/use-scrabble-socket", () => ({ useScrabbleSocket: () => socketActions }));

const store = () => useScrabbleGameStore.getState();
const hint = () => screen.getByTestId("move-hint");

describe("ScrabbleControls", () => {
  beforeEach(() => vi.clearAllMocks());

  it("off turn: waits for the current player and offers no actions", () => {
    setupGame({ myTurn: false });
    render(<ScrabbleControls />);

    expect(screen.getByRole("status")).toHaveTextContent("Esperando a Bob…");
    expect(screen.queryByRole("button", { name: /Confirmar/ })).toBeNull();
    expect(screen.queryByTestId("skip-turn")).toBeNull();
  });

  it("off turn in overtime: offers to skip the late player's turn", async () => {
    setupGame({ myTurn: false, state: { turnTimeLeft: -3 } });
    render(<ScrabbleControls />);

    await userEvent.click(screen.getByRole("button", { name: "Saltar turno de Bob" }));
    expect(socketActions.skipTurn).toHaveBeenCalled();
  });

  it("my turn without tiles placed: Confirmar and Devolver are disabled", () => {
    setupGame();
    render(<ScrabbleControls />);

    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Devolver" })).toBeDisabled();
    expect(hint()).toBeEmptyDOMElement();
  });

  it("previews the formed words and score, then submits", async () => {
    setupGame();
    store().setTentativePlacements([
      { tile: tile("E"), row: 7, col: 7 },
      { tile: tile("S"), row: 7, col: 8 },
    ]);
    render(<ScrabbleControls />);

    // ES through the center (double word): (1 + 1) × 2
    expect(hint()).toHaveTextContent("ES 4");
    const confirm = screen.getByRole("button", { name: "Confirmar +4" });
    await userEvent.click(confirm);
    expect(socketActions.submitTurn).toHaveBeenCalled();
  });

  it("explains why a placement is invalid", () => {
    setupGame();
    store().setTentativePlacements([{ tile: tile("E"), row: 0, col: 0 }]);
    render(<ScrabbleControls />);

    expect(hint()).toHaveTextContent("La primera palabra debe cubrir la casilla central");
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
  });

  it("exchange needs 7 tiles in the bag", () => {
    setupGame({ rack: [tile("A")], state: { tileBagCount: 6 } });
    render(<ScrabbleControls />);

    const change = screen.getByRole("button", { name: "Cambiar" });
    expect(change).toBeDisabled();
    expect(change).toHaveAttribute("title", "Solo se puede cambiar con al menos 7 fichas en la bolsa");
  });

  it("exchange mode sends the selected tiles", async () => {
    setupGame({ rack: [tile("A"), tile("B")] });
    render(<ScrabbleControls />);

    await userEvent.click(screen.getByRole("button", { name: "Cambiar" }));
    expect(hint()).toHaveTextContent("Selecciona las fichas que quieres cambiar");
    store().toggleExchangeSelection("t-B");
    await userEvent.click(await screen.findByRole("button", { name: "Confirmar cambio (1)" }));

    expect(socketActions.exchangeTiles).toHaveBeenCalledWith(["t-B"]);
    expect(store().exchangeMode).toBe(false);
  });

  it("pass and recall go to the server", async () => {
    setupGame();
    store().setTentativePlacements([{ tile: tile("E"), row: 7, col: 7 }]);
    render(<ScrabbleControls />);

    await userEvent.click(screen.getByRole("button", { name: "Devolver" }));
    await userEvent.click(screen.getByRole("button", { name: "Pasar" }));
    expect(socketActions.recallTiles).toHaveBeenCalled();
    expect(socketActions.passTurn).toHaveBeenCalled();
  });
});
