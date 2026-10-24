/** Room links look like `/scrabble?sala=K7QF`. */
export const ROOM_URL_PARAM = "sala";

/** Same rule as the server's normalizeRoomCode: 4 chars, no 0/O/1/I. */
const ROOM_CODE = /^[A-HJ-NP-Z2-9]{4}$/;

export function normalizeRoomCodeInput(input: string): string {
  return input.trim().toUpperCase().slice(0, 4);
}

export function isRoomCode(code: string): boolean {
  return ROOM_CODE.test(code);
}

/** The room code in the current URL, if it's a valid one. */
export function readRoomCodeFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get(ROOM_URL_PARAM);
  const code = raw ? normalizeRoomCodeInput(raw) : "";
  return isRoomCode(code) ? code : null;
}

/** Puts (or removes) the room code in the URL without navigating, so it can be shared. */
export function writeRoomCodeToUrl(code: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (code) url.searchParams.set(ROOM_URL_PARAM, code);
  else url.searchParams.delete(ROOM_URL_PARAM);
  window.history.replaceState(window.history.state, "", url);
}

/** Full shareable link to a room of the current game. */
export function roomLink(code: string): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set(ROOM_URL_PARAM, code);
  return url.toString();
}
