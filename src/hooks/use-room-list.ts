import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import type { RoomSummary } from "@/interfaces/game";

/**
 * Live list of the game's rooms while the socket is in the lobby: asks on every
 * (re)connect and follows `rooms-updated`. Works with either game's socket.
 */
export function useRoomList(socket: Socket | null): RoomSummary[] | null {
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);

  useEffect(() => {
    if (!socket) return;
    const request = () => socket.emit("list-rooms");
    const update = (list: RoomSummary[]) => setRooms(list);

    socket.on("connect", request);
    socket.on("rooms-list", update);
    socket.on("rooms-updated", update);
    if (socket.connected) request();

    return () => {
      socket.off("connect", request);
      socket.off("rooms-list", update);
      socket.off("rooms-updated", update);
    };
  }, [socket]);

  return rooms;
}
