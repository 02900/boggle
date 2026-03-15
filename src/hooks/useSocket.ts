import { useCallback } from "react";
import { io } from "socket.io-client";
import { useBoggleGameMainStore } from "@/components/BoggleGameMain/boogle-game-main.store";
import { useSocketsStore } from "@/stores/sockets.store";
import { useViewportStore } from "@/stores/viewport.store";

export const useSocket = () => {
  const { socket, setSocket } = useSocketsStore();
  const { setDiceRolling } = useSocketsStore();
  const { isMobile } = useViewportStore();

  const connectSocket = useCallback(() => {
    if (!socket) {
      const newSocket = io("https://boogle-game-server.herokuapp.com/", {
        withCredentials: true,
      });
      setSocket(newSocket);
    }
  }, [socket, setSocket]);

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
      // Obtener la versión de rotación actual del cliente
      const currentRotationVersion =
        useBoggleGameMainStore.getState().gameState.rotationVersion;
      socket.emit("submit-word", {
        word,
        path,
        rotationVersion: currentRotationVersion,
      });
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

  const clearDiceRolling = useCallback(() => setDiceRolling(null), [setDiceRolling]);

  const toggleClientSideValidation = (enabled: boolean) => {
    if (socket) {
      socket.emit("toggle-client-side-validation", enabled);
    }
  };

  return {
    connectSocket,
    joinGame,
    startGame,
    submitWord,
    resetGame,
    rotateBoard,
    clearDiceRolling,
    triggerVibration,
    playSuccessSound,
    playErrorSound,
    playSkipSound,
    toggleEliminateCommonWords,
    toggleClientSideValidation,
  };
};
