import { composeClasses } from "@/utils/compose-classes";

interface Props {
  /** Seconds remaining; negative means overtime (shown as -m:ss) */
  seconds: number;
  /** Below this the timer turns to warning; below `dangerAt` it turns to danger and pulses */
  warningAt?: number;
  dangerAt?: number;
  className?: string;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.abs(totalSeconds);
  const sign = totalSeconds < 0 ? "-" : "";
  return `${sign}${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

/** mm:ss countdown with urgency states; keeps counting below zero as overtime. */
export function Timer({ seconds, warningAt = 30, dangerAt = 10, className }: Props) {
  const state =
    seconds < 0 ? "overtime" : seconds <= dangerAt ? "danger" : seconds <= warningAt ? "warning" : "normal";
  return (
    <span
      role="timer"
      aria-live={state === "normal" ? "off" : "polite"}
      data-state={state}
      className={composeClasses(
        "font-mono tabular-nums font-semibold",
        state === "warning" && "text-warning",
        (state === "danger" || state === "overtime") && "text-danger animate-pulse",
        className
      )}
    >
      {formatClock(seconds)}
    </span>
  );
}
