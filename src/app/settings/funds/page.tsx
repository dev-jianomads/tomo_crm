"use client";

import { useFunds } from "@/components/fund-provider";
import { FundManager } from "@/components/settings/settings-widgets";

export default function SettingsFundsPage() {
  const { funds, addFund, updateFund, removeFund, activeFundId, setActiveFundId } = useFunds();

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold accent-title">Funds</h2>
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-sm font-medium text-gray-900">Active fund</p>
        <select
          className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
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
