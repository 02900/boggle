"use client";

import React from "react";
import { useMobileListener } from "@/hooks/use-mobile-listener";
import { useSocketListeners } from "@/hooks/use-socket-listeners";
import { ModalType, useModalStore } from "@/stores/modal.store";
import { useSocketsStore } from "@/stores/sockets.store";
import { useViewportStore } from "@/stores/viewport.store";
import { GameInstructions } from "../GameInstructions";
import { GameSettings } from "../GameSettings";
import { JoinGameForm } from "../JoinGameForm";
import { MaxScoreModal } from "../MaxScoreModal";
import { useBoggleGameMainStore } from "./boogle-game.main.store";
import { ViewDesktop } from "./view-desktop";
import { ViewMobile } from "./view-mobile";

export const BoggleGameMain = () => {
  useSocketListeners();
  useMobileListener();

  const { gameState, isJoined } = useBoggleGameMainStore();
  const { socket } = useSocketsStore();
  const { isMobile } = useViewportStore();
  const { modalType } = useModalStore();

  if (!isJoined) {
    return <JoinGameForm />;
  }

  return (
    <>
      {isMobile ? <ViewMobile /> : <ViewDesktop />}

      {/* Modal de Puntuación Máxima */}
      {modalType === ModalType.MaxScore && (
        <MaxScoreModal
          socket={socket}
          foundWords={gameState.players.flatMap((player) => [
            ...player.wordsFound,
            ...(player.eliminatedWords || []),
          ])}
        />
      )}

      {/* Modal de Configuración */}
      {modalType === ModalType.Settings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <GameSettings />
        </div>
      )}

      {/* Modal de Instrucciones */}
      {modalType === ModalType.Instructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <GameInstructions />
        </div>
      )}
    </>
  );
};
