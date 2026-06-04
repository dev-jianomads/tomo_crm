/** Normalize and derive emails for LP matching (mock + RelationshipDraft). */

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function extractEmailDomain(email: string): string {
  const n = normalizeEmail(email);
  const at = n.lastIndexOf("@");
  if (at < 1) return "";
  return n.slice(at + 1);
}

/** Deterministic demo email from name + firm (for generated mock LPs). */
export function deriveMockPrimaryEmail(name: string, firm: string): string {
  const slug =
    firm
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24) || "firm";
  const parts = name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.replace(/[^a-z]/g, ""))
    .filter(Boolean);
  const local = parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0] || "contact";
  return `${local}@${slug}.com`;
}

export function parseSenderFromHeader(from: string): { name: string; email: string } {
  const trimmed = from.trim();
  const angle = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (angle) {
    return { name: angle[1]!.replace(/^["']|["']$/g, "").trim(), email: normalizeEmail(angle[2]!) };
  }
  if (trimmed.includes("@")) {
    return { name: trimmed.split("@")[0] ?? "", email: normalizeEmail(trimmed) };
  }
  return { name: trimmed, email: "" };
}
