import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

import { BoggleGame } from './game/BoggleGame.js';
import { setupSocketHandlers } from './socket/socketHandlers.js';

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);

  // Crear instancia del juego
  const game = new BoggleGame();
  
  // Configurar la referencia a io en el objeto game para que pueda enviar actualizaciones
  game.setIO(io);
  
  // Configurar todos los manejadores de eventos de Socket.IO
  setupSocketHandlers(io, game);

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});