"use client";

import { useScrabbleSocketListeners } from "@/hooks/use-scrabble-socket-listeners";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { ScrabbleBoard } from "../ScrabbleBoard";
import { TileRack } from "../TileRack";
import { TurnIndicator } from "../TurnIndicator";
import { ScrabbleControls } from "../ScrabbleControls";
import { ScrabbleInstructions } from "../ScrabbleInstructions";
import { useState, useEffect } from "react";

function JoinForm() {
  const { joinGame, rejoinGame } = useScrabbleSocket();
  const { isConnected, setGameId } = useScrabbleGameStore();
  const [name, setName] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedName = localStorage.getItem("scrabble-player-name");
    if (savedName) setName(savedName);

    // Try to rejoin if session exists
    const sessionStr = localStorage.getItem("scrabble-session");
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.gameId && session.playerName) {
          setGameId(session.gameId);
          rejoinGame(session.playerName, session.gameId);
        }
      } catch {
        localStorage.removeItem("scrabble-session");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoin = () => {
    const finalName = name.trim();
    if (finalName) {
      joinGame(finalName);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-900 to-green-700 p-4">
      <div className="w-full max-w-sm bg-gray-800 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold text-center mb-1">Scrabble</h1>
        <p className="text-gray-400 text-sm text-center mb-6">
          Juego de palabras por turnos
        </p>

        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="Tu nombre"
            className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <button
            onClick={handleJoin}
            disabled={!isConnected || !name.trim()}
            className="w-full py-2 rounded font-medium bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isConnected ? "Unirse" : "Conectando..."}
          </button>

          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full py-2 rounded font-medium bg-gray-700 hover:bg-gray-600 transition-colors text-sm"
          >
            {showInstructions ? "Ocultar reglas" : "Ver reglas"}
          </button>
        </div>

        {showInstructions && (
          <div className="mt-4">
            <ScrabbleInstructions />
          </div>
        )}
      </div>
    </div>
  );
}

function GameView() {
  const { gameState, currentPlayerId } = useScrabbleGameStore();

  const players = gameState?.players ?? [];
  const isFinished = gameState?.gameState === "finished";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-800 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-white text-lg font-bold">Scrabble</h1>
          <TurnIndicator />
        </div>

        {/* Players */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {players.map((p) => (
            <div
              key={p.id}
              className={`flex-shrink-0 px-3 py-1.5 rounded text-sm ${
                p.id === gameState?.currentTurnPlayerId
                  ? "bg-green-600 text-white"
                  : p.id === currentPlayerId
                    ? "bg-gray-600 text-white"
                    : "bg-gray-700 text-gray-300"
              }`}
            >
              <span className="font-medium">{p.name}</span>
              <span className="ml-2 text-xs opacity-75">{p.score}pts</span>
            </div>
          ))}
        </div>

        {/* Board */}
        <div className="flex justify-center overflow-auto">
          <ScrabbleBoard />
        </div>

        {/* Rack + Controls */}
        <div className="space-y-2">
          <TileRack />
          <ScrabbleControls />
        </div>

        {/* End game summary */}
        {isFinished && (
          <div className="bg-gray-800 rounded-lg p-4 text-center text-white">
            <h2 className="text-xl font-bold mb-2">Juego Terminado</h2>
            {players
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <div key={p.id} className="text-sm">
                  {i === 0 ? "🏆 " : ""}
                  {p.name}: {p.score} puntos
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ScrabbleGameMain() {
  useScrabbleSocketListeners();

  const { isJoined } = useScrabbleGameStore();

  return isJoined ? <GameView /> : <JoinForm />;
}
