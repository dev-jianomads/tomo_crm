/**
 * §3.3a investor-relationship classifier (mock): rules + golden fixtures + LLM fallback.
 * Prompt vocabulary: `tomo_mvp_lp_relationship_detection_brief.md`.
 */

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { CrmMatchConfidence } from "@/lib/contact-resolution-match";
import {
  buildPrefillFromSender,
  type ContactSuggestion,
  type ContactSuggestionPrefill,
  type InvestorRelationshipClassification,
} from "@/lib/contact-suggestions";
import { extractEmailDomain, normalizeEmail, parseSenderFromHeader } from "@/lib/relationship-email";

export type ClassifySkipReason =
  | "ooo"
  | "noreply"
  | "blocklist"
  | "existing_relationship"
  | "no_sender_email";

export type ClassifyInboundInput = {
  from: string;
  subject: string;
  body: string;
  isOoo?: boolean;
  crmMatchConfidence?: CrmMatchConfidence;
  existingContactName?: string;
};

export type ClassifyInboundSuggestionPayload = Omit<ContactSuggestion, "id" | "createdAt" | "status">;

export type ClassifyInboundResult =
  | {
      outcome: "skipped";
      skipReason: ClassifySkipReason;
      classification?: InvestorRelationshipClassification;
      reason: string;
      usedLlm: false;
      usedFixture: false;
    }
  | {
      outcome: "no_suggestion";
      classification: InvestorRelationshipClassification;
      confidence: number;
      reason: string;
      evidence: string[];
      prefill?: ContactSuggestionPrefill;
      usedLlm: boolean;
      usedFixture: boolean;
    }
  | {
      outcome: "suggestion";
      classification: "likely_investor_relationship" | "maybe_investor_relationship";
      confidence: number;
      reason: string;
      evidence: string[];
      suggestion: ClassifyInboundSuggestionPayload;
      usedLlm: boolean;
      usedFixture: boolean;
    };

const classifierLlmSchema = z.object({
  classification: z.enum([
    "likely_investor_relationship",
    "maybe_investor_relationship",
    "not_investor_related",
    "existing_relationship",
    "vendor_or_service_provider",
    "internal_or_irrelevant",
  ]),
  confidence: z.number().min(0).max(100),
  person_name: z.string(),
  email: z.string(),
  firm_name: z.string(),
  domain: z.string(),
  relationship_type: z.string().optional(),
  suggested_action: z.enum(["suggest_new_relationship", "suggest_review", "none"]),
  reason: z.string(),
  evidence: z.array(z.string()).min(1).max(6),
});

type GoldenFixture = {
  classification: InvestorRelationshipClassification;
  confidence: number;
  reason: string;
  evidence: string[];
  prefill: ContactSuggestionPrefill;
  sourceSubject?: string;
  sourceBodyPreview?: string;
};

/** Golden emails from `tomo_mvp_lp_relationship_detection_brief.md` Appendix B. */
const GOLDEN_FIXTURES_BY_EMAIL: Record<string, GoldenFixture> = {
  "sarah.lee@northbridgefo.com": {
    classification: "likely_investor_relationship",
    confidence: 87,
    reason:
      "Sender appears to represent a family office and requested the fund deck and performance materials.",
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
  "daniel.kim@oakridgepartners.com": {
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
  "priya.shah@meridianadvisors.com": {
    classification: "likely_investor_relationship",
    confidence: 84,
    reason:
      "Investment consultant requesting strategy overview, AUM, and returns for institutional clients.",
    evidence: [
      "Identifies as investment consultant",
      "Requests strategy overview and AUM",
      "Mentions institutional client allocations",
    ],
    prefill: buildPrefillFromSender({
      person_name: "Priya Shah",
      email: "priya.shah@meridianadvisors.com",
      firm_name: "Meridian Advisors",
      relationship_type: "Investment consultant",
    }),
    sourceSubject: "Strategy overview for institutional clients",
    sourceBodyPreview: "Could you share your strategy overview, AUM, and net returns for our institutional clients?",
  },
  "mark.evans@ledgerfundadmin.com": {
    classification: "vendor_or_service_provider",
    confidence: 91,
    reason: "Sender is pitching fund administration software — vendor outreach, not an allocator.",
    evidence: ["Offers software demo", "Fund administration product pitch", "No allocation or diligence intent"],
    prefill: buildPrefillFromSender({
      person_name: "Mark Evans",
      email: "mark.evans@ledgerfundadmin.com",
      firm_name: "Ledger Fund Admin",
      relationship_type: "Vendor",
    }),
    sourceSubject: "Fund admin platform demo",
    sourceBodyPreview: "We'd love to show you our fund administration software — are you free for a 30-minute demo?",
  },
  "events@marketing.webinar.io": {
    classification: "internal_or_irrelevant",
    confidence: 88,
    reason: "Marketing webinar invite — not a fundraising or investor relationship.",
    evidence: ["Webinar registration invite", "Events team sender", "No LP or allocation context"],
    prefill: buildPrefillFromSender({
      person_name: "Events Team",
      email: "events@marketing.webinar.io",
      firm_name: "Industry Webinars",
      relationship_type: "Newsletter",
    }),
    sourceSubject: "You're invited: Allocator trends webinar",
    sourceBodyPreview: "Register for our free webinar on allocator trends this Thursday.",
  },
};

const BLOCKLIST_DOMAINS = new Set([
  "mailchimp.com",
  "sendgrid.net",
  "hubspotemail.net",
  "marketing.webinar.io",
]);

const POSITIVE_KEYWORDS = [
  "allocator",
  "allocation",
  "family office",
  "fund of funds",
  "endowment",
  "pension",
  "sovereign",
  "investment consultant",
  "fund deck",
  "ddq",
  "due diligence",
  "data room",
  "commitment",
  "intro call",
  "warm intro",
  "roadshow",
  "lp ",
];

const NEGATIVE_KEYWORDS = [
  "software demo",
  "fund admin",
  "newsletter",
  "webinar",
  "recruitment",
  "invoice",
  "audit services",
  "tax preparation",
];

const SYSTEM_PROMPT = `You are Tomo, classifying inbound email for a hedge fund GP's fundraising CRM.

Review mail from a sender who is NOT yet matched to a contact. Suggest a new relationship only with clear fundraising, investor, diligence, or allocation evidence.

Classifications:
- likely_investor_relationship — strong LP / allocator / consultant intent
- maybe_investor_relationship — possible investor, thinner evidence
- not_investor_related — unrelated to fundraising
- existing_relationship — only when CRM context shows they are already in the book
- vendor_or_service_provider — vendors pitching services/software
- internal_or_irrelevant — newsletters, webinars, internal noise

Precision over recall: prefer not_investor_related or vendor over a weak maybe when evidence is thin.
Negative keywords (demo, newsletter, etc.) soften confidence but do NOT auto-reject — real LPs mention DDQ, tax, or legal.

Return JSON only with all required fields. suggested_action:
- suggest_new_relationship for likely
- suggest_review for maybe
- none otherwise`;

function detectOoo(subject: string, body: string): boolean {
  const text = `${subject}\n${body}`.toLowerCase();
  return (
    /\bout of office\b/.test(text) ||
    /\bautomatic reply\b/.test(text) ||
    /\bauto[- ]?reply\b/.test(text) ||
    /\baway from (the )?office\b/.test(text)
  );
}

function isNoreplyAddress(email: string): boolean {
  const local = email.split("@")[0] ?? "";
  return /^(no[-_]?reply|donotreply|noreply|mailer-daemon)$/i.test(local);
}

function rulesClassify(subject: string, body: string): z.infer<typeof classifierLlmSchema> {
  const text = `${subject}\n${body}`.toLowerCase();
  let score = 35;
  const evidence: string[] = [];

  for (const kw of POSITIVE_KEYWORDS) {
    if (text.includes(kw)) {
      score += 8;
      evidence.push(`Mentions “${kw.trim()}”`);
    }
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (text.includes(kw)) {
      score -= 12;
      evidence.push(`Vendor/noise signal: “${kw}”`);
    }
  }

  if (/\b(demo|free trial|schedule a call to see our platform)\b/.test(text)) {
    score -= 25;
    evidence.push("Software or vendor demo language");
  }

  score = Math.max(0, Math.min(100, score));

  let classification: z.infer<typeof classifierLlmSchema>["classification"];
  let suggested_action: z.infer<typeof classifierLlmSchema>["suggested_action"];

  if (score >= 72) {
    classification = "likely_investor_relationship";
    suggested_action = "suggest_new_relationship";
  } else if (score >= 48) {
    classification = "maybe_investor_relationship";
    suggested_action = "suggest_review";
  } else if (/\b(newsletter|webinar|unsubscribe)\b/.test(text)) {
    classification = "internal_or_irrelevant";
    suggested_action = "none";
  } else if (score < 30 && /\b(software|platform demo|fund admin)\b/.test(text)) {
    classification = "vendor_or_service_provider";
    suggested_action = "none";
  } else {
    classification = "not_investor_related";
    suggested_action = "none";
  }

  return {
    classification,
    confidence: score,
    person_name: "",
    email: "",
    firm_name: "",
    domain: "",
    suggested_action,
    reason:
      classification === "likely_investor_relationship"
        ? "Rules detected strong fundraising or investor keywords in the message."
        : classification === "maybe_investor_relationship"
          ? "Rules detected possible investor context with limited detail."
          : "Rules did not find sufficient investor or fundraising evidence.",
    evidence: evidence.length ? evidence.slice(0, 4) : ["No strong keyword signals"],
  };
}

function isSuggestibleClassification(
  c: InvestorRelationshipClassification
): c is "likely_investor_relationship" | "maybe_investor_relationship" {
  return c === "likely_investor_relationship" || c === "maybe_investor_relationship";
}

function buildSuggestionPayload(
  input: ClassifyInboundInput,
  parsed: { name: string; email: string },
  llm: z.infer<typeof classifierLlmSchema>,
  options: { usedLlm: boolean; usedFixture: boolean; fixture?: GoldenFixture }
): ClassifyInboundResult {
  const email = normalizeEmail(llm.email || parsed.email);
  const domain = llm.domain || extractEmailDomain(email);
  const personName = llm.person_name.trim() || parsed.name || "Unknown";
  const firmName = llm.firm_name.trim() || domain.split(".")[0] || "Unknown firm";

  const prefill =
    options.fixture?.prefill ??
    buildPrefillFromSender({
      person_name: personName,
      email,
      firm_name: firmName,
      relationship_type: llm.relationship_type,
    });

  const classification = llm.classification;
  const confidence = Math.round(llm.confidence);
  const reason = llm.reason.trim();
  const evidence = llm.evidence.map((e) => e.trim()).filter(Boolean);

  if (!isSuggestibleClassification(classification) || llm.suggested_action === "none") {
    return {
      outcome: "no_suggestion",
      classification,
      confidence,
      reason,
      evidence,
      prefill,
      usedLlm: options.usedLlm,
      usedFixture: options.usedFixture,
    };
  }

  return {
    outcome: "suggestion",
    classification,
    confidence,
    reason,
    evidence,
    suggestion: {
      senderEmail: email,
      senderDomain: domain,
      classification,
      confidence,
      reason,
      evidence,
      prefill,
      sourceSubject: input.subject.trim() || options.fixture?.sourceSubject,
      sourceBodyPreview:
        input.body.trim().slice(0, 280) || options.fixture?.sourceBodyPreview,
    },
    usedLlm: options.usedLlm,
    usedFixture: options.usedFixture,
  };
}

function buildUserPrompt(
  input: ClassifyInboundInput,
  parsed: { name: string; email: string },
  domain: string
): string {
  const crm =
    input.crmMatchConfidence && input.crmMatchConfidence !== "no_match"
      ? `crm_match_status: ${input.crmMatchConfidence}${
          input.existingContactName ? `\nexisting_contact_name: ${input.existingContactName}` : ""
        }`
      : "crm_match_status: no_match";

  return [
    crm,
    `from: ${input.from}`,
    `parsed_sender_name: ${parsed.name}`,
    `parsed_sender_email: ${parsed.email}`,
    `sender_domain: ${domain}`,
    `subject: ${input.subject}`,
    "body:",
    input.body.slice(0, 4000),
    "",
    "Return JSON only. Fill person_name, email, firm_name, domain from the From header when not explicit in body.",
  ].join("\n");
}

export function lookupGoldenClassifierFixture(email: string): GoldenFixture | null {
  return GOLDEN_FIXTURES_BY_EMAIL[normalizeEmail(email)] ?? null;
}

/** Exported for tests and API — runs pre-filter, fixtures, rules, then optional LLM. */
export async function classifyInboundEmail(input: ClassifyInboundInput): Promise<ClassifyInboundResult> {
  const parsed = parseSenderFromHeader(input.from);
  const email = normalizeEmail(parsed.email);

  if (!email.includes("@")) {
    return {
      outcome: "skipped",
      skipReason: "no_sender_email",
      reason: "Could not parse a sender email from the From header.",
      usedLlm: false,
      usedFixture: false,
    };
  }

  const domain = extractEmailDomain(email);

  if (input.isOoo || detectOoo(input.subject, input.body)) {
    return {
      outcome: "skipped",
      skipReason: "ooo",
      reason: "Out-of-office or auto-reply — classification skipped.",
      usedLlm: false,
      usedFixture: false,
    };
  }

  if (isNoreplyAddress(email)) {
    return {
      outcome: "skipped",
      skipReason: "noreply",
      reason: "Noreply sender address — classification skipped.",
      usedLlm: false,
      usedFixture: false,
    };
  }

  if (BLOCKLIST_DOMAINS.has(domain)) {
    return {
      outcome: "skipped",
      skipReason: "blocklist",
      classification: "internal_or_irrelevant",
      reason: `Sender domain ${domain} is on the workspace blocklist.`,
      usedLlm: false,
      usedFixture: false,
    };
  }

  if (input.crmMatchConfidence === "exact_email") {
    return {
      outcome: "skipped",
      skipReason: "existing_relationship",
      classification: "existing_relationship",
      reason: input.existingContactName
        ? `${input.existingContactName} already matches this email in the CRM.`
        : "Sender already matches an existing contact email.",
      usedLlm: false,
      usedFixture: false,
    };
  }

  const golden = lookupGoldenClassifierFixture(email);
  if (golden) {
    const llmShape: z.infer<typeof classifierLlmSchema> = {
      classification: golden.classification,
      confidence: golden.confidence,
      person_name: golden.prefill.person_name,
      email: golden.prefill.email,
      firm_name: golden.prefill.firm_name,
      domain: golden.prefill.domain,
      relationship_type: golden.prefill.relationship_type,
      suggested_action: isSuggestibleClassification(golden.classification)
        ? golden.classification === "likely_investor_relationship"
          ? "suggest_new_relationship"
          : "suggest_review"
        : "none",
      reason: golden.reason,
      evidence: golden.evidence,
    };
    return buildSuggestionPayload(input, parsed, llmShape, {
      usedLlm: false,
      usedFixture: true,
      fixture: golden,
    });
  }

  const rulesFallback = () => {
    const rules = rulesClassify(input.subject, input.body);
    const merged: z.infer<typeof classifierLlmSchema> = {
      ...rules,
      person_name: rules.person_name || parsed.name,
      email: rules.email || email,
      firm_name: rules.firm_name || parsed.name || domain,
      domain: rules.domain || domain,
    };
    return buildSuggestionPayload(input, parsed, merged, { usedLlm: false, usedFixture: false });
  };

  if (!process.env.OPENAI_API_KEY) {
    return rulesFallback();
  }

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: classifierLlmSchema,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(input, parsed, domain),
    });

    const merged: z.infer<typeof classifierLlmSchema> = {
      ...object,
      person_name: object.person_name.trim() || parsed.name,
      email: normalizeEmail(object.email || email),
      firm_name: object.firm_name.trim() || domain,
      domain: object.domain.trim() || extractEmailDomain(object.email || email),
    };

    return buildSuggestionPayload(input, parsed, merged, { usedLlm: true, usedFixture: false });
  } catch {
    return rulesFallback();
  }
}
