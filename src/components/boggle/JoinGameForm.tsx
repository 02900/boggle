import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSocketsStore } from "@/stores/sockets.store";
import { useRoomList } from "@/hooks/use-room-list";
import { isRoomCode, normalizeRoomCodeInput, readRoomCodeFromUrl } from "@/utils/room-url";
import { useBoggleGameMain } from "./BoggleGameMain/use-boggle-game-main";
import { useBoggleGameMainStore } from "./BoggleGameMain/boogle-game-main.store";
import { Scoreboard } from "../shared/Scoreboard";

const STATUS_LABEL = { waiting: "Esperando", playing: "En juego", finished: "Terminada" } as const;

export const JoinGameForm = () => {
  const { isConnected, socket } = useSocketsStore();
  const { handleCreateRoom, handleJoinRoom } = useBoggleGameMain();
  const joinError = useBoggleGameMainStore((s) => s.joinError);
  const rooms = useRoomList(socket);

  const [playerName, setPlayerName] = useState("");
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [useRandomName, setUseRandomName] = useState(true);
  const [code, setCode] = useState("");
  const [linkedCode, setLinkedCode] = useState<string | null>(null);

  // Cargar nombre desde localStorage y el código de sala desde el link (?sala=)
  useEffect(() => {
    const savedName = localStorage.getItem("boggle-player-name");
    if (savedName) {
      setPlayerName(savedName);
      setUseRandomName(false);
    }
    const fromUrl = readRoomCodeFromUrl();
    setLinkedCode(fromUrl);
    if (fromUrl) setCode(fromUrl);
  }, []);

  // Nombre vacío = el servidor asigna uno aleatorio
  const nameToSend = useRandomName ? "" : playerName.trim();
  const canAct = isConnected && (useRandomName || playerName.trim().length > 0);
  const linkedRoom = linkedCode ? rooms?.find((r) => r.code === linkedCode) : undefined;

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (canAct && isRoomCode(code)) handleJoinRoom(code, nameToSend);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          ← Juegos
        </Link>

        {/* Encabezado */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎲</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Boggle</h1>
          <p className="text-gray-600">¡Únete al desafío multijugador de búsqueda de palabras!</p>
        </div>

        {/* Estado de Conexión */}
        <div className="mb-4 p-3 rounded-lg border">
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
            <span className={`text-sm font-medium ${isConnected ? "text-green-700" : "text-red-700"}`}>
              {isConnected ? "✅ Conectado al servidor" : "❌ Conectando al servidor..."}
            </span>
          </div>
        </div>

        {/* Opciones de nombre */}
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="randomName"
                name="nameOption"
                checked={useRandomName}
                onChange={() => setUseRandomName(true)}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="randomName" className="text-sm font-medium text-gray-700">
                🎲 Usar nombre aleatorio
              </label>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="customName"
                name="nameOption"
                checked={!useRandomName}
                onChange={() => setUseRandomName(false)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="customName" className="text-sm font-medium text-gray-700">
                ✏️ Usar nombre personalizado
              </label>
            </div>

            {!useRandomName && (
              <div className="ml-7 mt-3">
                <input
                  type="text"
                  placeholder="Tu nombre personalizado"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                  maxLength={20}
                  disabled={!isConnected}
                />
                <div className="text-xs text-gray-500 mt-1">{playerName.length}/20 caracteres</div>
              </div>
            )}
          </div>
        </div>

        {joinError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 text-center">
            {joinError}
          </p>
        )}

        {/* Invitación por link */}
        {linkedCode && (
          <div className="mt-4 p-4 rounded-lg border-2 border-blue-300 bg-blue-50 text-center" data-testid="linked-room">
            <p className="text-sm text-gray-700">
              Te invitaron a la sala <span className="font-mono font-bold">{linkedCode}</span>
              {linkedRoom && ` de ${linkedRoom.hostName}`}
            </p>
            <button
              type="button"
              onClick={() => handleJoinRoom(linkedCode, nameToSend)}
              disabled={!canAct}
              className="mt-2 w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              🚀 Unirse a {linkedCode}
            </button>
          </div>
        )}

        {/* Salas abiertas */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">Salas abiertas</h2>
            {rooms && <span className="text-xs text-gray-500">{rooms.length}</span>}
          </div>
          {rooms === null ? (
            <p className="text-sm text-gray-500 text-center py-3">Buscando salas…</p>
          ) : rooms.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-3 border border-dashed border-gray-300 rounded-lg">
              No hay salas abiertas. ¡Crea una!
            </p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto" data-testid="room-list">
              {rooms.map((room) => (
                <li
                  key={room.code}
                  data-testid="room-row"
                  data-code={room.code}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
                >
                  <span className="font-mono font-bold text-gray-800">{room.code}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800 truncate">Sala de {room.hostName}</div>
                    <div className="text-xs text-gray-500">
                      {room.playerCount} jugador{room.playerCount === 1 ? "" : "es"} · {STATUS_LABEL[room.status]}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleJoinRoom(room.code, nameToSend)}
                    disabled={!canAct || !room.joinable}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold py-1.5 px-3 rounded-md transition-colors"
                  >
                    Unirse
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Crear sala / unirse con código */}
        <div className="space-y-3 mt-4">
          <button
            type="button"
            onClick={() => handleCreateRoom(nameToSend)}
            disabled={!canAct}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>➕</span>
            <span>Crear sala</span>
          </button>

          <form onSubmit={handleJoinByCode} className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(normalizeRoomCodeInput(e.target.value))}
              placeholder="Código"
              aria-label="Código de sala"
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md font-mono uppercase tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
            />
            <button
              type="submit"
              disabled={!canAct || !isRoomCode(code)}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-md transition-colors"
            >
              Unirse con código
            </button>
          </form>
        </div>

        {/* Botón para ver scoreboard */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowScoreboard(true)}
            disabled={!isConnected}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2 shadow-md"
          >
            <span>🏆</span>
            <span>Ver Mejores Puntajes</span>
          </button>
        </div>
      </div>

      {showScoreboard && <Scoreboard onClose={() => setShowScoreboard(false)} />}
    </div>
  );
};
