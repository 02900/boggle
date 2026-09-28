import type { HTMLAttributes } from "react";
import { composeClasses } from "@/utils/compose-classes";

interface Props extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const PADDING = { none: "", sm: "p-3", md: "p-4", lg: "p-6" };

/** Elevated surface with a subtle border. The basic building block for panels. */
export function Card({ padding = "md", className, ...rest }: Props) {
  return (
    <div
      className={composeClasses("rounded-xl border border-edge bg-surface text-ink", PADDING[padding], className)}
      {...rest}
    />
  );
}
