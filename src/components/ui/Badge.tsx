import type { HTMLAttributes } from "react";
import { composeClasses } from "@/utils/compose-classes";

export type BadgeTone = "neutral" | "accent" | "success" | "danger" | "muted";

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-surface-raised text-ink",
  accent: "bg-accent text-accent-ink",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  muted: "bg-surface text-ink-faint",
};

export function Badge({ tone = "neutral", className, ...rest }: Props) {
  return (
    <span
      className={composeClasses(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap",
        TONE[tone],
        className
      )}
      {...rest}
    />
  );
}
