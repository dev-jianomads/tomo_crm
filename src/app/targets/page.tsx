"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useRequireSession } from "@/lib/auth";
import { usePersistentState } from "@/lib/storage";
import { useFunds } from "@/components/fund-provider";

type TargetFilter = { fund: string; region: string; interest: string };
type TargetList = { id: string; name: string; filters: TargetFilter; members: string[] };

const defaultFilters: TargetFilter = { fund: "all", region: "Any", interest: "Active" };
const defaultMembers = ["Alex Morgan", "Jamie Chen", "Priya Desai", "Samir Patel"];

export default function TargetsPage() {
  const { ready } = useRequireSession();
  const { funds, activeFundId } = useFunds();
  const [filters, setFilters] = useState<TargetFilter>(() => ({ ...defaultFilters, fund: activeFundId }));
  const [lists, setLists] = usePersistentState<TargetList[]>("tomo-target-lists", []);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [listName, setListName] = useState("");

  const matchingMembers = useMemo(() => {
    // Mock: vary members slightly by selected region/interest
    const subset = filters.interest === "Heating" ? defaultMembers.slice(0, 3) : defaultMembers;
    return subset;
  }, [filters.interest]);

  const activeList = lists.find((l) => l.id === activeListId) ?? null;

  const handleCreateList = () => {
    const trimmed = listName.trim();
    if (!trimmed) return;
    const newList: TargetList = { id: crypto.randomUUID(), name: trimmed, filters, members: matchingMembers };
    setLists((prev) => [newList, ...prev]);
    setActiveListId(newList.id);
    setListName("");
  };

  const listContent = (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold accent-title">Filters</p>
          <button className="text-xs text-blue-700 hover:underline" onClick={() => setFilters({ ...defaultFilters, fund: activeFundId })}>
            Reset
          </button>
        </div>
        <div className="grid gap-3">
          <FilterSelect label="Fund" value={filters.fund} options={[{ label: "All", value: "all" }, ...funds.map((f) => ({ label: f.name, value: f.id }))]} onChange={(val) => setFilters((prev) => ({ ...prev, fund: val }))} />
          <FilterSelect label="Region" value={filters.region} options={["Any", "North America", "Europe", "Asia"].map((r) => ({ label: r, value: r }))} onChange={(val) => setFilters((prev) => ({ ...prev, region: val }))} />
          <FilterSelect label="Interest" value={filters.interest} options={["Active", "Heating", "Cooling"].map((r) => ({ label: r, value: r }))} onChange={(val) => setFilters((prev) => ({ ...prev, interest: val }))} />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Create list</p>
          <span className="text-xs text-gray-500">{matchingMembers.length} in preview</span>
        </div>
        <input
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          placeholder="List name"
          value={listName}
          onChange={(e) => setListName(e.target.value)}
        />
        <button className="button-primary w-full" onClick={handleCreateList}>
          Create
        </button>
      </div>
    </div>
  );

  const detailContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold accent-title">Saved lists</p>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
        {lists.length ? (
          lists.map((list) => (
            <button
              key={list.id}
              onClick={() => setActiveListId(list.id)}
              className={`w-full rounded-md border px-3 py-2 text-left transition ${
                activeListId === list.id ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{list.name}</p>
                <span className="text-xs text-gray-600">{list.members.length} members</span>
              </div>
              <p className="text-xs text-gray-600">
                Fund: {list.filters.fund === "all" ? "All" : funds.find((f) => f.id === list.filters.fund)?.name ?? "Custom"} • {list.filters.region} • {list.filters.interest}
              </p>
            </button>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">No saved lists yet.</div>
        )}

        {activeList ? (
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold accent-title">{activeList.name}</p>
              <span className="text-xs text-gray-600">{activeList.members.length} members</span>
            </div>
            <p className="mt-1 text-xs text-gray-600">
              Fund: {activeList.filters.fund === "all" ? "All" : funds.find((f) => f.id === activeList.filters.fund)?.name ?? "Custom"} • {activeList.filters.region} • {activeList.filters.interest}
            </p>
            <div className="mt-2 space-y-1 text-sm text-gray-800">
              {activeList.members.map((m) => (
                <div key={m} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-2 py-1">
                  <span>{m}</span>
                  <span className="text-xs text-gray-500">Preview</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="targets"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={activeList?.name}
      assistantChips={["Suggest filters", "Who should be added", "Tighten this list"]}
    />
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-700">
      <span className="text-[11px] uppercase tracking-wide text-gray-500">{label}</span>
      <select className="rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

