"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  formatWorkflowRunFieldDisplay,
  type WorkflowRunConfig,
  type WorkflowRunConfigField,
  type WorkflowSurfaceEntry,
} from "@/lib/workflow-surface-mock";

export function WorkflowRunConfigPanel({ entry }: { entry: WorkflowSurfaceEntry }) {
  const cfg = entry.runConfig;
  if (!cfg) return null;

  return (
    <div className="space-y-6">
      {cfg.headline ? (
        <header>
          <h3 className="font-[family-name:var(--font-newsreader)] text-xl font-medium text-[color:var(--foreground)] [font-variation-settings:'opsz'_24]">
            {cfg.headline}
          </h3>
          {cfg.supportingText ? (
            <p className="mt-1 text-sm leading-relaxed text-[color:var(--tomo-body)]">{cfg.supportingText}</p>
          ) : null}
        </header>
      ) : null}

      {cfg.editable ? (
        <EditableRunConfigForm key={entry.id} entry={entry} config={cfg} />
      ) : (
        <LockedRunConfigView entry={entry} config={cfg} />
      )}
    </div>
  );
}

function LockedRunConfigView({ entry, config }: { entry: WorkflowSurfaceEntry; config: WorkflowRunConfig }) {
  const runs = entry.runHistory.slice(0, 4);

  return (
    <>
      <div className="space-y-3">
        {config.fields.map((field) => (
          <div
            key={field.id}
            className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-card-warm)_40%,var(--tomo-card))] px-3 py-2.5"
          >
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
              {field.label}
            </p>
            <p className="mt-1 text-sm font-medium text-[color:var(--foreground)]">{formatWorkflowRunFieldDisplay(field)}</p>
            {field.helperText ? <p className="mt-1 text-[11px] text-[color:var(--tomo-mute)]">{field.helperText}</p> : null}
          </div>
        ))}
      </div>

      <div className="rounded-[var(--tomo-radius-sm)] border border-dashed border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] px-3 py-2.5 text-xs text-[color:var(--tomo-body)]">
        Structural steps and timing cannot be changed on Tomo defaults. Use each draft step to review and edit outbound copy
        before approval.
      </div>

      {runs.length > 0 ? (
        <section>
          <p className="mb-2 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">
            Recent runs
          </p>
          <ul className="divide-y divide-[color:var(--tomo-rule-soft)] rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]">
            {runs.map((run) => (
              <li key={run.id} className="px-3 py-2.5">
                <p className="text-sm font-medium text-[color:var(--foreground)]">{run.listName}</p>
                <p className="mt-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[color:var(--tomo-mute)]">
                  {run.startedAtLabel} · {run.lpCount} LPs · {run.statusLabel}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function EditableRunConfigForm({
  entry,
  config,
}: {
  entry: WorkflowSurfaceEntry;
  config: WorkflowRunConfig;
}) {
  const initial = useMemo(() => {
    const record: Record<string, string> = {};
    for (const f of config.fields) {
      record[f.id] = f.value;
    }
    return record;
  }, [config]);

  const [values, setValues] = useState<Record<string, string>>(initial);

  const setVal = (id: string, v: string) => setValues((prev) => ({ ...prev, [id]: v }));

  const validate = (): boolean => {
    if (config.workflowId === "wf-themed-outreach") {
      const theme = (values.theme ?? "").trim();
      if (!theme) {
        toast.error("Add a theme or content kernel", { description: "Tomo needs text to personalize drafts." });
        return false;
      }
    }
    if (config.workflowId === "wf-trip-orchestrator") {
      if (!(values.destination ?? "").trim()) {
        toast.error("Destination required", { description: "Enter a city or region for this trip run." });
        return false;
      }
      if (!(values.date_window ?? "").trim()) {
        toast.error("Date window required", { description: "Enter the trip dates scheduling should respect." });
        return false;
      }
    }
    return true;
  };

  const launch = () => {
    if (!validate()) return;
    const listField = config.fields.find((f) => f.id === "list" || f.id === "source_list");
    const listLine =
      listField?.kind === "select"
        ? formatWorkflowRunFieldDisplay({ ...listField, value: values[listField.id] ?? listField.value })
        : "";
    toast.success("Run queued (demo)", {
      description: listLine
        ? `${entry.name} — list: ${listLine}. Session-local only until API wiring.`
        : `${entry.name} — session-local only until API wiring.`,
    });
  };

  return (
    <>
      <div className="space-y-4">
        {config.fields.map((field) => (
          <RunConfigFieldInput key={field.id} field={field} value={values[field.id] ?? ""} onChange={(v) => setVal(field.id, v)} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--tomo-rule-soft)] pt-4">
        <button
          type="button"
          onClick={launch}
          className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-2 text-sm font-medium text-[color:var(--tomo-card)] transition hover:opacity-90"
        >
          Launch run
        </button>
        <p className="text-xs text-[color:var(--tomo-mute)]">Demo: no server call — values stay local until API wiring.</p>
      </div>
    </>
  );
}

function RunConfigFieldInput({
  field,
  value,
  onChange,
}: {
  field: WorkflowRunConfigField;
  value: string;
  onChange: (v: string) => void;
}) {
  const kind = field.kind ?? "text";

  if (kind === "textarea") {
    return (
      <label className="block">
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
          {field.label}
        </span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="mt-1.5 w-full resize-y rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-2.5 py-2 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--tomo-teal)]"
        />
        {field.helperText ? <p className="mt-1 text-[11px] text-[color:var(--tomo-mute)]">{field.helperText}</p> : null}
      </label>
    );
  }

  if (kind === "select" && field.options?.length) {
    return (
      <label className="block">
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
          {field.label}
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-2.5 py-2 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--tomo-teal)]"
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {field.helperText ? <p className="mt-1 text-[11px] text-[color:var(--tomo-mute)]">{field.helperText}</p> : null}
      </label>
    );
  }

  if (kind === "toggle") {
    const on = value === "true";
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-card-warm)_35%,var(--tomo-card))] px-3 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[color:var(--foreground)]">{field.label}</p>
          {field.helperText ? <p className="mt-1 text-xs text-[color:var(--tomo-mute)]">{field.helperText}</p> : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`${field.label}: ${on ? "on" : "off"}`}
          onClick={() => onChange(on ? "false" : "true")}
          className={`relative h-7 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tomo-teal)] focus-visible:ring-offset-1 ${
            on ? "bg-[color:var(--tomo-status-green)]" : "bg-[color:color-mix(in_srgb,var(--tomo-mute)_42%,var(--tomo-rule))]"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-[color:var(--tomo-card)] shadow transition-transform ${on ? "translate-x-4" : ""}`}
          />
        </button>
      </div>
    );
  }

  return (
    <label className="block">
      <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
        {field.label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-2.5 py-2 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--tomo-teal)]"
      />
      {field.helperText ? <p className="mt-1 text-[11px] text-[color:var(--tomo-mute)]">{field.helperText}</p> : null}
    </label>
  );
}
