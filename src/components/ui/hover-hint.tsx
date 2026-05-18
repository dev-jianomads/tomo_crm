"use client";

import { useCallback, useId, useRef, useState, type ReactNode } from "react";

/** Shorter than native `title` tooltips (~1s) so hints feel responsive. */
export const HOVER_HINT_SHOW_DELAY_MS = 280;

type Props = {
  hint: string;
  children: ReactNode;
  className?: string;
  /** When true, hint panel can extend past the trigger width (e.g. long copy on headings). */
  wide?: boolean;
};

/**
 * Accessible hover hint with a configurable show delay (faster than browser `title` tooltips).
 */
export function HoverHint({ hint, children, className = "", wide = false }: Props) {
  const id = useId();
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);

  const clearTimer = useCallback(() => {
    if (showTimer.current != null) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);

  const show = useCallback(() => {
    clearTimer();
    showTimer.current = setTimeout(() => setOpen(true), HOVER_HINT_SHOW_DELAY_MS);
  }, [clearTimer]);

  const hide = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);

  return (
    <span
      className={`relative inline-flex max-w-full ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex max-w-full min-w-0">
        {children}
      </span>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className={`pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 rounded-md border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug tracking-normal text-[color:var(--tomo-body)] shadow-[var(--tomo-shadow-2)] ${
            wide ? "w-max max-w-[min(18rem,calc(100vw-2rem))]" : "w-max max-w-[14rem]"
          }`}
        >
          {hint}
        </span>
      ) : null}
    </span>
  );
}
