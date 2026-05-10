/**
 * =============================================================================
 * TOMO CRM - App Shell Component
 * =============================================================================
 * 
 * The main layout wrapper for authenticated pages.
 * Provides navigation, resizable panels, and the Tomo AI assistant.
 * 
 * LAYOUT STRUCTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Header (logo, search, user avatar)                                       │
 * ├────┬────────────────────┬───────────────────────────────────────────────┤
 * │    │                    │                                               │
 * │ N  │  List Content      │  Detail Content                               │
 * │ a  │  (contacts list,   │  (contact detail, brief detail, etc.)         │
 * │ v  │  briefs list, etc) │                                               │
 * │    │                    ├───────────────────────────────────────────────┤
 * │ R  │                    │  Tomo AI Assistant                            │
 * │ a  │                    │  (always visible on desktop)                  │
 * │ i  │                    │                                               │
 * │ l  │                    │                                               │
 * └────┴────────────────────┴───────────────────────────────────────────────┘
 * 
 * MOBILE LAYOUT:
 * - Bottom navigation bar
 * - List and detail stacked vertically
 * - Tomo AI in floating sheet (FAB to open)
 * 
 * PRODUCTION ENHANCEMENTS:
 * - Add user profile data from Firebase/Supabase
 * - Add notification badge on nav items
 * - Global search hitting Supabase with full-text search
 * - Keyboard shortcuts (Cmd+K for search, etc.)
 * =============================================================================
 */

"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { TomoAssistant } from "@/components/tomo-assistant";
import { TomoChatProvider } from "@/components/tomo-chat-context";
import { NavRailGlyphIcon, type NavRailGlyph } from "@/components/nav-rail-icons";
import { usePersistentState } from "@/lib/usePersistentState";
import { useFunds } from "@/components/fund-provider";
import type { DailyBriefBlock } from "@/lib/dailyBriefFromToday";
import type { RadarModalPayload } from "@/lib/radarModalTypes";

// IA labels (desktop order): TODAY, RELATIONSHIPS, PIPELINE, WORKFLOWS, INSIGHTS, SETTINGS (Activity + LP Network routes hidden from nav; sections still supported)
type Section =
  | "home"
  | "relationships"
  | "pipeline"
  | "workflows"
  | "insights"
  | "lp_network"
  | "activity"
  | "materials"
  | "settings"
  | "search";

type TodayContext = {
  actions: { id: string; title: string; trigger: string; status: string; type: string }[];
  commitments: { id: string; title: string; datetime: string; lp: string; contactName: string }[];
  /** Same structure as the Daily Brief email / orchestrator (four-block digest). */
  dailyBriefBlocks?: DailyBriefBlock[];
  /** Unified Radar Modal (Daily Brief + On my radar) — SRS Appendix I; same payload as the in-app modal. */
  radarModalPayload?: RadarModalPayload;
  /** Collapsible “Previous” on Today: prior-day backlog + deferred; same data as the expanded list. */
  previousAttention?: {
    count: number;
    items: { id: string; title: string; trigger: string; status: string; type: string; group: string }[];
  };
  /** “Where the raise stands” counts (SRS §3.8); same partition as Section 9 Today supplement. */
  raiseStands?: {
    genuinelyMoveable: number;
    healthyOnTrack: number;
    coolingWatch: number;
    driftingAct: number;
  };
};

type AppShellProps = {
  section: Section;
  listContent: ReactNode;
  detailContent: ReactNode;
  contextTitle?: string; // Current context for Tomo AI (e.g., selected contact name)
  assistantChips?: string[]; // Quick action suggestions for Tomo
  detailVisible?: boolean;
  todayContext?: TodayContext; // For Today page: actions, commitments, Daily Brief blocks for Tomo
};

type NavItem = {
  href: string;
  label: string;
  id: Section;
  glyph: NavRailGlyph;
};

/**
 * Desktop rail order matches design mocks: primary destinations, spacer, then Settings.
 */
const railMain: NavItem[] = [
  { href: "/home", label: "Today", id: "home", glyph: "today" },
  { href: "/relationships", label: "Relationships", id: "relationships", glyph: "relationships" },
  { href: "/pipeline", label: "Lists", id: "pipeline", glyph: "lists" },
  { href: "/workflows", label: "Workflows", id: "workflows", glyph: "workflows" },
  { href: "/insights", label: "Insights", id: "insights", glyph: "insights" },
];

const railFooter: NavItem[] = [{ href: "/settings", label: "Settings", id: "settings", glyph: "settings" }];

/**
 * Hook to detect mobile viewport
 * Uses 767px breakpoint (md in Tailwind)
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handle = () => setIsMobile(mq.matches);
    handle();
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, []);

  return isMobile;
}

/**
 * Desktop navigation rail (left sidebar) — 72px, Fraunces logotype, design SVG glyphs.
 */
function NavRail({ active }: { active: Section }) {
  const pathname = usePathname();

  const renderItem = (item: NavItem) => {
    const isActive = Boolean(pathname?.startsWith(item.href)) || active === item.id;
    return (
      <Link
        key={item.href}
        href={item.href}
        className="w-full"
        data-testid={`nav-rail-link-${item.id}`}
        aria-current={isActive ? "page" : undefined}
        aria-label={item.label}
        title={item.label}
      >
        <div
          className={`mx-auto flex h-[38px] w-[38px] items-center justify-center rounded-[4px] transition-colors duration-200 ${
            isActive ? "nav-rail-item-active" : "text-[color:var(--tomo-mute)] nav-rail-item-hover"
          }`}
        >
          <NavRailGlyphIcon glyph={item.glyph} />
        </div>
      </Link>
    );
  };

  return (
    <aside className="flex h-[calc(100vh-3.5rem)] w-[72px] shrink-0 flex-col items-center border-r border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] pb-4 pt-5">
      <Link
        href="/home"
        className="mb-6 font-[family-name:var(--font-fraunces),Georgia,serif] text-[22px] font-medium leading-none tracking-[-0.02em] text-[color:var(--tomo-navy)] [font-variation-settings:'opsz'_36]"
        aria-label="Tomo — Today"
        title="Tomo"
      >
        tomo.
      </Link>
      <div className="flex w-full flex-col items-center gap-1">{railMain.map(renderItem)}</div>
      <div className="min-h-0 flex-1 shrink" aria-hidden="true" />
      <div className="flex w-full flex-col items-center gap-1">{railFooter.map(renderItem)}</div>
    </aside>
  );
}

/**
 * Mobile bottom navigation bar — same glyphs as desktop rail.
 */
function BottomNav({ active }: { active: Section }) {
  const pathname = usePathname();
  const items = [...railMain, ...railFooter];
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-t border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] px-1 dark:bg-[color:var(--tomo-card)]"
      aria-label="Primary"
    >
      {items.map((item) => {
        const isActive = Boolean(pathname?.startsWith(item.href)) || active === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1"
            data-testid={`nav-bottom-link-${item.id}`}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
          >
            <span
              className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[4px] transition-colors duration-200 ${
                isActive ? "nav-rail-item-active" : "text-[color:var(--tomo-mute)] nav-rail-item-hover"
              }`}
            >
              <NavRailGlyphIcon glyph={item.glyph} />
            </span>
            <span
              className={`truncate px-0.5 text-[10px] leading-tight ${
                isActive
                  ? "font-medium text-[color:var(--tomo-navy)] dark:text-[color:var(--tomo-teal)]"
                  : "text-[color:var(--tomo-mute)]"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Main App Shell component
 */
export function AppShell({ section, listContent, detailContent, contextTitle, assistantChips, detailVisible = true, todayContext }: AppShellProps) {
  const isMobile = useIsMobile();
  const { funds, activeFundId, setActiveFundId } = useFunds();
  const activeFund = activeFundId === "all" ? "All funds" : funds.find((f) => f.id === activeFundId)?.name ?? "All funds";
  
  // Persisted panel sizes (survive page refresh)
  const [middleWidth, setMiddleWidth] = usePersistentState<number>("tomo-pane-width", 30);
  
  // Drag state for resizable panels
  const [draggingColumn, setDraggingColumn] = useState(false);
  
  // Assistant dock state (desktop + mobile)
  const [assistantOpen, setAssistantOpen] = useState(false);

  // Tomo AI chat via orchestrator (surface: general = all 4 tools).
  // Transport uses static config only; section/contextTitle passed per-request in handleSend
  // to avoid stale context (useChat doesn't react to transport changes after init).
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tomo/orchestrate",
        body: {
          context: {
            surface: "general" as const,
          },
        },
      }),
    []
  );

  const { messages, sendMessage, status } = useChat({ transport });
  const isStreaming = status === "streaming" || status === "submitted";

  /**
   * Context-aware suggestion chips for Tomo
   * These change based on which section/page the user is viewing
   */
  const defaultChips = useMemo(() => {
    const base = ["Summarize this", "Draft a follow-up", "What changed recently?"];
    if (section === "relationships") return [...base, "Show last interaction", "Suggest next step"];
    if (section === "materials") return [...base, "Draft follow-up", "Summarize this brief", "Create action"];
    if (section === "activity") return [...base, "Summarize activity", "Filter by fund", "Export this log"];
    if (section === "workflows") return [...base, "Edit workflow rules", "Add target filters", "Test run"];
    if (section === "pipeline") return [...base, "Propose a saved list", "Add a filter", "Who qualifies?"];
    if (section === "lp_network") return [...base, "Who fits our fundraise?", "Summarize intro status", "Explain double opt-in"];
    if (section === "search") return [...base, "Show top matches", "Filter to fund", "Draft outreach"];
    if (section === "insights") return [...base, "Explain compliance trend", "What counts as Fat Middle?", "How is velocity defined?"];
    if (section === "home") return [...base, "What's urgent today?", "Prep my next meeting"];
    return base;
  }, [section]);

  // Column resize handler (list/detail split)
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingColumn) return;
      const viewport = window.innerWidth;
      const leftNav = 72;
      const usable = viewport - leftNav - 16;
      const newWidth = ((e.clientX - leftNav) / usable) * 100;
      const clamped = Math.min(65, Math.max(28, newWidth));
      setMiddleWidth(clamped);
    };
    const stop = () => setDraggingColumn(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [draggingColumn, setMiddleWidth]);

  const suggestions = assistantChips?.length ? assistantChips : defaultChips;

  // Hide chips as user selects them (reset when section changes)
  const [usedChips, setUsedChips] = useState<Set<string>>(new Set());
  useEffect(() => {
    setUsedChips(new Set());
  }, [section]);

  const visibleSuggestions = useMemo(
    () => suggestions.filter((s) => !usedChips.has(s)),
    [suggestions, usedChips]
  );

  const contextLabel = contextTitle ? `${contextTitle} — ${activeFund}` : activeFund;

  const handleSend = useCallback(
    (text: string) => {
      if (suggestions.includes(text)) {
        setUsedChips((prev) => new Set([...prev, text]));
      }
      sendMessage(
        { text },
        {
          body: {
            context: {
              surface: "general" as const,
              page: section,
              contextTitle: contextLabel,
              ...(section === "home" && todayContext ? { todayContext } : {}),
            },
          },
        }
      );
    },
    [suggestions, section, contextLabel, sendMessage, todayContext]
  );

  const openAndSend = useCallback(
    (text: string) => {
      setAssistantOpen(true);
      if (suggestions.includes(text)) {
        setUsedChips((prev) => new Set([...prev, text]));
      }
      handleSend(text);
    },
    [handleSend, suggestions]
  );

  return (
    <TomoChatProvider
      openAndSend={openAndSend}
      messages={messages}
      onSend={handleSend}
      suggestions={visibleSuggestions}
      contextLabel={contextLabel}
      isStreaming={isStreaming}
    >
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      {/* Header */}
      <header className="flex h-14 items-center justify-end border-b border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] px-4 dark:bg-[color:var(--tomo-card)]">
        <div className="flex min-w-0 items-center gap-3">
          {/* LP Network (Phase 6): global fund selector drives mandate filtering via `useFunds` */}
          {section === "lp_network" ? (
            <div className="flex flex-col text-left">
              <span className="text-[11px] uppercase tracking-wide text-[color:var(--tomo-mute)]">Fund</span>
              <select
                className="rounded-md border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-2 py-1 text-xs text-[color:var(--foreground)] shadow-sm focus:border-[color:var(--tomo-teal)] focus:outline-none focus:ring-1 focus:ring-[color:var(--tomo-teal)]"
                value={activeFundId}
                onChange={(e) => setActiveFundId(e.target.value)}
                aria-label="Workspace fund"
              >
                <option value="all">All</option>
                {funds.map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    {fund.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--tomo-rule)] bg-[#1c2b3a] text-xs font-semibold text-white dark:border-transparent dark:bg-[#2e3f52]">
            JD
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-56px)]">
        {/* Desktop navigation rail */}
        {!isMobile && <NavRail active={section} />}

        <main className="relative flex min-w-0 w-full flex-1 flex-col overflow-x-hidden">
          {/* Desktop layout: side-by-side panels */}
          {!isMobile ? (
            <div className="flex min-w-0 flex-1 gap-0">
              {/* List panel (contacts list, briefs list, etc.) */}
              <section
                className="flex min-h-0 min-w-0 flex-shrink-0 flex-col overflow-hidden border-r border-[color:var(--tomo-rule)]"
                style={{ width: detailVisible ? `calc(${middleWidth}% - 8px)` : "calc(100% - 8px)" }}
              >
                {listContent}
              </section>

              {/* Column resize handle */}
              {detailVisible ? (
                <div
                  className="w-1 cursor-col-resize bg-[color:var(--tomo-rule)] hover:bg-[color:var(--tomo-teal-tint)] dark:hover:bg-[color:var(--tomo-teal-soft)]"
                  onMouseDown={() => setDraggingColumn(true)}
                  aria-label="Resize panes"
                />
              ) : null}

              {/* Detail + Assistant panel */}
              {detailVisible ? (
                <section className="flex flex-1 flex-col">
                  <div className="relative h-full">
                    <div className="absolute inset-0 overflow-auto">{detailContent}</div>
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            /* Mobile layout: stacked vertically */
            <div className="flex flex-col gap-4 px-4 pb-20 pt-4">
              {listContent}
              {detailVisible && (
                <div className="rounded-lg border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  {detailContent}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Bottom nav for mobile */}
      {isMobile && <BottomNav active={section} />}

      {/* Floating action button — hidden where Tomo is inline (Today, Workflows) or in drawer (Relationships, Lists), and on Settings (no assistant). LP Network keeps the FAB (Phase 5). */}
      {section !== "home" &&
        section !== "workflows" &&
        section !== "relationships" &&
        section !== "pipeline" &&
        section !== "settings" && (
        <button
          onClick={() => setAssistantOpen(true)}
          className="fixed bottom-16 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--tomo-teal)] text-white shadow-lg shadow-[color:rgba(14,124,124,0.35)] dark:shadow-[color:rgba(19,168,168,0.35)]"
          aria-label="Open TOMO chat"
        >
          <SparklesIcon className="h-5 w-5" aria-hidden />
        </button>
      )}

      {/* Assistant surface — hidden on workflows (inline AI) and Settings (no chat). */}
      {section !== "workflows" && section !== "settings" && (
        isMobile ? (
          <AssistantSheet open={assistantOpen} onClose={() => setAssistantOpen(false)}>
            <TomoAssistant
              messages={messages}
              onSend={handleSend}
              suggestions={visibleSuggestions}
              contextLabel={contextLabel}
              isStreaming={isStreaming}
            />
          </AssistantSheet>
        ) : (
          <AssistantDock open={assistantOpen} onClose={() => setAssistantOpen(false)}>
            <TomoAssistant
              messages={messages}
              onSend={handleSend}
              suggestions={visibleSuggestions}
              contextLabel={contextLabel}
              isStreaming={isStreaming}
            />
          </AssistantDock>
        )
      )}
    </div>
    </TomoChatProvider>
  );
}

/**
 * Mobile bottom sheet for Tomo AI assistant
 * Slides up from bottom when opened
 */
function AssistantSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className={`fixed inset-0 z-50 tomo-drawer-veil transition ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={onClose}
    >
      <div
        className={`absolute bottom-0 left-0 right-0 rounded-t-2xl border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)] transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ minHeight: "70vh", maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle indicator */}
        <div className="flex items-center justify-center border-b border-[color:var(--tomo-rule-soft)] py-2">
          <div className="h-1.5 w-12 rounded-full bg-[color:var(--tomo-rule)]" />
        </div>
        <div className="h-full overflow-hidden px-3 pb-4 pt-2">{children}</div>
      </div>
    </div>
  );
}

function AssistantDock({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <div className={`pointer-events-none fixed bottom-4 right-4 z-40 transition ${open ? "opacity-100" : "opacity-0"}`}>
      {open ? (
        <div className="pointer-events-auto flex w-[520px] max-w-[90vw] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
            <p className="text-sm font-medium text-gray-900">TOMO</p>
            <button className="text-xs text-gray-500 hover:text-gray-700" onClick={onClose}>
              Close
            </button>
          </div>
          <div className="h-[440px] overflow-hidden px-3 pb-3 pt-2">{children}</div>
        </div>
      ) : null}
    </div>
  );
}







