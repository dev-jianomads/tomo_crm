"use client";

import { useFunds } from "@/components/fund-provider";
import { FundManager } from "@/components/settings/settings-widgets";

export default function SettingsFundsPage() {
  const { funds, addFund, updateFund, removeFund, activeFundId, setActiveFundId } = useFunds();

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold accent-title">Funds</h2>
      <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-3 shadow-[var(--tomo-shadow-1)]">
        <p className="text-sm font-medium text-[color:var(--foreground)]">Active fund</p>
        <select
          className="tomo-input mt-2 w-full text-sm shadow-none"
          value={activeFundId}
          onChange={(e) => setActiveFundId(e.target.value)}
        >
          <option value="all">All</option>
          {funds.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <FundManager funds={funds} onAdd={addFund} onUpdate={updateFund} onRemove={removeFund} />
    </div>
  );
}
