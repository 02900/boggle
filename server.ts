import { createServer } from "http";
import { networkInterfaces } from "os";
import next from "next";
import { Server } from "socket.io";

import { RoomManager } from "./game/rooms/RoomManager";
import { setupSocketHandlers } from "./socket/socketHandlers";
import type { TypedServer } from "./src/interfaces/server";
import type { GameEvents, ClientEvents } from "./src/interfaces/game";
import type { ScrabbleGameEvents, ScrabbleClientEvents } from "./src/interfaces/scrabble";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT) || 3000;

function getLocalIPs(): string[] {
  const ips: string[] = [];
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io: TypedServer = new Server<ClientEvents & ScrabbleClientEvents, GameEvents & ScrabbleGameEvents>(httpServer);

  // Every game lives in a room; rooms are created on demand from each game's lobby
  const rooms = new RoomManager(io);
  setupSocketHandlers(io, rooms);

  httpServer
    .once("error", (err: Error) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      for (const ip of getLocalIPs()) {
        console.log(`> Network: http://${ip}:${port}`);
      }
    });
});
