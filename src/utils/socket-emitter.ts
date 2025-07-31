import { useSocketsStore } from "@/stores/sockets.store";

// Global socket emitter utility
export const socketEmitter = {
  emitGetScoreboard: () => {
    const { socket } = useSocketsStore.getState();
    if (socket) {
      socket.emit("get-scoreboard");
    }
  },
  
  emitGetMaxScore: () => {
    const { socket } = useSocketsStore.getState();
    if (socket) {
      socket.emit("get-max-score");
    }
  },
};
