import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { ScrabbleScoreboard } from "../ScrabbleScoreboard";
import { socketActions } from "./test-utils";

vi.mock("@/hooks/use-scrabble-socket", () => ({ useScrabbleSocket: () => socketActions }));

const entries = [
  { name: "Ana", score: 312, date: "2026-10-01", playerCount: 2 },
  { name: "Bob", score: 250, date: "2026-10-02", playerCount: 3 },
  { name: "Caro", score: 198, date: "2026-10-03", playerCount: 2 },
  { name: "Dani", score: 120, date: "2026-10-04", playerCount: 2 },
];
const rows = () => screen.getAllByTestId("scoreboard-row").map((r) => r.textContent);
const loaded = (data: typeof entries) => act(() => useScrabbleGameStore.getState().setScoreboard(data));

describe("ScrabbleScoreboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useScrabbleGameStore.getState().reset();
  });

  it("asks the server for Scrabble's scoreboard only when opened", () => {
    const { rerender } = render(<ScrabbleScoreboard open={false} onClose={() => {}} />);
    expect(socketActions.requestScoreboard).not.toHaveBeenCalled();

    rerender(<ScrabbleScoreboard open onClose={() => {}} />);
    expect(socketActions.requestScoreboard).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando puntajes…");
  });

  it("lists entries best first with medals, date and table size", () => {
    render(<ScrabbleScoreboard open onClose={() => {}} />);
    loaded(entries);

    expect(rows()[0]).toMatch(/^🥇Ana01\/10\/2026 · 2 jugadores312$/);
    expect(rows()[3]).toMatch(/^4Dani/);
  });

  it("filters by table size", async () => {
    render(<ScrabbleScoreboard open onClose={() => {}} />);
    loaded(entries);

    await userEvent.click(screen.getByRole("tab", { name: "3 jugadores" }));
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toMatch(/Bob/);

    await userEvent.click(screen.getByRole("tab", { name: "Todos" }));
    expect(rows()).toHaveLength(4);
  });

  it("shows an empty state", () => {
    render(<ScrabbleScoreboard open onClose={() => {}} />);
    loaded([]);

    expect(screen.getByText(/Todavía no hay puntajes de Scrabble/)).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).toBeNull();
  });
});
