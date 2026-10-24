"use client";

import { useScrabbleSocketListeners } from "@/hooks/use-scrabble-socket-listeners";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { ScrabbleRoomPicker } from "../ScrabbleRoomPicker";
import { ScrabbleLobby } from "../ScrabbleLobby";
import { ScrabbleTable } from "../ScrabbleTable";
import { Toaster } from "../Toaster";

/** Screen router: room picker → lobby (waiting) → table (playing / finished). */
export function ScrabbleGameMain() {
  useScrabbleSocketListeners();
  const isJoined = useScrabbleGameStore((s) => s.isJoined);
  const phase = useScrabbleGameStore((s) => s.gameState?.gameState ?? "waiting");

  return (
    <>
      <Toaster />
      {!isJoined ? <ScrabbleRoomPicker /> : phase === "waiting" ? <ScrabbleLobby /> : <ScrabbleTable />}
    </>
  );
}
