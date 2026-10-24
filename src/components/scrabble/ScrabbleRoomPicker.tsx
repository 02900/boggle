"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";
import { useRoomList } from "@/hooks/use-room-list";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { Button, Card, Modal } from "@/components/ui";
import { composeClasses } from "@/utils/compose-classes";
import { isRoomCode, normalizeRoomCodeInput, readRoomCodeFromUrl } from "@/utils/room-url";
import { ScrabbleInstructions } from "./ScrabbleInstructions";
import { ScrabbleScoreboard } from "./ScrabbleScoreboard";
import type { RoomSummary } from "@/interfaces/game";

const STATUS_LABEL: Record<RoomSummary["status"], string> = {
  waiting: "Esperando",
  playing: "En juego",
  finished: "Terminada",
};

const INPUT =
  "h-11 w-full rounded-lg border border-edge bg-surface-raised px-4 text-ink! placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";

/**
 * First screen: pick a name, then create a room, join one from the live list or
 * join by code. A `?sala=CODE` link makes joining that room the main action.
 */
export function ScrabbleRoomPicker() {
  const { createRoom, joinRoom } = useScrabbleSocket();
  const socket = useScrabbleGameStore((s) => s.socket);
  const isConnected = useScrabbleGameStore((s) => s.isConnected);
  const rooms = useRoomList(socket);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [linkedCode, setLinkedCode] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [scoresOpen, setScoresOpen] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("scrabble-player-name");
    if (savedName) setName(savedName);
    const fromUrl = readRoomCodeFromUrl();
    setLinkedCode(fromUrl);
    if (fromUrl) setCode(fromUrl);
  }, []);

  const playerName = name.trim();
  const canAct = isConnected && playerName.length > 0;
  const linkedRoom = linkedCode ? rooms?.find((r) => r.code === linkedCode) : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card padding="lg" className="w-full max-w-md">
        <Link
          href="/"
          className="-ml-1 -mt-1 mb-2 inline-flex h-8 items-center rounded-md px-2 text-xs text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
        >
          ← Juegos
        </Link>
        <h1 className="text-center text-3xl font-bold tracking-tight">Scrabble</h1>
        <p className="mb-6 mt-1 text-center text-sm text-ink-muted">Juego de palabras por turnos</p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          aria-label="Tu nombre"
          maxLength={20}
          className={INPUT}
        />

        {linkedCode && (
          <div className="mt-3 rounded-lg border border-accent/40 bg-accent/10 p-3 text-center" data-testid="linked-room">
            <p className="text-sm text-ink-muted">
              Te invitaron a la sala <span className="font-mono font-semibold text-ink">{linkedCode}</span>
              {linkedRoom && ` de ${linkedRoom.hostName}`}
            </p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="mt-2"
              onClick={() => joinRoom(linkedCode, playerName)}
              disabled={!canAct}
            >
              {isConnected ? `Unirse a ${linkedCode}` : "Conectando..."}
            </Button>
          </div>
        )}

        <section aria-labelledby="rooms-title" className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="rooms-title" className="text-xs uppercase tracking-wide text-ink-faint">
              Salas abiertas
            </h2>
            {rooms && <span className="text-xs text-ink-faint">{rooms.length}</span>}
          </div>

          {rooms === null ? (
            <p className="py-4 text-center text-sm text-ink-faint">Buscando salas…</p>
          ) : rooms.length === 0 ? (
            <p className="rounded-lg border border-dashed border-edge py-4 text-center text-sm text-ink-faint">
              No hay salas abiertas. ¡Crea una!
            </p>
          ) : (
            <ul className="max-h-60 space-y-1.5 overflow-y-auto" data-testid="room-list">
              {rooms.map((room) => (
                <li
                  key={room.code}
                  data-testid="room-row"
                  data-code={room.code}
                  className="flex items-center gap-3 rounded-lg bg-surface-raised/60 px-3 py-2"
                >
                  <span className="font-mono text-sm font-semibold">{room.code}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">Sala de {room.hostName}</div>
                    <div className="text-xs text-ink-faint">
                      {room.playerCount}/{room.maxPlayers ?? "∞"} ·{" "}
                      <span className={composeClasses(room.status === "playing" && "text-warning")}>
                        {STATUS_LABEL[room.status]}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => joinRoom(room.code, playerName)}
                    disabled={!canAct || !room.joinable}
                    title={!room.joinable ? "Esta partida ya empezó o está llena" : undefined}
                  >
                    Unirse
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-4 space-y-3">
          <Button
            variant={linkedCode ? "secondary" : "primary"}
            size="lg"
            fullWidth
            onClick={() => createRoom(playerName)}
            disabled={!canAct}
          >
            {isConnected ? "+ Crear sala" : "Conectando..."}
          </Button>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (canAct && isRoomCode(code)) joinRoom(code, playerName);
            }}
          >
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(normalizeRoomCodeInput(e.target.value))}
              placeholder="Código"
              aria-label="Código de sala"
              autoCapitalize="characters"
              className={composeClasses(INPUT, "font-mono uppercase tracking-widest")}
            />
            <Button type="submit" disabled={!canAct || !isRoomCode(code)} className="shrink-0">
              Unirse con código
            </Button>
          </form>

          {!playerName && <p className="text-center text-xs text-ink-faint">Escribe tu nombre para crear o unirte a una sala.</p>}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" fullWidth onClick={() => setRulesOpen(true)}>
              Ver reglas
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setScoresOpen(true)} disabled={!isConnected}>
              Mejores puntajes
            </Button>
          </div>
        </div>
      </Card>

      <ScrabbleScoreboard open={scoresOpen} onClose={() => setScoresOpen(false)} />

      <Modal open={rulesOpen} onClose={() => setRulesOpen(false)} title="Reglas" className="max-w-md">
        <ScrabbleInstructions />
        <Button variant="ghost" fullWidth className="mt-4" onClick={() => setRulesOpen(false)}>
          Cerrar
        </Button>
      </Modal>
    </div>
  );
}
