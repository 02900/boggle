"use client";

import React, { useState, useEffect } from "react";
import { clientWordValidator } from "@/utils/clientWordValidator";
import { DictionaryLoadResult } from "@/services/dictionaryService";

export const DictionaryStatus = () => {
  const [loadResult, setLoadResult] = useState<DictionaryLoadResult | null>(
    null
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkDictionaryStatus = async () => {
      try {
        const result = await clientWordValidator.waitForLoad();
        if (mounted) {
          setLoadResult(result);

          // Mostrar el estado por unos segundos
          setIsVisible(true);
          setTimeout(
            () => {
              if (mounted) setIsVisible(false);
            },
            result.success ? 3000 : 5000
          ); // Más tiempo si hay error
        }
      } catch (error) {
        console.error("Error checking dictionary status:", error);
      }
    };

    checkDictionaryStatus();

    return () => {
      mounted = false;
    };
  }, []);

  if (!isVisible || !loadResult) {
    return null;
  }

  const getStatusIcon = () => {
    if (loadResult.success) {
      return loadResult.source === "cache" ? "⚡" : "🌐";
    }
    return "⚠️";
  };

  const getStatusColor = () => {
    if (loadResult.success) {
      return loadResult.source === "cache"
        ? "bg-green-50 border-green-200 text-green-800"
        : "bg-blue-50 border-blue-200 text-blue-800";
    }
    return "bg-yellow-50 border-yellow-200 text-yellow-800";
  };

  const getSourceText = () => {
    switch (loadResult.source) {
      case "cache":
        return "Cache local";
      case "remote":
        return "Servidor";
      case "fallback":
        return "Diccionario básico";
      default:
        return "Desconocido";
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm p-3 rounded-lg border shadow-lg transition-all duration-300 ${getStatusColor()}`}
    >
      <div className="flex items-start space-x-2">
        <span className="text-lg flex-shrink-0">{getStatusIcon()}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">
            {loadResult.success
              ? "Diccionario cargado"
              : "Usando diccionario básico"}
          </div>
          <div className="text-xs opacity-75 mt-1">
            {loadResult.wordsLoaded.toLocaleString()} palabras •{" "}
            {getSourceText()}
            {loadResult.loadTime > 0 &&
              ` • ${loadResult.loadTime.toFixed(0)}ms`}
          </div>
          {!loadResult.success && loadResult.error && (
            <div className="text-xs opacity-75 mt-1 text-red-600">
              {loadResult.error}
            </div>
          )}
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-xs opacity-50 hover:opacity-75 flex-shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
