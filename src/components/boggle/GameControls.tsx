import React from "react";
import { useSocket } from "@/hooks/useSocket";
import { GameStatus } from "@/interfaces/game";
import { ModalType, useModalStore } from "@/stores/modal.store";
import { useSocketsStore } from "@/stores/sockets.store";
import { useBoggleGameMainStore } from "./BoggleGameMain/boogle-game-main.store";
import { ClientValidationToggle } from "./ClientValidationToggle";

export const GameControls = () => {
  const { isConnected } = useSocketsStore();
  const { modalType, setModalType } = useModalStore();
  const { gameState, rotationCooldown, rotationMessage } =
    useBoggleGameMainStore();
  const { startGame, rotateBoard, resetGame } = useSocket();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = (status: GameStatus): string => {
    switch (status) {
      case "waiting":
        return "text-yellow-600";
      case "playing":
        return "text-green-600";
      case "finished":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusText = (status: GameStatus): string => {
    switch (status) {
      case "waiting":
        return "esperando";
      case "playing":
        return "jugando";
      case "finished":
        return "terminado";
      default:
        return "desconocido";
    }
  };

  const getStatusIcon = (status: GameStatus): string => {
    switch (status) {
      case "waiting":
        return "⏳";
      case "playing":
        return "🎮";
      case "finished":
        return "🏁";
      default:
        return "❓";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Estado de Conexión */}
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
          <span className="text-sm text-gray-600">
            {isConnected ? "Conectado" : "Desconectado"}
          </span>
        </div>

        {/* Estado del Juego */}
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon(gameState.gameState)}</span>
          <div className="text-lg font-semibold">
            Estado:{" "}
            <span
              className={`capitalize ${getStatusColor(gameState.gameState)}`}
            >
              {getStatusText(gameState.gameState)}
            </span>
          </div>
        </div>

        {/* Temporizador */}
        {gameState.gameState === "playing" && (
          <div className="flex items-center space-x-2">
            <span className="text-lg">⏰</span>
            <div
              className={`text-xl font-bold ${
                gameState.timeLeft <= 30
                  ? "text-red-600 animate-pulse"
                  : "text-blue-600"
              }`}
            >
              {formatTime(gameState.timeLeft)}
            </div>
          </div>
        )}

        {/* Controles */}
        <div className="flex space-x-2">
          {gameState.gameState === "waiting" && (
            <button
              onClick={startGame}
              disabled={!isConnected}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
            >
              <span>🚀</span>
              <span>Iniciar Juego</span>
            </button>
          )}

          {gameState.gameState === "playing" && (
            <button
              onClick={rotateBoard}
              disabled={!isConnected || rotationCooldown > 0}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
              title={
                rotationCooldown > 0
                  ? `Espera ${rotationCooldown}s`
                  : "Rotar tablero 90°"
              }
            >
              <span>🔄</span>
              <span>
                {rotationCooldown > 0 ? `${rotationCooldown}s` : "Rotar"}
              </span>
            </button>
          )}

          {gameState.gameState === "finished" &&
            modalType === ModalType.MaxScore && (
              <>
                <button
                  onClick={() => setModalType(ModalType.MaxScore)}
                  disabled={!isConnected}
                  className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
                >
                  <span>🏆</span>
                  <span>Puntuación Máxima</span>
                </button>

                <button
                  onClick={resetGame}
                  disabled={!isConnected}
                  className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
                >
                  <span>♾️</span>
                  <span>Reiniciar</span>
                </button>
              </>
            )}
        </div>
      </div>

      {/* Barra de Progreso del Juego */}
      {gameState.gameState === "playing" && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${
                gameState.timeLeft <= 30
                  ? "bg-red-500"
                  : gameState.timeLeft <= 60
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${(gameState.timeLeft / 180) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            Progreso del Juego
          </div>
        </div>
      )}

      {/* Mensaje de Error de Rotación */}
      {rotationMessage && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <div className="text-red-700 text-sm font-medium text-center">
            {rotationMessage}
          </div>
        </div>
      )}

      {/* Feature Flag: Validación del Cliente */}
      <div className="mt-4">
        <ClientValidationToggle />
      </div>
    </div>
  );
};
