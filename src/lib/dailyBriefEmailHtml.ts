/**
 * Email-safe HTML for Loops.so transactional template `content` data variable.
 * Inline styles only — avoid external CSS. Escape all dynamic text.
 */

import type { DailyBriefBlock, DailyBriefLink } from "@/lib/dailyBriefFromToday";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function itemHref(baseUrl: string, link: DailyBriefLink): string {
  const root = baseUrl.replace(/\/$/, "");
  const u = new URL("/home", `${root}/`);
  if (link.kind === "action") u.searchParams.set("focus", "action");
  if (link.kind === "commitment") u.searchParams.set("focus", "commitment");
  if (link.kind === "brief") u.searchParams.set("focus", "brief");
  u.searchParams.set("id", link.id);
  return u.toString();
}

const wrap = (inner: string) =>
  `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.45;color:#111827;max-width:560px;margin:0 auto;padding:0 4px;">${inner}</div>`;

/**
 * Renders Daily Brief sections for Loops `content`: each block is **title + bullet list** only
 * (no subtitles, insights, or secondary subheadings — those stay in the in-app brief).
 */
export function formatDailyBriefBlocksAsEmailHtml(
  blocks: DailyBriefBlock[],
  options?: { appBaseUrl?: string }
): string {
  const appBaseUrl = (options?.appBaseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.hellotomo.ai").replace(
    /\/$/,
    ""
  );

  const sections = blocks.map((block) => {
    const linesHtml = block.items
      .map((line) => {
        const text = escapeHtml(line.label);
        if (line.link) {
          const href = escapeHtml(itemHref(appBaseUrl, line.link));
          return `<li style="margin:0 0 4px;"><a href="${href}" style="color:#0369a1;text-decoration:underline;">${text}</a></li>`;
        }
        return `<li style="margin:0 0 4px;color:#374151;">${text}</li>`;
      })
      .join("");

    /** Second list when present (e.g. Momentum “Cooling”) — no subtitle line in email */
    let secondary = "";
    if (block.secondaryItems?.length) {
      const secLines = block.secondaryItems
        .map((line) => {
          const text = escapeHtml(line.label);
          if (line.link) {
            const href = escapeHtml(itemHref(appBaseUrl, line.link));
            return `<li style="margin:0 0 3px;"><a href="${href}" style="color:#0369a1;text-decoration:underline;">${text}</a></li>`;
          }
          return `<li style="margin:0 0 3px;color:#374151;">${text}</li>`;
        })
        .join("");
      secondary = `<ul style="margin:6px 0 0;padding-left:18px;list-style:disc;">${secLines}</ul>`;
    }

    return `
  <div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #e5e7eb;">
    <h2 style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111827;">${escapeHtml(block.title)}</h2>
    <ul style="margin:0;padding-left:18px;list-style:disc;">${linesHtml}</ul>
    ${secondary}
  </div>`;
  });

  return wrap(sections.join(""));
}
