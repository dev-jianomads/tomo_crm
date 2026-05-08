"use client";

import { AppearanceSettings } from "@/components/appearance-settings";
import { TomoCard } from "@/components/ui/card";
import { TomoField } from "@/components/ui/field";
import { TomoInput } from "@/components/ui/input";
import { TomoSectionHeading } from "@/components/ui/section-heading";
import { useRequireSession } from "@/lib/auth";

export default function SettingsProfilePage() {
  const { session } = useRequireSession();

  return (
    <div className="space-y-6">
      <TomoSectionHeading title="Profile" titleAs="h2" />
      <AppearanceSettings />
      <div className="grid gap-4 md:grid-cols-2">
        <TomoField label="Name" htmlFor="profile-name">
          <TomoInput id="profile-name" name="displayName" autoComplete="name" defaultValue="Jordan Doe" />
        </TomoField>
        <TomoField label="Email" htmlFor="profile-email">
          <TomoInput
            id="profile-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={session?.email ?? ""}
          />
        </TomoField>
      </div>
      <TomoCard className="tomo-hint-banner px-3 py-2">
        <p className="text-xs text-[color:var(--tomo-body)]">
          TOMO uses your profile to personalize briefs and messages.
        </p>
      </TomoCard>
    </div>
  );
}
