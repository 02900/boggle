/* eslint-disable react-hooks/exhaustive-deps */

import { useCallback, useEffect } from "react";
import { io } from "socket.io-client";
import { DiceRoll } from "@/interfaces/game";
import { useSocketsStore } from "@/stores/sockets.store";
import { useViewportStore } from "@/stores/viewport.store";

export const useSocket = () => {
  const {
    socket,
    setIsConnected,
    setDiceRolling,
    setEliminateCommonWords,
    setSocket,
  } = useSocketsStore();
  const { isMobile } = useViewportStore();

  // Función para vibrar en móviles
  const triggerVibration = useCallback(() => {
    if (isMobile && "vibrate" in navigator) {
      navigator.vibrate(200); // Vibración de 200ms
    }
  }, [isMobile]);

  // Función para reproducir sonido de éxito
  const playSuccessSound = useCallback(() => {
    try {
      const audio = new Audio("/move-self.mp3");
      audio.volume = 0.5; // Volumen al 50%
      console.log("Reproduciendo sonido de éxito");
      audio.play().catch((error) => {
        // Silenciar errores de reproducción (ej: política de autoplay)
        console.log("No se pudo reproducir el sonido de éxito:", error);
      });
    } catch (error) {
      console.log("Error al crear el audio de éxito:", error);
    }
  }, []);

  // Función para reproducir sonido de error
  const playErrorSound = useCallback(() => {
    try {
      const audio = new Audio("/illegal.mp3");
      audio.volume = 0.4; // Volumen un poco más bajo para errores
      console.log("Reproduciendo sonido de error");
      audio.play().catch((error) => {
        // Silenciar errores de reproducción (ej: política de autoplay)
        console.log("No se pudo reproducir el sonido de error:", error);
      });
    } catch (error) {
      console.log("Error al crear el audio de error:", error);
    }
  }, []);

  // Función para reproducir sonido de skip (palabra repetida)
  const playSkipSound = useCallback(() => {
    try {
      const audio = new Audio("/skip.mp3");
      audio.volume = 0.5; // Volumen medio para skip
      console.log("Reproduciendo sonido de skip");
      audio.play().catch((error) => {
        // Silenciar errores de reproducción (ej: política de autoplay)
        console.log("No se pudo reproducir el sonido de skip:", error);
      });
    } catch (error) {
      console.log("Error al crear el audio de skip:", error);
    }
  }, []);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("connect", () => {
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("dice-rolling", (diceRolls: DiceRoll[]) => {
      setDiceRolling(diceRolls);
    });

    newSocket.on(
      "eliminate-common-words-changed",
      (data: { enabled: boolean; eliminateCommonWords: boolean }) => {
        setEliminateCommonWords(data.eliminateCommonWords);
      }
    );

    // El evento word-result se maneja en BoggleGameMain.tsx
    // para evitar duplicación de listeners
    return () => {
      newSocket.close();
    };
  }, []);

  const joinGame = (playerName: string) => {
    if (socket) {
      socket.emit("join-game", playerName);
    }
  };

  const startGame = () => {
    if (socket) {
      socket.emit("start-game");
    }
  };

  const submitWord = (word: string, path: [number, number][]) => {
    if (socket) {
      socket.emit("submit-word", { word, path });
    }
  };

  const resetGame = () => {
    if (socket) {
      socket.emit("reset-game");
    }
  };

  const rotateBoard = () => {
    if (socket) {
      socket.emit("rotate-board");
    }
  };

  const toggleEliminateCommonWords = (enabled: boolean) => {
    if (socket) {
      socket.emit("toggle-eliminate-common-words", enabled);
    }
  };

  return {
    joinGame,
    startGame,
    submitWord,
    resetGame,
    rotateBoard,
    clearDiceRolling: () => setDiceRolling(null),
    triggerVibration,
    playSuccessSound,
    playErrorSound,
    playSkipSound,
    toggleEliminateCommonWords,
  };
};
