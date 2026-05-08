"use client";

import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

export function TomoSectionHeading({
  eyebrow,
  title,
  count,
  action,
  className,
  titleAs: TitleTag = "h2",
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  eyebrow?: string;
  title: ReactNode;
  count?: number | string;
  action?: ReactNode;
  titleAs?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-2", className)} {...rest}>
      <div className="min-w-0">
        {eyebrow ? <p className="tomo-eyebrow mb-1">{eyebrow}</p> : null}
        <TitleTag className="tomo-section-title inline">
          {title}
          {count != null && count !== "" ? (
            <span className="tomo-section-title-count">{count}</span>
          ) : null}
        </TitleTag>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
