import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

import { BoggleGame } from "./game/BoggleGame";
import { setupSocketHandlers } from "./socket/socketHandlers";
import type { TypedServer } from "./src/interfaces/server";
import type { GameEvents, ClientEvents } from "./src/interfaces/game";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io: TypedServer = new Server<ClientEvents, GameEvents>(httpServer);

  const game = new BoggleGame();

  game.setIO(io);

  setupSocketHandlers(io, game);

  httpServer
    .once("error", (err: Error) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
