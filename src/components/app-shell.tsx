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

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatBubbleLeftEllipsisIcon,
  Cog6ToothIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { TomoAssistant } from "@/components/tomo-assistant";
import { initialMessages } from "@/lib/mock-data";
import { usePersistentState } from "@/lib/storage";
import { TomoMessage } from "@/lib/types";
import { useFunds } from "@/components/fund-provider";

// IA labels (desktop order): TODAY, MOMENTUM, RELATIONSHIPS, TARGETS, ACTIVITY, SETTINGS
type Section = "home" | "momentum" | "contacts" | "targets" | "activity" | "materials" | "settings" | "search";

type AppShellProps = {
  section: Section;
  listContent: ReactNode;
  detailContent: ReactNode;
  contextTitle?: string; // Current context for Tomo AI (e.g., selected contact name)
  assistantChips?: string[]; // Quick action suggestions for Tomo
  detailVisible?: boolean;
};

/**
 * Navigation items configuration
 * PRODUCTION: Could add badge counts (e.g., tasks due today)
 */
const primaryNav: { href: string; label: string; icon: typeof HomeIcon; id: Section }[] = [
  { href: "/home", label: "Today", icon: HomeIcon, id: "home" },
  { href: "/momentum", label: "Momentum", icon: ChartBarIcon, id: "momentum" },
  { href: "/contacts", label: "Relationships", icon: UserGroupIcon, id: "contacts" },
  { href: "/targets", label: "Targets", icon: Squares2X2Icon, id: "targets" },
];

const secondaryNav: { href: string; label: string; icon: typeof HomeIcon; id: Section }[] = [
  { href: "/activity", label: "Activity", icon: ClipboardDocumentListIcon, id: "activity" },
  { href: "/settings", label: "Settings", icon: Cog6ToothIcon, id: "settings" },
];

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
 * Desktop navigation rail (left sidebar)
 */
function NavRail({ active }: { active: Section }) {
  const pathname = usePathname();

  const renderItem = (item: (typeof primaryNav)[number]) => {
    const Icon = item.icon;
    const isActive = pathname?.startsWith(item.href) || active === item.id;
    return (
      <Link key={item.href} href={item.href} className="w-full">
        <div
          className={`mx-auto flex h-10 w-10 items-center justify-center rounded-md transition ${
            isActive ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100"
          }`}
          title={item.label}
        >
          <Icon className="h-5 w-5" />
        </div>
      </Link>
    );
  };

  return (
    <aside className="flex h-[calc(100vh-64px)] w-16 flex-col items-center justify-between border-r border-gray-200 bg-gray-50/80 py-4">
      <div className="flex flex-col items-center gap-3">{primaryNav.map(renderItem)}</div>
      <div className="flex flex-col items-center gap-2">
        {secondaryNav.map((item) => renderItem(item))}
      </div>
    </aside>
  );
}

/**
 * Mobile bottom navigation bar
 * Shows 5 items: Home, Contacts, Briefs, Tasks, Settings
 */
function BottomNav({ active }: { active: Section }) {
  const items = [...primaryNav, { href: "/activity", label: "Activity", icon: ClipboardDocumentListIcon, id: "activity" as Section }, { href: "/settings", label: "Settings", icon: Cog6ToothIcon, id: "settings" as Section }];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-t border-gray-200 bg-white px-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <Link key={item.id} href={item.href} className="flex flex-1 flex-col items-center gap-1">
            <Icon className={`h-5 w-5 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
            <span className={`text-[11px] ${isActive ? "text-blue-600" : "text-gray-600"}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Main App Shell component
 */
export function AppShell({ section, listContent, detailContent, contextTitle, assistantChips, detailVisible = true }: AppShellProps) {
  const isMobile = useIsMobile();
  const { funds, activeFundId, setActiveFundId } = useFunds();
  const activeFund = activeFundId === "all" ? "All funds" : funds.find((f) => f.id === activeFundId)?.name ?? "All funds";
  
  // Persisted panel sizes (survive page refresh)
  const [middleWidth, setMiddleWidth] = usePersistentState<number>("tomo-pane-width", 42);
  
  // Drag state for resizable panels
  const [draggingColumn, setDraggingColumn] = useState(false);
  
  // Assistant dock state (desktop + mobile)
  const [assistantOpen, setAssistantOpen] = useState(false);
  
  /**
   * Chat messages with Tomo AI
   * PRODUCTION: This could be:
   * - In-memory only (privacy-first, no persistence)
   * - Persisted to localStorage (current approach)
   * - Synced to Supabase for cross-device continuity
   */
  const [messages, setMessages] = usePersistentState<TomoMessage[]>("tomo-chat", initialMessages);

  /**
   * Context-aware suggestion chips for Tomo
   * These change based on which section/page the user is viewing
   */
  const defaultChips = useMemo(() => {
    const base = ["Summarize this", "Draft a follow-up", "What changed recently?"];
    if (section === "contacts") return [...base, "Show last interaction", "Suggest next step"];
    if (section === "materials") return [...base, "Draft follow-up", "Summarize this brief", "Create action"];
    if (section === "momentum") return [...base, "Explain this score", "What next", "Draft outreach"];
    if (section === "activity") return [...base, "Summarize activity", "Filter by fund", "Export this log"];
    if (section === "targets") return [...base, "Propose a target list", "Add a filter", "Who qualifies?"];
    if (section === "search") return [...base, "Show top matches", "Filter to fund", "Draft outreach"];
    if (section === "home") return [...base, "What's urgent today?", "Prep my next meeting"];
    return base;
  }, [section]);

  // Column resize handler (list/detail split)
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingColumn) return;
      const viewport = window.innerWidth;
      const leftNav = 64;
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

  /**
   * Handle sending message to Tomo AI
   * 
   * CURRENT: Mock response with simulated delay
   * 
   * PRODUCTION: Replace with actual API call
   * See tomo-assistant.tsx for detailed streaming implementation example
   * 
   * The contextTitle is passed to Tomo so it knows what entity
   * the user is currently viewing (for context-aware responses)
   */
  const handleSend = (text: string) => {
    // Add user message immediately
    const userMessage: TomoMessage = { id: crypto.randomUUID(), from: "user", text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    
    // MOCK: Simulate AI response after delay
    // PRODUCTION: Replace with streaming API call to /api/tomo/chat
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          from: "tomo",
          text: contextTitle
            ? `Pulling context on "${contextTitle}". Here's a concise next step: ${suggestionFromText(text)}`
            : `Got it. I'll keep this in mind and suggest follow-ups.`,
          timestamp: Date.now(),
        },
      ]);
    }, 450);
  };

  const suggestions = assistantChips?.length ? assistantChips : defaultChips;
  const contextLabel = contextTitle ? `${contextTitle} — ${activeFund}` : activeFund;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight">Tomo</span>
        </div>

        <div className="hidden md:flex w-96 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          <input placeholder="Search across the workspace" className="flex-1 bg-transparent focus:outline-none" />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-[11px] uppercase tracking-wide text-gray-500">Fund</span>
            <select
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none"
              value={activeFundId}
              onChange={(e) => setActiveFundId(e.target.value)}
            >
              <option value="all">All</option>
              {funds.map((fund) => (
                <option key={fund.id} value={fund.id}>
                  {fund.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-medium text-gray-700">
            JD
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-56px)]">
        {/* Desktop navigation rail */}
        {!isMobile && <NavRail active={section} />}

        <main className="relative flex w-full flex-1 flex-col">
          {/* Desktop layout: side-by-side panels */}
          {!isMobile ? (
            <div className="flex flex-1 gap-0">
              {/* List panel (contacts list, briefs list, etc.) */}
              <section
                className="flex-shrink-0 border-r border-gray-200"
                style={{ width: detailVisible ? `calc(${middleWidth}% - 8px)` : "calc(100% - 8px)" }}
              >
                {listContent}
              </section>

              {/* Column resize handle */}
              {detailVisible ? (
                <div
                  className="w-1 cursor-col-resize bg-gray-100 hover:bg-blue-200"
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
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                {detailContent}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bottom nav for mobile */}
      {isMobile && <BottomNav active={section} />}

      {/* Floating action button to open Tomo */}
      <button
        onClick={() => setAssistantOpen(true)}
        className="fixed bottom-16 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200"
        aria-label="Open TOMO chat"
      >
        <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
      </button>

      {/* Assistant surface */}
      {isMobile ? (
        <AssistantSheet open={assistantOpen} onClose={() => setAssistantOpen(false)}>
          <TomoAssistant
            messages={messages}
            onSend={(text) => {
              handleSend(text);
            }}
            suggestions={suggestions}
            contextLabel={contextLabel}
          />
        </AssistantSheet>
      ) : (
        <AssistantDock open={assistantOpen} onClose={() => setAssistantOpen(false)}>
          <TomoAssistant messages={messages} onSend={handleSend} suggestions={suggestions} contextLabel={contextLabel} />
        </AssistantDock>
      )}
    </div>
  );
}

/**
 * Mobile bottom sheet for Tomo AI assistant
 * Slides up from bottom when opened
 */
function AssistantSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className={`fixed inset-0 z-50 bg-black/20 transition ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={onClose}
    >
      <div
        className={`absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ minHeight: "70vh", maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle indicator */}
        <div className="flex items-center justify-center border-b border-gray-200 py-2">
          <div className="h-1.5 w-12 rounded-full bg-gray-200" />
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
        <div className="pointer-events-auto flex w-[360px] max-w-[90vw] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
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

/**
 * Mock response generator based on user input
 * PRODUCTION: Remove this - responses come from Tomo AI API
 */
function suggestionFromText(input: string) {
  if (input.toLowerCase().includes("brief")) return "Here's a tighter brief plus 3 talking points.";
  if (input.toLowerCase().includes("follow")) return "I drafted a follow-up. Review before sending.";
  if (input.toLowerCase().includes("task")) return "I prioritized tasks and flagged any blockers.";
  return "Logged and ready. Want me to draft a quick summary?";
}






