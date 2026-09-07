"use client";

import { useEffect } from "react";
import { useScrabbleGameStore, type Notification, type NotificationKind } from "@/stores/scrabble-game.store";

const KIND_CLASSES: Record<NotificationKind, string> = {
  success: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-gray-800 text-gray-100",
  turn: "bg-amber-400 text-gray-900",
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
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg cursor-pointer select-none ${KIND_CLASSES[notification.kind]}`}
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
      className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-3"
    >
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <Toast notification={n} />
        </div>
      ))}
    </div>
  );
}
