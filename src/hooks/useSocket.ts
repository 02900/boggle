import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, WordResult, ClientEvents, GameEvents, DiceRoll } from '@/interfaces/game';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinGame: (playerName: string) => void;
  startGame: () => void;
  submitWord: (word: string, path: [number, number][]) => void;
  resetGame: () => void;
  diceRolling: DiceRoll[] | null;
  clearDiceRolling: () => void;
  triggerVibration: () => void;
  playSuccessSound: () => void;
}

export const useSocket = (): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [diceRolling, setDiceRolling] = useState<DiceRoll[] | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detectar si es móvil para la vibración
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Función para vibrar en móviles
  const triggerVibration = useCallback(() => {
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(200); // Vibración de 200ms
    }
  }, [isMobile]);
  
  // Función para reproducir sonido de éxito
  const playSuccessSound = useCallback(() => {
    try {
      const audio = new Audio('/move-self.mp3');
      audio.volume = 0.5; // Volumen al 50%
      console.log("Reproduciendo sonido");
      audio.play().catch(error => {
        // Silenciar errores de reproducción (ej: política de autoplay)
        console.log('No se pudo reproducir el sonido:', error);
      });
    } catch (error) {
      console.log('Error al crear el audio:', error);
    }
  }, []);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('dice-rolling', (diceRolls: DiceRoll[]) => {
      setDiceRolling(diceRolls);
    });
    
    // El evento word-result se maneja en BoggleGameMain.tsx
    // para evitar duplicación de listeners

    return () => {
      newSocket.close();
    };
  }, [triggerVibration, playSuccessSound]);

  const joinGame = (playerName: string) => {
    if (socket) {
      socket.emit('join-game', playerName);
    }
  };

  const startGame = () => {
    if (socket) {
      socket.emit('start-game');
    }
  };

  const submitWord = (word: string, path: [number, number][]) => {
    if (socket) {
      socket.emit('submit-word', { word, path });
    }
  };

  const resetGame = () => {
    if (socket) {
      socket.emit('reset-game');
    }
  };

  return {
    socket,
    isConnected,
    joinGame,
    startGame,
    submitWord,
    resetGame,
    diceRolling,
    clearDiceRolling: () => setDiceRolling(null),
    triggerVibration,
    playSuccessSound,
  };
};
