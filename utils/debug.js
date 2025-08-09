import { DEBUG_MODE } from '../config/constants.js';

/**
 * Función de debug para imprimir logs solo cuando DEBUG_MODE está activo
 * @param {string} event - Nombre del evento
 * @param {*} data - Datos del evento (opcional)
 * @param {string} socketId - ID del socket (opcional)
 */
export function debugLog(event, data = null, socketId = null) {
  if (!DEBUG_MODE) return;

  const timestamp = new Date().toISOString();
  const socketInfo = socketId
    ? ` [Socket: ${socketId.substring(0, 8)}...]`
    : "";

  if (data) {
    console.log(`🔍 [${timestamp}] ${event}${socketInfo}:`, data);
  } else {
    console.log(`🔍 [${timestamp}] ${event}${socketInfo}`);
  }
}