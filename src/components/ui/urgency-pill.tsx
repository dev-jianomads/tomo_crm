"use client";

import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export type TomoUrgencyTone = "amber" | "red";

export function TomoUrgencyPill({
  tone,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone: TomoUrgencyTone }) {
  return (
    <span
      className={cn(
        "tomo-urgency-pill",
        tone === "amber" ? "tomo-urgency-pill--amber" : "tomo-urgency-pill--red",
        className
      )}
      {...props}
    />
  );
}
