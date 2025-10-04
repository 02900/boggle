import { useCallback } from "react";
import { useBoggleGameMainStore } from "@/components/BoggleGameMain/boogle-game-main.store";
import { useSocket } from "./useSocket";
import { clientWordValidator, ClientWordValidationResult } from "@/utils/clientWordValidator";
import { WordResult } from "@/interfaces/game";
import { useSocketsStore } from "@/stores/sockets.store";

export const useClientWordValidation = () => {
  const { gameState } = useBoggleGameMainStore();
  const { submitWord: originalSubmitWord } = useSocket();
  const { socket } = useSocketsStore();

  /**
   * Convierte resultado de validación del cliente a formato del servidor
   */
  const convertClientResult = (clientResult: ClientWordValidationResult): WordResult => {
    return {
      valid: clientResult.valid,
      reason: clientResult.reason,
      points: clientResult.points,
      word: clientResult.word,
    };
  };

  /**
   * Obtiene las palabras ya encontradas por el jugador actual
   */
  const getCurrentPlayerWords = useCallback((): string[] => {
    // Buscar el jugador actual usando el socket ID
    const currentPlayerId = socket?.id;
    if (!currentPlayerId) return [];
    
    const currentPlayer = gameState.players.find(
      (player) => player.id === currentPlayerId
    );
    return currentPlayer?.wordsFound || [];
  }, [gameState.players, socket?.id]);

  /**
   * Envía una palabra con validación del cliente si está habilitada
   */
  const submitWordWithClientValidation = useCallback(
    (
      word: string,
      path: [number, number][],
      onResult?: (result: WordResult) => void
    ) => {
      // Si la validación del cliente está deshabilitada, usar método original
      if (!gameState.clientSideValidation) {
        originalSubmitWord(word, path);
        return;
      }

      console.log("CLIENT_VALIDATION: Validando palabra localmente", { word });

      // Validar en el cliente
      const playerWords = getCurrentPlayerWords();
      const clientResult = clientWordValidator.validateWord(
        gameState.board,
        word,
        path,
        playerWords
      );

      console.log("CLIENT_VALIDATION: Resultado", clientResult);

      // Convertir resultado y ejecutar callback inmediatamente
      const serverFormatResult = convertClientResult(clientResult);
      if (onResult) {
        onResult(serverFormatResult);
      }

      // SIEMPRE enviar al servidor para restauración de sesión
      // El servidor hará la validación final y mantendrá el registro completo
      console.log("CLIENT_VALIDATION: Enviando palabra al servidor (para restauración de sesión)");
      originalSubmitWord(word, path);
    },
    [
      gameState.clientSideValidation,
      gameState.board,
      getCurrentPlayerWords,
      originalSubmitWord,
    ]
  );

  /**
   * Valida una palabra sin enviarla (para preview)
   */
  const validateWordPreview = useCallback(
    (word: string, path: [number, number][]): WordResult => {
      if (!gameState.clientSideValidation) {
        return {
          valid: true,
          reason: "Validación del servidor",
        };
      }

      const playerWords = getCurrentPlayerWords();
      const clientResult = clientWordValidator.validateWord(
        gameState.board,
        word,
        path,
        playerWords
      );

      return convertClientResult(clientResult);
    },
    [gameState.clientSideValidation, gameState.board, getCurrentPlayerWords]
  );

  return {
    submitWordWithClientValidation,
    validateWordPreview,
    isClientValidationEnabled: gameState.clientSideValidation,
    isValidatorReady: clientWordValidator.isReady(),
    dictionarySize: clientWordValidator.getDictionarySize(),
  };
};
