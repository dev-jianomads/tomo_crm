"use client";

import { cn } from "@/lib/cn";
import { forwardRef, type InputHTMLAttributes } from "react";

export type TomoInputProps = InputHTMLAttributes<HTMLInputElement>;

export const TomoInput = forwardRef<HTMLInputElement, TomoInputProps>(function TomoInput(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn("tomo-input", className)} {...props} />;
});
