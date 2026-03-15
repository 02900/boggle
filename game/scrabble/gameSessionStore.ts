import fs from "fs";
import path from "path";
import { debugLog } from "../../utils/debug";
import type { SerializedScrabbleGame } from "../../src/interfaces/scrabble";

const SESSIONS_DIR = path.join(process.cwd(), "data", "scrabble-sessions");

function ensureDir(): void {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function sanitizeGameId(gameId: string): string {
  return gameId.replace(/[^a-zA-Z0-9\-_]/g, "");
}

function sessionPath(gameId: string): string {
  const safe = sanitizeGameId(gameId);
  const resolved = path.join(SESSIONS_DIR, `${safe}.json`);
  // Verify the resolved path is within SESSIONS_DIR
  if (!resolved.startsWith(SESSIONS_DIR)) {
    throw new Error(`Invalid gameId: ${gameId}`);
  }
  return resolved;
}

export function saveSession(gameId: string, data: SerializedScrabbleGame): void {
  try {
    ensureDir();
    fs.writeFileSync(sessionPath(gameId), JSON.stringify(data, null, 2));
    debugLog("SESSION_SAVED", { gameId });
  } catch (error) {
    console.error("Error saving scrabble session:", error);
  }
}

export function loadSession(gameId: string): SerializedScrabbleGame | null {
  try {
    const filePath = sessionPath(gameId);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error loading scrabble session:", error);
    return null;
  }
}

export function deleteSession(gameId: string): void {
  try {
    const filePath = sessionPath(gameId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      debugLog("SESSION_DELETED", { gameId });
    }
  } catch (error) {
    console.error("Error deleting scrabble session:", error);
  }
}

export function listSessions(): string[] {
  try {
    ensureDir();
    return fs
      .readdirSync(SESSIONS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  } catch (error) {
    console.error("Error listing scrabble sessions:", error);
    return [];
  }
}
