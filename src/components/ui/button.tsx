"use client";

import { cn } from "@/lib/cn";
import { forwardRef, type ButtonHTMLAttributes } from "react";

export type TomoButtonVariant = "primary" | "secondary" | "tealOutline" | "ghost" | "navySolid";

export type TomoButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: TomoButtonVariant;
};

export const TomoButton = forwardRef<HTMLButtonElement, TomoButtonProps>(function TomoButton(
  { className, variant = "primary", type = "button", ...props },
  ref
) {
  const variantClass =
    variant === "primary"
      ? "button-primary"
      : variant === "secondary"
        ? "button-secondary"
        : variant === "tealOutline"
          ? "tomo-btn-teal-outline"
          : variant === "ghost"
            ? "tomo-btn-ghost"
            : "tomo-btn-navy-solid";

  return <button ref={ref} type={type} className={cn(variantClass, className)} {...props} />;
});
