import type { Relationship } from "@/lib/mockData";
import {
  extractEmailDomain,
  normalizeEmail,
  parseSenderFromHeader,
} from "@/lib/relationship-email";

export type CrmMatchConfidence = "exact_email" | "name_plus_firm" | "domain_only" | "no_match";

export type CrmMatchResult = {
  confidence: CrmMatchConfidence;
  /** Strong contact match — do not suggest new relationship */
  existingContact?: Relationship;
  /** Fuzzy match — offer link only */
  suggestedContact?: Relationship;
  /** Known firm, new person at domain */
  organizationFirmMatch?: Relationship;
  matchedDomain?: string;
};

function normalizeFirm(firm: string): string {
  return firm
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function firmMatchesDomain(firm: string, domain: string): boolean {
  const f = normalizeFirm(firm).replace(/\s+/g, "");
  const d = domain.replace(/^www\./, "").split(".")[0] ?? "";
  if (!f || !d) return false;
  return f.includes(d) || d.includes(f.slice(0, Math.min(f.length, 12)));
}

function nameMatches(a: string, b: string): boolean {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return true;
  const pa = na.split(/\s+/).filter(Boolean);
  const pb = nb.split(/\s+/).filter(Boolean);
  if (pa.length >= 2 && pb.length >= 2) {
    return pa[0] === pb[0] && pa[pa.length - 1] === pb[pb.length - 1];
  }
  return false;
}

/**
 * Client-side CRM match ladder (§3.3a) against in-memory relationships.
 */
export function matchSenderAgainstRelationships(
  senderEmailOrFrom: string,
  relationships: Relationship[],
  options?: { senderName?: string; firmHint?: string }
): CrmMatchResult {
  const parsed = senderEmailOrFrom.includes("@")
    ? { name: options?.senderName ?? "", email: normalizeEmail(senderEmailOrFrom) }
    : parseSenderFromHeader(senderEmailOrFrom);
  const email = parsed.email;
  const senderName = options?.senderName?.trim() || parsed.name;
  const domain = extractEmailDomain(email);

  if (!email && !domain) {
    return { confidence: "no_match" };
  }

  if (email) {
    const exact = relationships.find((r) => r.primaryEmail && normalizeEmail(r.primaryEmail) === email);
    if (exact) {
      return { confidence: "exact_email", existingContact: exact };
    }
  }

  if (senderName && options?.firmHint) {
    const fuzzy = relationships.find(
      (r) => nameMatches(r.name, senderName) && normalizeFirm(r.firm) === normalizeFirm(options.firmHint!)
    );
    if (fuzzy) {
      return { confidence: "name_plus_firm", suggestedContact: fuzzy };
    }
  }

  if (senderName) {
    const nameHits = relationships.filter((r) => nameMatches(r.name, senderName));
    if (nameHits.length === 1) {
      return { confidence: "name_plus_firm", suggestedContact: nameHits[0] };
    }
  }

  if (domain) {
    const domainHits = relationships.filter(
      (r) =>
        (r.primaryEmail && extractEmailDomain(r.primaryEmail) === domain) ||
        firmMatchesDomain(r.firm, domain)
    );
    if (domainHits.length === 1) {
      return {
        confidence: "domain_only",
        organizationFirmMatch: domainHits[0],
        matchedDomain: domain,
      };
    }
    if (domainHits.length > 1) {
      return {
        confidence: "domain_only",
        organizationFirmMatch: domainHits[0],
        matchedDomain: domain,
      };
    }
  }

  return { confidence: "no_match" };
}

export function shouldSkipNewRelationshipSuggestion(match: CrmMatchResult): boolean {
  return match.confidence === "exact_email" && !!match.existingContact;
}
