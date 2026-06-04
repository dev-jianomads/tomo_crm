import { extractEmailDomain, normalizeEmail } from "@/lib/relationship-email";

export const CONTACT_SUGGESTIONS_STORAGE_KEY = "tomo-contact-suggestions-v1";
export const CONTACT_SUGGESTION_SUPPRESSIONS_KEY = "tomo-contact-suggestion-suppressions-v1";

export type InvestorRelationshipClassification =
  | "likely_investor_relationship"
  | "maybe_investor_relationship"
  | "not_investor_related"
  | "existing_relationship"
  | "vendor_or_service_provider"
  | "internal_or_irrelevant";

export type ContactSuggestionStatus = "pending" | "surfaced" | "confirmed" | "dismissed";

export type ContactSuggestionDismissReason = "ignored" | "not_investor" | "system_vendor" | "system_internal";

export type ContactSuggestionPrefill = {
  person_name: string;
  email: string;
  firm_name: string;
  domain: string;
  relationship_type?: string;
  investor_type_hint?: string;
  source_hint?: "inbound_email" | "manual";
  suggested_next_move?: string;
};

export type ContactSuggestion = {
  id: string;
  createdAt: string;
  senderEmail: string;
  senderDomain: string;
  classification: InvestorRelationshipClassification;
  confidence: number;
  reason: string;
  evidence: string[];
  prefill: ContactSuggestionPrefill;
  status: ContactSuggestionStatus;
  dismissReason?: ContactSuggestionDismissReason;
  suppressSenderUntil?: string;
  resolvedLpContactId?: string;
  resolvedAt?: string;
  /** Mock: stored inbound excerpt for Phase 2+ drawer */
  sourceSubject?: string;
  sourceBodyPreview?: string;
};

export type SenderSuppression = {
  email: string;
  until: string;
  reason: ContactSuggestionDismissReason;
};

export function createContactSuggestionId(): string {
  return `cs-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildPrefillFromSender(input: {
  person_name: string;
  email: string;
  firm_name: string;
  relationship_type?: string;
}): ContactSuggestionPrefill {
  const email = normalizeEmail(input.email);
  return {
    person_name: input.person_name.trim(),
    email,
    firm_name: input.firm_name.trim(),
    domain: extractEmailDomain(email),
    relationship_type: input.relationship_type,
    source_hint: "inbound_email",
  };
}

/** Golden fixtures from `tomo_mvp_lp_relationship_detection_brief.md` for demo without LLM. */
export const DEMO_CONTACT_SUGGESTION_FIXTURES: Omit<ContactSuggestion, "id" | "createdAt" | "status">[] = [
  {
    senderEmail: "sarah.lee@northbridgefo.com",
    senderDomain: "northbridgefo.com",
    classification: "likely_investor_relationship",
    confidence: 87,
    reason: "Sender appears to represent a family office and requested the fund deck and performance materials.",
    evidence: [
      "Email signature says Investment Director",
      "Firm name includes Family Office",
      "Email asks for fund deck and performance",
    ],
    prefill: buildPrefillFromSender({
      person_name: "Sarah Lee",
      email: "sarah.lee@northbridgefo.com",
      firm_name: "Northbridge Family Office",
      relationship_type: "Family Office",
    }),
    sourceSubject: "Intro and fund materials",
    sourceBodyPreview: "Could you please send through your fund deck, latest monthly performance, and DDQ?",
  },
  {
    senderEmail: "daniel.kim@oakridgepartners.com",
    senderDomain: "oakridgepartners.com",
    classification: "maybe_investor_relationship",
    confidence: 62,
    reason: "Possible investor context from conference follow-up; limited firm detail in the message.",
    evidence: ["Met at iConnections", "Asked to learn more about strategy"],
    prefill: buildPrefillFromSender({
      person_name: "Daniel Kim",
      email: "daniel.kim@oakridgepartners.com",
      firm_name: "Oakridge Partners",
      relationship_type: "Institutional investor",
    }),
    sourceSubject: "Follow up from conference",
  },
];

export function fixtureToContactSuggestion(
  fixture: (typeof DEMO_CONTACT_SUGGESTION_FIXTURES)[number],
  status: ContactSuggestionStatus = "pending"
): ContactSuggestion {
  return {
    ...fixture,
    id: createContactSuggestionId(),
    createdAt: new Date().toISOString(),
    status,
  };
}

export function isSenderSuppressed(email: string, suppressions: SenderSuppression[]): boolean {
  const n = normalizeEmail(email);
  const now = Date.now();
  return suppressions.some((s) => normalizeEmail(s.email) === n && new Date(s.until).getTime() > now);
}

export function suppressionDaysFromDismiss(reason: ContactSuggestionDismissReason): number | null {
  if (reason === "not_investor") return 30;
  return null;
}

export type AddSuggestionRejectReason = "sender_suppressed" | "invalid_sender_email";

export type AddSuggestionResult =
  | { ok: true; suggestion: ContactSuggestion }
  | { ok: false; reason: AddSuggestionRejectReason };
