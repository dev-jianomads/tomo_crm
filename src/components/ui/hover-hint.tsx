"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/** Shorter than native `title` tooltips (~1s) so hints feel responsive. */
export const HOVER_HINT_SHOW_DELAY_MS = 280;

const TOOLTIP_GAP_PX = 6;

type Props = {
  hint: string;
  children: ReactNode;
  className?: string;
  /** When true, hint panel can extend past the trigger width (e.g. long copy on headings). */
  wide?: boolean;
};

/**
 * Accessible hover hint with a configurable show delay (faster than browser `title` tooltips).
 * Renders the hint in a portal so it is not clipped by overflow containers on Today / Insights.
 */
export function HoverHint({ hint, children, className = "", wide = false }: Props) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => setMounted(true), []);

  const clearTimer = useCallback(() => {
    if (showTimer.current != null) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({ left: rect.left, top: rect.top });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
    const onReposition = () => updatePosition();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, updatePosition]);

  const show = useCallback(() => {
    clearTimer();
    showTimer.current = setTimeout(() => setOpen(true), HOVER_HINT_SHOW_DELAY_MS);
  }, [clearTimer]);

  const hide = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);

  const tooltipClass = `pointer-events-none fixed z-[100] rounded-md border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug tracking-normal text-[color:var(--tomo-body)] shadow-[var(--tomo-shadow-2)] ${
    wide ? "w-max max-w-[min(18rem,calc(100vw-2rem))]" : "w-max max-w-[14rem]"
  }`;

  return (
    <>
      <span
        ref={triggerRef}
        className={`relative inline-flex max-w-full ${className}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <span aria-describedby={open ? id : undefined} className="inline-flex max-w-full min-w-0">
          {children}
        </span>
      </span>
      {open && mounted && position
        ? createPortal(
            <span
              id={id}
              role="tooltip"
              className={tooltipClass}
              style={{
                left: position.left,
                top: position.top,
                transform: `translateY(calc(-100% - ${TOOLTIP_GAP_PX}px))`,
              }}
            >
              {hint}
            </span>,
            document.body
          )
        : null}
    </>
  );
}
