import { debugLog } from "../utils/debug";
import { setupSharedHandlers } from "./shared/sharedHandlers";
import { setupBoggleHandlers } from "./boggle/boggleHandlers";
import { setupScrabbleHandlers } from "./scrabble/scrabbleHandlers";
import type { GameRegistry } from "../game/GameRegistry";
import type { BoggleGame } from "../game/boggle/BoggleGame";
import type { ScrabbleGame } from "../game/scrabble/ScrabbleGame";
import type { TypedServer, TypedSocket } from "../src/interfaces/server";

export function setupSocketHandlers(
  io: TypedServer,
  registry: GameRegistry
): void {
  io.on("connection", (socket: TypedSocket) => {
    const raw = socket.handshake.query.game;
    const gameType = (Array.isArray(raw) ? raw[0] : raw) || "boggle";

    debugLog("EVENT: connection", { gameType }, socket.id);

    const game = registry.getGame(gameType);
    if (!game) {
      debugLog("ERROR: unknown game type", { gameType }, socket.id);
      socket.disconnect();
      return;
    }

    setupSharedHandlers(io, socket, game, {
      onPlayerJoined:
        gameType === "boggle"
          ? (s) => {
              const boggleGame = game as BoggleGame;
              debugLog(
                "EMIT: eliminate-common-words-changed (initial sync)",
                { eliminateCommonWords: boggleGame.eliminateCommonWords },
                s.id
              );
              s.emit("eliminate-common-words-changed", {
                enabled: boggleGame.eliminateCommonWords,
                eliminateCommonWords: boggleGame.eliminateCommonWords,
              });
            }
          : undefined,
    });

    if (gameType === "boggle") {
      setupBoggleHandlers(io, socket, game as BoggleGame);
    } else if (gameType === "scrabble") {
      setupScrabbleHandlers(io, socket, game as ScrabbleGame);
    }
  });
}
