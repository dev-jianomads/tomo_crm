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
} from "@heroicons/react/24/outline";
import { TomoAssistant } from "@/components/tomo-assistant";
import { initialMessages } from "@/lib/mock-data";
import { usePersistentState } from "@/lib/storage";
import { TomoMessage } from "@/lib/types";

type Section = "home" | "contacts" | "briefs" | "tasks" | "search" | "settings";

type AppShellProps = {
  section: Section;
  listContent: ReactNode;
  detailContent: ReactNode;
  contextTitle?: string;
  assistantChips?: string[];
};

const navItems: { href: string; label: string; icon: typeof HomeIcon; id: Section }[] = [
  { href: "/home", label: "Home", icon: HomeIcon, id: "home" },
  { href: "/contacts", label: "Contacts", icon: UserGroupIcon, id: "contacts" },
  { href: "/briefs", label: "Briefs", icon: Squares2X2Icon, id: "briefs" },
  { href: "/tasks", label: "Tasks", icon: ClipboardDocumentListIcon, id: "tasks" },
  { href: "/search", label: "Search", icon: MagnifyingGlassIcon, id: "search" },
];

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

function NavRail({ active }: { active: Section }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-[calc(100vh-64px)] w-16 flex-col items-center justify-between border-r border-gray-200 bg-gray-50/80 py-4">
      <div className="flex flex-col items-center gap-3">
        {navItems.map((item) => {
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
        })}
      </div>
      <div className="w-full">
        <Link href="/settings">
          <div
            className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md transition ${
              active === "settings" ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100"
            }`}
            title="Settings"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </div>
        </Link>
      </div>
    </aside>
  );
}

function BottomNav({ active }: { active: Section }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-t border-gray-200 bg-white px-6">
      {navItems
        .filter((item) => ["home", "contacts", "briefs", "tasks"].includes(item.id))
        .map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <Link key={item.id} href={item.href} className="flex flex-1 flex-col items-center gap-1">
              <Icon className={`h-5 w-5 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
              <span className={`text-xs ${isActive ? "text-blue-600" : "text-gray-600"}`}>{item.label}</span>
            </Link>
          );
        })}
    </nav>
  );
}

export function AppShell({ section, listContent, detailContent, contextTitle, assistantChips }: AppShellProps) {
  const isMobile = useIsMobile();
  const [middleWidth, setMiddleWidth] = usePersistentState<number>("tomo-pane-width", 42);
  const [detailHeight, setDetailHeight] = usePersistentState<number>("tomo-detail-height", 55);
  const [draggingColumn, setDraggingColumn] = useState(false);
  const [draggingRow, setDraggingRow] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [messages, setMessages] = usePersistentState<TomoMessage[]>("tomo-chat", initialMessages);

  const defaultChips = useMemo(() => {
    const base = ["Summarize this", "Draft a follow-up", "What changed recently?"];
    if (section === "contacts") return [...base, "Show last interaction", "Suggest next step"];
    if (section === "briefs") return [...base, "Generate talking points", "Shorten this brief"];
    if (section === "tasks") return [...base, "Prioritize tasks", "Draft an email for this task"];
    if (section === "home") return [...base, "What’s urgent today?", "Prep my next meeting"];
    return base;
  }, [section]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingColumn) return;
      const viewport = window.innerWidth;
      const leftNav = 64;
      const usable = viewport - leftNav - 16; // padding safety
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

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingRow) return;
      const containerHeight = window.innerHeight - 88; // minus header + paddings
      const newHeight = (e.clientY - 120) / containerHeight * 100;
      const clamped = Math.min(78, Math.max(38, newHeight));
      setDetailHeight(clamped);
    };
    const stop = () => setDraggingRow(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [draggingRow, setDetailHeight]);

  const handleSend = (text: string) => {
    const userMessage: TomoMessage = { id: crypto.randomUUID(), from: "user", text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          from: "tomo",
          text: contextTitle
            ? `Pulling context on "${contextTitle}". Here’s a concise next step: ${suggestionFromText(text)}`
            : `Got it. I’ll keep this in mind and suggest follow-ups.`,
          timestamp: Date.now(),
        },
      ]);
    }, 450);
  };

  const suggestions = assistantChips?.length ? assistantChips : defaultChips;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight">Tomo</span>
          <span className="text-xs text-gray-500">AI execution workspace</span>
        </div>
        <div className="hidden md:flex w-96 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          <input placeholder="Search across contacts, briefs, tasks" className="flex-1 bg-transparent focus:outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-gray-600 md:inline">Workspace</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-medium text-gray-700">
            JD
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-56px)]">
        {!isMobile && <NavRail active={section} />}

        <main className="relative flex w-full flex-1 flex-col">
          {!isMobile ? (
            <div className="flex flex-1 gap-0">
              <section
                className="flex-shrink-0 border-r border-gray-200"
                style={{ width: `calc(${middleWidth}% - 8px)` }}
              >
                {listContent}
              </section>

              <div
                className="w-1 cursor-col-resize bg-gray-100 hover:bg-blue-200"
                onMouseDown={() => setDraggingColumn(true)}
                aria-label="Resize panes"
              />

              <section className="flex flex-1 flex-col">
                <div className="relative" style={{ height: `${detailHeight}%` }}>
                  <div className="absolute inset-0 overflow-auto">{detailContent}</div>
                </div>
                <div
                  className="h-1 cursor-row-resize bg-gray-100 hover:bg-blue-200"
                  onMouseDown={() => setDraggingRow(true)}
                  aria-label="Resize detail and assistant"
                />
                <div className="flex-1 min-h-[240px] p-4">
                  <TomoAssistant
                    messages={messages}
                    onSend={handleSend}
                    suggestions={suggestions}
                    contextLabel={contextTitle ? `Context: ${contextTitle}` : "Workspace aware"}
                  />
                </div>
              </section>
            </div>
          ) : (
            <div className="flex flex-col gap-4 px-4 pb-20 pt-4">
              {listContent}
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                {detailContent}
              </div>
            </div>
          )}
        </main>
      </div>

      {isMobile && (
        <>
          <BottomNav active={section} />
          <button
            onClick={() => setAssistantOpen(true)}
            className="fixed bottom-16 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200"
            aria-label="Open TOMO chat"
          >
            <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
          </button>
          <AssistantSheet open={assistantOpen} onClose={() => setAssistantOpen(false)}>
            <TomoAssistant
              messages={messages}
              onSend={(text) => {
                handleSend(text);
              }}
              suggestions={suggestions}
              contextLabel={contextTitle ?? "Workspace aware"}
            />
          </AssistantSheet>
        </>
      )}
    </div>
  );
}

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
        <div className="flex items-center justify-center border-b border-gray-200 py-2">
          <div className="h-1.5 w-12 rounded-full bg-gray-200" />
        </div>
        <div className="h-full overflow-hidden px-3 pb-4 pt-2">{children}</div>
      </div>
    </div>
  );
}

function suggestionFromText(input: string) {
  if (input.toLowerCase().includes("brief")) return "Here’s a tighter brief plus 3 talking points.";
  if (input.toLowerCase().includes("follow")) return "I drafted a follow-up. Review before sending.";
  if (input.toLowerCase().includes("task")) return "I prioritized tasks and flagged any blockers.";
  return "Logged and ready. Want me to draft a quick summary?";
}

