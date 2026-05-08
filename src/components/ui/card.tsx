"use client";

import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export type TomoCardAccent = "amber" | "red";

export type TomoCardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  selected?: boolean;
  accent?: TomoCardAccent;
};

export function TomoCard({ interactive, selected, accent, className, ...props }: TomoCardProps) {
  return (
    <div
      className={cn(
        "tomo-card",
        interactive && "tomo-card--interactive",
        selected && "tomo-card--selected",
        accent === "amber" && "tomo-card-accent--amber",
        accent === "red" && "tomo-card-accent--red",
        className
      )}
      {...props}
    />
  );
}
