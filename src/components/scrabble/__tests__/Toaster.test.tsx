import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { Toaster } from "../Toaster";

const notify = (...args: Parameters<ReturnType<typeof useScrabbleGameStore.getState>["notify"]>) =>
  act(() => {
    useScrabbleGameStore.getState().notify(...args);
  });

describe("Toaster", () => {
  beforeEach(() => {
    useScrabbleGameStore.getState().reset();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("renders nothing without notifications", () => {
    const { container } = render(<Toaster />);
    expect(container).toBeEmptyDOMElement();
  });

  it("announces toasts politely; errors as alerts", () => {
    render(<Toaster />);
    notify("info", "Bob se unió");
    notify("error", "Jugada inválida");

    expect(screen.getByRole("status")).toHaveTextContent("Bob se unió");
    expect(screen.getByRole("alert")).toHaveTextContent("Jugada inválida");
    expect(screen.getByRole("status").closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
  });

  it("dismisses after its ttl, or on click; ttl 0 stays", () => {
    render(<Toaster />);
    notify("turn", "¡Tu turno!", 1000);
    notify("info", "Fija", 0);

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByText("¡Tu turno!")).toBeNull();

    fireEvent.click(screen.getByText("Fija"));
    expect(screen.queryByText("Fija")).toBeNull();
  });

  it("keeps at most 4 visible, dropping the oldest", () => {
    render(<Toaster />);
    for (let i = 1; i <= 5; i++) notify("info", `n${i}`, 0);

    expect(screen.getAllByTestId("toast").map((t) => t.textContent)).toEqual(["•n2", "•n3", "•n4", "•n5"]);
  });
});
