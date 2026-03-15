import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

import { BoggleGame } from "./game/boggle/BoggleGame";
import { ScrabbleGame } from "./game/scrabble/ScrabbleGame";
import { GameRegistry } from "./game/GameRegistry";
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

  // Register game instances
  const registry = new GameRegistry();

  const boggleGame = new BoggleGame();
  boggleGame.setIO(io);
  registry.registerGame("boggle", boggleGame);

  const scrabbleGame = new ScrabbleGame();
  scrabbleGame.setIO(io);
  registry.registerGame("scrabble", scrabbleGame);

  setupSocketHandlers(io, registry);

  httpServer
    .once("error", (err: Error) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
