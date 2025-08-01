import { useScoreboardStore } from "@/stores/scoreboard.store";
import React, { useEffect, useState } from "react";

export const Scoreboard = ({ onClose }: { onClose: () => void }) => {
  const { scoreboard, isLoading, requestScoreboard } = useScoreboardStore();
  const [activeTab, setActiveTab] = useState<number | "all">("all");

  useEffect(() => {
    // Request scoreboard data when component mounts
    requestScoreboard();
  }, [requestScoreboard]);

  // Agrupar scoreboard por número de jugadores
  const groupedByPlayerCount = scoreboard.reduce((acc, entry) => {
    const playerCount = entry.playerCount || 1; // Default a 1 para entradas antiguas
    if (!acc[playerCount]) {
      acc[playerCount] = [];
    }
    acc[playerCount].push(entry);
    return acc;
  }, {} as Record<number, typeof scoreboard>);

  // Obtener números de jugadores disponibles, ordenados
  const availablePlayerCounts = Object.keys(groupedByPlayerCount)
    .map(Number)
    .sort((a, b) => a - b);

  // Obtener datos filtrados según el tab activo
  const filteredScoreboard =
    activeTab === "all" ? scoreboard : groupedByPlayerCount[activeTab] || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getMedalEmoji = (position: number) => {
    switch (position) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `${position}°`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🏆</span>
              <h2 className="text-xl font-bold">Mejores Puntajes</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
          <p className="text-yellow-100 text-sm mt-2">
            Los 10 mejores puntajes de todos los tiempos
          </p>
        </div>

        {/* Tabs */}
        {availablePlayerCounts.length > 0 && (
          <div className="border-b bg-white">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === "all"
                    ? "border-orange-500 text-orange-600 bg-orange-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Todos ({scoreboard.length})
              </button>
              {availablePlayerCounts.map((playerCount) => (
                <button
                  key={playerCount}
                  onClick={() => setActiveTab(playerCount)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === playerCount
                      ? "border-orange-500 text-orange-600 bg-orange-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {playerCount} Jugador{playerCount !== 1 ? "es" : ""} (
                  {groupedByPlayerCount[playerCount].length})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-3 text-gray-600">Cargando puntajes...</span>
            </div>
          ) : filteredScoreboard.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {activeTab === "all"
                  ? "¡Aún no hay puntajes!"
                  : `¡No hay puntajes para ${activeTab} jugador${
                      activeTab !== 1 ? "es" : ""
                    }!`}
              </h3>
              <p className="text-gray-500 text-sm">
                {activeTab === "all"
                  ? "Sé el primero en aparecer en el scoreboard jugando una partida."
                  : `Juega una partida con ${activeTab} jugador${
                      activeTab !== 1 ? "es" : ""
                    } para aparecer aquí.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredScoreboard.map((entry, index) => (
                <div
                  key={`${entry.name}-${entry.score}-${entry.date}-${index}`}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    index < 3
                      ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-md"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`text-2xl font-bold ${
                        index < 3 ? "text-yellow-600" : "text-gray-500"
                      }`}
                    >
                      {getMedalEmoji(index + 1)}
                    </div>
                    <div>
                      <div
                        className={`font-semibold ${
                          index < 3 ? "text-gray-800" : "text-gray-700"
                        }`}
                      >
                        {entry.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(entry.date)} • {entry.playerCount || 1}{" "}
                        jugador{(entry.playerCount || 1) !== 1 ? "es" : ""}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`text-right ${
                      index < 3 ? "text-orange-600" : "text-gray-600"
                    }`}
                  >
                    <div className="text-xl font-bold">{entry.score}</div>
                    <div className="text-xs">puntos</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
