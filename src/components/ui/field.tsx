"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function TomoField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <label htmlFor={htmlFor} className="tomo-field-label block">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
