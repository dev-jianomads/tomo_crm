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
  `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111827;max-width:560px;margin:0 auto;">${inner}</div>`;

/**
 * Renders the four Daily Brief sections as a single HTML fragment for Loops `content`.
 */
export function formatDailyBriefBlocksAsEmailHtml(
  blocks: DailyBriefBlock[],
  options?: { appBaseUrl?: string }
): string {
  const appBaseUrl = (options?.appBaseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.hellotomo.ai").replace(
    /\/$/,
    ""
  );
  const openApp = `${appBaseUrl}/home`;

  const cta = `
  <div style="margin-bottom:24px;padding:16px 18px;border-radius:12px;background:#f0f9ff;border:1px solid #bae6fd;">
    <p style="margin:0 0 10px;font-size:14px;color:#0c4a6e;font-weight:600;">Work your day in Tomo</p>
    <p style="margin:0 0 14px;font-size:14px;color:#334155;">Open Today to review items, prep meetings, and clear loops.</p>
    <a href="${escapeHtml(openApp)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#0284c7;color:#ffffff !important;text-decoration:none;font-size:14px;font-weight:600;">Open Today</a>
  </div>`;

  const sections = blocks.map((block) => {
    const linesHtml = block.items
      .map((line) => {
        const text = escapeHtml(line.label);
        if (line.link) {
          const href = escapeHtml(itemHref(appBaseUrl, line.link));
          return `<li style="margin:0 0 8px;"><a href="${href}" style="color:#0369a1;text-decoration:underline;">${text}</a></li>`;
        }
        return `<li style="margin:0 0 8px;color:#374151;">${text}</li>`;
      })
      .join("");

    let secondary = "";
    if (block.secondaryItems?.length) {
      const sub = block.secondarySubtitle ? `<p style="margin:12px 0 6px;font-size:12px;font-weight:600;color:#6b7280;">${escapeHtml(block.secondarySubtitle)}</p>` : "";
      const secLines = block.secondaryItems
        .map((line) => {
          const text = escapeHtml(line.label);
          if (line.link) {
            const href = escapeHtml(itemHref(appBaseUrl, line.link));
            return `<li style="margin:0 0 6px;"><a href="${href}" style="color:#0369a1;text-decoration:underline;">${text}</a></li>`;
          }
          return `<li style="margin:0 0 6px;color:#374151;">${text}</li>`;
        })
        .join("");
      secondary = `${sub}<ul style="margin:0;padding-left:20px;list-style:disc;">${secLines}</ul>`;
    }

    return `
  <div style="margin-bottom:28px;padding-bottom:22px;border-bottom:1px solid #e5e7eb;">
    <h2 style="margin:0 0 4px;font-size:17px;font-weight:700;color:#111827;">${escapeHtml(block.title)}</h2>
    <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">${escapeHtml(block.subtitle)}</p>
    <ul style="margin:0;padding-left:20px;list-style:disc;">${linesHtml}</ul>
    ${secondary}
    <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;font-style:italic;">${escapeHtml(block.insight)}</p>
  </div>`;
  });

  return wrap(`${cta}${sections.join("")}`);
}
