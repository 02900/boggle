import React from "react";
import { useClientValidationPersistence } from "@/hooks/useClientValidationPersistence";

export const ClientValidationToggleMobile = () => {
  const { isEnabled, handleToggle } = useClientValidationPersistence();

  return (
    <div className="mt-2 bg-blue-50 rounded-lg p-2">
      <div className="flex items-center justify-between">
        <div className="flex-1 pr-2">
          <div className="text-xs font-semibold text-gray-800">
            🚀 Validación Rápida
          </div>
          <div className="text-xs text-gray-600">
            Experimental
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
            isEnabled
              ? "bg-blue-600"
              : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              isEnabled
                ? "translate-x-5"
                : "translate-x-1"
            }`}
          />
        </button>
      </div>
      
      {isEnabled && (
        <div className="mt-1 text-xs text-blue-700">
          ⚡ Respuesta inmediata activa
        </div>
      )}
    </div>
  );
};
