import { useEffect } from "react";
import { useBoggleGameMainStore } from "@/components/boggle/BoggleGameMain/boogle-game-main.store";
import { useSocket } from "./useSocket";

const CLIENT_VALIDATION_KEY = "boggle-client-validation";

export const useClientValidationPersistence = () => {
  const { gameState } = useBoggleGameMainStore();
  const { toggleClientSideValidation } = useSocket();

  // Cargar preferencia desde localStorage al inicializar
  useEffect(() => {
    const savedPreference = localStorage.getItem(CLIENT_VALIDATION_KEY);
    if (savedPreference !== null) {
      const isEnabled = savedPreference === "true";
      // Solo aplicar si es diferente al estado actual
      if (isEnabled !== gameState.clientSideValidation) {
        toggleClientSideValidation(isEnabled);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar, ignorar dependencias

  const handleToggle = () => {
    const newValue = !gameState.clientSideValidation;
    // Guardar preferencia en localStorage
    localStorage.setItem(CLIENT_VALIDATION_KEY, newValue.toString());
    toggleClientSideValidation(newValue);
  };

  return {
    isEnabled: gameState.clientSideValidation,
    handleToggle,
  };
};
