"use client";

import type { ButtonHTMLAttributes } from "react";
import { composeClasses } from "@/utils/compose-classes";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover shadow-sm",
  secondary: "bg-surface-raised text-ink hover:bg-edge",
  ghost: "bg-transparent text-ink-muted hover:bg-surface-raised hover:text-ink",
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  variant = "secondary",
  size = "md",
  fullWidth,
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={composeClasses(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium select-none",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[inherit]",
        VARIANT[variant],
        SIZE[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    />
  );
}
