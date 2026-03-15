import { debugLog } from "../utils/debug";
import { setupSharedHandlers } from "./shared/sharedHandlers";
import { setupBoggleHandlers } from "./boggle/boggleHandlers";
import type { BoggleGame } from "../game/boggle/BoggleGame";
import type { TypedServer, TypedSocket } from "../src/interfaces/server";

export function setupSocketHandlers(io: TypedServer, game: BoggleGame): void {
  io.on("connection", (socket: TypedSocket) => {
    debugLog("EVENT: connection", null, socket.id);

    setupSharedHandlers(io, socket, game, {
      onPlayerJoined: (s) => {
        debugLog(
          "EMIT: eliminate-common-words-changed (initial sync)",
          { eliminateCommonWords: game.eliminateCommonWords },
          s.id
        );
        s.emit("eliminate-common-words-changed", {
          enabled: game.eliminateCommonWords,
          eliminateCommonWords: game.eliminateCommonWords,
        });
      },
    });

    setupBoggleHandlers(io, socket, game);
  });
}
