"use client";

import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function TomoWorkflowTag({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("tomo-workflow-tag", className)} {...props} />;
}
