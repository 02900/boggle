import React from "react";
import { useClientValidationPersistence } from "@/hooks/useClientValidationPersistence";

export const ClientValidationToggle = () => {
  const { isEnabled, handleToggle } = useClientValidationPersistence();

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">
            🚀 Validación del Cliente (Experimental)
          </h3>
          <p className="text-xs text-gray-600">
            Valida palabras localmente para respuesta más rápida. 
            Se revalida en el servidor al finalizar.
          </p>
        </div>
        <div className="ml-4">
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isEnabled
                ? "bg-blue-600"
                : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isEnabled
                  ? "translate-x-6"
                  : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
      
      {isEnabled && (
        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
          ⚡ Modo activo: Las palabras se validan inmediatamente en tu dispositivo
        </div>
      )}
    </div>
  );
};
