import { useSyncExternalStore } from "react";

/** Tailwind's `lg` breakpoint. Keep in sync with any `lg:` classes used alongside. */
export const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribe(query: string, onChange: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Reactive media query. Renders `false` on the server and during hydration,
 * then snaps to the real value — so use it to pick *which* component to
 * render, not for anything that must be right in the initial HTML.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => subscribe(query, cb),
    () => window.matchMedia(query).matches,
    () => false
  );
}
