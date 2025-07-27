import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, WordResult, ClientEvents, GameEvents } from '@/interfaces/game';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinGame: (playerName: string) => void;
  startGame: () => void;
  submitWord: (word: string, path: [number, number][]) => void;
  resetGame: () => void;
}

export const useSocket = (): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, []);

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
  };
};
