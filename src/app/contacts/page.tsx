"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { contacts } from "@/lib/mock-data";
import { useRequireSession } from "@/lib/auth";

const tabs = ["Overview", "Timeline", "Follow-ups", "Notes"] as const;

export default function ContactsPage() {
  const { ready } = useRequireSession();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cool">("all");
  const [activeId, setActiveId] = useState<string | null>(() => contacts[0]?.id ?? null);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");

  const filtered = contacts.filter((contact) => {
    const matchesQuery = contact.name.toLowerCase().includes(query.toLowerCase()) || contact.organization.toLowerCase().includes(query.toLowerCase());
    const matchesHeat = filter === "all" ? true : contact.relationshipHealth === filter;
    return matchesQuery && matchesHeat;
  });

  const activeContact = useMemo(() => contacts.find((c) => c.id === activeId) ?? null, [activeId]);

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Contacts</p>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts"
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
          />
        </div>
        <div className="mt-3 flex gap-2">
          {["all", "hot", "warm", "cool"].map((pill) => (
            <button
              key={pill}
              onClick={() => setFilter(pill as typeof filter)}
              className={`rounded-full px-3 py-1 text-xs capitalize transition ${
                filter === pill ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {filtered.map((contact) => (
          <button
            key={contact.id}
            onClick={() => {
              setActiveId(contact.id);
              setActiveTab("Overview");
            }}
            className={`w-full rounded-md border px-3 py-2 text-left transition ${
              activeId === contact.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
                <p className="text-xs text-gray-600">{contact.organization}</p>
              </div>
              <span className="text-xs capitalize text-gray-500">{contact.relationshipHealth}</span>
            </div>
            <p className="text-xs text-gray-600">Last interaction {contact.lastInteraction}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full space-y-4 overflow-auto p-4">
      {!activeContact ? (
        <Placeholder title="Select a contact to see details" />
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Contact</p>
              <h2 className="text-lg font-semibold text-gray-900">{activeContact.name}</h2>
              <p className="text-sm text-gray-600">{activeContact.role}</p>
              <p className="text-xs text-gray-500">Last interaction {activeContact.lastInteraction}</p>
            </div>
            <div className="flex gap-2">
              {activeContact.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-2 pb-2 text-sm font-medium transition ${
                  activeTab === tab ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Overview" && (
            <div className="space-y-2 text-sm text-gray-700">
              <p>{activeContact.notes}</p>
            </div>
          )}
          {activeTab === "Timeline" && (
            <div className="space-y-2">
              {activeContact.timeline.map((event) => (
                <div key={event.id} className="rounded-md border border-gray-200 px-3 py-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{event.date}</span>
                    <span>{event.type}</span>
                  </div>
                  <p className="text-sm text-gray-800">{event.summary}</p>
                </div>
              ))}
            </div>
          )}
          {activeTab === "Follow-ups" && (
            <div className="space-y-2">
              {activeContact.followUps.map((item) => (
                <div key={item.id} className="rounded-md border border-gray-200 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <span className="text-xs text-gray-500">{item.due}</span>
                  </div>
                  <p className="text-xs text-gray-500">{item.status === "open" ? "Open" : "Done"}</p>
                </div>
              ))}
            </div>
          )}
          {activeTab === "Notes" && (
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-600">
              Add quick notes from calls. TOMO keeps them synced with the timeline.
            </div>
          )}
        </>
      )}
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="contacts"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={activeContact?.name}
      assistantChips={["Show last interaction", "Draft a check-in email", "Highlight risks", "Suggest next step"]}
    />
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}

