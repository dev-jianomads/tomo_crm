"use client";

import { useAppearanceSettings } from "@/components/theme-provider";
import { TomoCard } from "@/components/ui/card";
import type { AppearancePreference } from "@/lib/theme-appearance";

const OPTIONS: { value: AppearancePreference; label: string; hint: string }[] = [
  { value: "system", label: "System", hint: "Match browser or OS appearance." },
  { value: "light", label: "Light", hint: "Always use light mode." },
  { value: "dark", label: "Dark", hint: "Always use dark mode." },
];

export function AppearanceSettings() {
  const { preference, setPreference, ready } = useAppearanceSettings();

  return (
    <TomoCard className="p-4">
      <p className="tomo-field-label">Appearance</p>
      <p className="mt-1 text-sm text-[color:var(--tomo-body)]">
        Choose how TOMO looks on this device. Your choice is saved locally on this device.
      </p>
      <fieldset className="mt-4 space-y-2" disabled={!ready}>
        <legend className="sr-only">Color theme</legend>
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-3 rounded-[var(--tomo-radius-md)] border px-3 py-2.5 transition ${
              preference === opt.value
                ? "border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal-tint)]"
                : "border-[color:var(--tomo-rule)] hover:border-[color:var(--tomo-mute)]"
            }`}
          >
            <input
              type="radio"
              name="appearance"
              value={opt.value}
              checked={preference === opt.value}
              onChange={() => setPreference(opt.value)}
              className="mt-1 h-4 w-4 shrink-0 border-[color:var(--tomo-rule)] text-[color:var(--tomo-teal)] focus:ring-[color:var(--tomo-teal)]"
            />
            <span>
              <span className="block text-sm font-medium text-[color:var(--foreground)]">{opt.label}</span>
              <span className="block text-xs text-[color:var(--tomo-body)]">{opt.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </TomoCard>
  );
}
