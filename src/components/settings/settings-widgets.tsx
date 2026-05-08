"use client";

import { LinkSlashIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DisconnectIntegrationDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  /** Shown on the primary button (e.g. "Disconnect Slack") */
  confirmLabel: string;
};

export function DisconnectIntegrationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
}: DisconnectIntegrationDialogProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center tomo-modal-scrim p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disconnect-integration-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] p-4 shadow-[var(--tomo-modal-shadow)]">
        <h2 id="disconnect-integration-title" className="text-base font-semibold text-[color:var(--foreground)]">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[color:var(--tomo-body)]">{description}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

type IntegrationRowProps = {
  title: string;
  status: string;
  /** When true, a disconnect control is available if onDisconnect is set */
  connected: boolean;
  onDisconnect?: () => void;
  /** Override default disconnect dialog copy */
  disconnectDescription?: string;
};

export function IntegrationRow({ title, status, connected, onDisconnect, disconnectDescription }: IntegrationRowProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const canDisconnect = connected && typeof onDisconnect === "function";
  const defaultDescription = `You can reconnect ${title} later from Settings. Some features may stop working until you connect again.`;

  return (
    <>
      <div className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-600">Manage connection</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-gray-500">{status}</span>
          {canDisconnect ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
              onClick={() => setDialogOpen(true)}
              title={`Disconnect ${title}`}
            >
              <LinkSlashIcon className="h-3.5 w-3.5" aria-hidden />
              Disconnect
            </button>
          ) : null}
        </div>
      </div>
      {canDisconnect && onDisconnect ? (
        <DisconnectIntegrationDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onConfirm={onDisconnect}
          title={`Disconnect ${title}?`}
          description={disconnectDescription ?? defaultDescription}
          confirmLabel={`Disconnect ${title}`}
        />
      ) : null}
    </>
  );
}

export function PlanCard({
  name,
  price,
  features,
  badge,
  active,
}: {
  name: string;
  price: string;
  features: string[];
  badge?: string;
  active?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${active ? "border-blue-500 bg-blue-50/40" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-gray-900">{name}</p>
          <p className="text-sm text-gray-700">{price}</p>
        </div>
        {badge ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{badge}</span> : null}
      </div>
      <ul className="mt-3 space-y-1 text-sm text-gray-700">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="button-primary mt-3 w-full">
        {active ? "Current plan" : "Select plan"}
      </button>
    </div>
  );
}

export function PlaceholderCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-3">
      <p className="text-sm font-semibold accent-title">{title}</p>
      <p className="text-xs text-gray-600">{body}</p>
      <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-500">Coming soon</p>
    </div>
  );
}

export function generatePresetSheetName() {
  const date = new Date();
  const iso = date.toISOString().split("T")[0];
  return `tomo_crm_sync_${iso}.xlsx`;
}

export function FundManager({
  funds,
  onAdd,
  onUpdate,
  onRemove,
}: {
  funds: { id: string; name: string }[];
  onAdd: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}) {
  const [draftName, setDraftName] = useState("");
  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">Manage funds</p>
        <span className="text-xs text-gray-600">{funds.length} saved</span>
      </div>
      <div className="space-y-2">
        {funds.map((fund) => (
          <div key={fund.id} className="flex items-center gap-2">
            <input
              className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              defaultValue={fund.name}
              onBlur={(e) => onUpdate(fund.id, e.target.value)}
            />
            <button type="button" className="text-xs text-rose-600 underline" onClick={() => onRemove(fund.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          placeholder="Add fund"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
        />
        <button
          type="button"
          className="button-primary"
          onClick={() => {
            onAdd(draftName);
            setDraftName("");
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
