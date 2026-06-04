import type { CrmMatchConfidence } from "@/lib/contact-resolution-match";
import type { ClassifyInboundResult } from "@/lib/contact-suggestion-classifier";

/** Mirrors POST /api/contact-suggestions/classify — only `from` is required. */
export type ClassifyInboundRequest = {
  from: string;
  subject?: string;
  body?: string;
  isOoo?: boolean;
  crmMatchConfidence?: CrmMatchConfidence;
  existingContactName?: string;
};

export async function classifyInboundContactEmail(
  payload: ClassifyInboundRequest
): Promise<ClassifyInboundResult> {
  const res = await fetch("/api/contact-suggestions/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Classification failed (${res.status})`);
  }

  return res.json() as Promise<ClassifyInboundResult>;
}
