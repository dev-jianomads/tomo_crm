/**
 * Primary nav glyphs — paths match `design/tomo_today_light_v2.html` (18×18, stroke 1.8).
 */

import type { SVGProps } from "react";

export type NavRailGlyph = "today" | "relationships" | "lists" | "workflows" | "insights" | "settings";

const strokeIcon = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type IconProps = SVGProps<SVGSVGElement> & { glyph: NavRailGlyph };

export function NavRailGlyphIcon({ glyph, className, ...rest }: IconProps) {
  const base = {
    ...strokeIcon,
    viewBox: "0 0 24 24",
    width: 18,
    height: 18,
    className,
    "aria-hidden": true as const,
    ...rest,
  };

  switch (glyph) {
    case "today":
      return (
        <svg {...base}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "relationships":
      return (
        <svg {...base}>
          <circle cx="9" cy="7" r="4" />
          <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          <circle cx="17" cy="7" r="3" />
          <path d="M21 21v-1a3 3 0 0 0-2-2.8" />
        </svg>
      );
    case "lists":
      return (
        <svg {...base}>
          <path d="M3 6h18M3 12h18M3 18h12" />
        </svg>
      );
    case "workflows":
      return (
        <svg {...base}>
          <path d="M14 4h6v6" />
          <path d="M20 4l-9 9" />
          <path d="M10 20H4v-6" />
          <path d="M4 20l9-9" />
        </svg>
      );
    case "insights":
      return (
        <svg {...base}>
          <path d="M12 20V10M18 20V4M6 20v-4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...base}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
  }
}
