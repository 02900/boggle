import { describe, it, expect } from "vitest";
import { describeGameEnd, describeTurnChanged, describeTurnPlayed } from "../scrabble-messages";

const base = { playerId: "p1", playerName: "Bob" };

describe("describeTurnPlayed", () => {
  it("place: lists words and score, first vs third person", () => {
    const event = { ...base, type: "place" as const, score: 12, words: [{ word: "casa", score: 12, tiles: [] }] };
    expect(describeTurnPlayed(event, false)).toBe("Bob jugó CASA · +12 pts");
    expect(describeTurnPlayed(event, true)).toBe("Jugaste CASA · +12 pts");
  });

  it("pass / timeout / disconnect", () => {
    expect(describeTurnPlayed({ ...base, type: "pass" }, false)).toBe("Bob pasó");
    expect(describeTurnPlayed({ ...base, type: "pass" }, true)).toBe("Pasaste el turno");
    expect(describeTurnPlayed({ ...base, type: "timeout" }, false)).toBe("Se agotó el tiempo de Bob");
    expect(describeTurnPlayed({ ...base, type: "disconnect" }, false)).toBe("Bob perdió el turno por desconexión");
  });

  it("exchange: pluralizes fichas", () => {
    expect(describeTurnPlayed({ ...base, type: "exchange", exchangedCount: 1 }, false)).toBe("Bob cambió 1 ficha");
    expect(describeTurnPlayed({ ...base, type: "exchange", exchangedCount: 3 }, true)).toBe("Cambiaste 3 fichas");
  });
});

describe("describeTurnChanged", () => {
  const event = { previousPlayerId: "p1", currentPlayerId: "p2", currentPlayerName: "Bob", reason: "pass" as const };
  it("addresses me directly when it's my turn", () => {
    expect(describeTurnChanged(event, true)).toBe("¡Tu turno!");
    expect(describeTurnChanged(event, false)).toBe("Turno de Bob");
  });
});

describe("describeGameEnd", () => {
  it("covers every reason", () => {
    expect(describeGameEnd("passes")).toMatch(/pasaron/);
    expect(describeGameEnd("bag-empty")).toMatch(/fichas/);
    expect(describeGameEnd("abandon")).toMatch(/abandono/);
  });
});
