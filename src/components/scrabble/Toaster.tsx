"use client";

import { useEffect } from "react";
import { useScrabbleGameStore, type Notification, type NotificationKind } from "@/stores/scrabble-game.store";

const KIND_CLASSES: Record<NotificationKind, string> = {
  success: "bg-success text-success-ink",
  error: "bg-danger text-danger-ink",
  info: "bg-surface-raised text-ink border border-edge",
  turn: "bg-accent text-accent-ink",
};

const KIND_ICON: Record<NotificationKind, string> = {
  success: "✓",
  error: "✕",
  info: "•",
  turn: "▶",
};

function Toast({ notification }: { notification: Notification }) {
  const dismiss = useScrabbleGameStore((s) => s.dismissNotification);

  useEffect(() => {
    if (notification.ttl <= 0) return;
    const t = setTimeout(() => dismiss(notification.id), notification.ttl);
    return () => clearTimeout(t);
  }, [notification.id, notification.ttl, dismiss]);

  return (
    <div
      role={notification.kind === "error" ? "alert" : "status"}
      data-testid="toast"
      data-kind={notification.kind}
      onClick={() => dismiss(notification.id)}
      className={`flex animate-slide-down items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg cursor-pointer select-none ${KIND_CLASSES[notification.kind]}`}
    >
      <span aria-hidden className="text-xs opacity-80">{KIND_ICON[notification.kind]}</span>
      <span>{notification.text}</span>
    </div>
  );
}

/** Stack of transient notifications (turn events, errors, joins/leaves). */
export function Toaster() {
  const notifications = useScrabbleGameStore((s) => s.notifications);
  if (notifications.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-16 z-50 flex flex-col items-center gap-2 px-3 lg:top-3"
    >
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <Toast notification={n} />
        </div>
      ))}
    </div>
  );
}
