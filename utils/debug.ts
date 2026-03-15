import { DEBUG_MODE } from "../config/constants";

export function debugLog(
  event: string,
  data: unknown = null,
  socketId: string | null = null
): void {
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
