/**
 * Mock contact CSV/Excel import: header preview, auto column matching, and row estimate.
 * Replace with server-side parse + ML mapping when POST /api/onboarding/upload-contacts exists.
 */

export const CONTACT_IMPORT_ACCEPT = ".csv,.xls,.xlsx,text/csv";

export type ContactImportFieldId =
  | "name"
  | "email"
  | "company"
  | "title"
  | "phone"
  | "ignore";

export const CONTACT_IMPORT_FIELD_OPTIONS: { id: ContactImportFieldId; label: string }[] = [
  { id: "name", label: "Full name" },
  { id: "email", label: "Email" },
  { id: "company", label: "Company / organization" },
  { id: "title", label: "Title / role" },
  { id: "phone", label: "Phone" },
  { id: "ignore", label: "Don't import" },
];

/** Single-column fuzzy match (mock). */
export function autoMatchColumn(header: string): ContactImportFieldId {
  const h = header.toLowerCase().replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim();

  if (/\b(e-?mail|email|mail)\b/.test(h) || h === "mail") return "email";
  if (/\b(phone|mobile|cell|tel|telephone)\b/.test(h)) return "phone";
  if (/\b(company|organization|organisation|employer|firm|account)\b/.test(h)) return "company";
  if (/\b(title|role|position|job|job title)\b/.test(h)) return "title";
  if (
    /\b(name|contact|full name|contact name)\b/.test(h) ||
    (h.includes("first") && h.includes("last")) ||
    /^name$/i.test(header.trim())
  ) {
    return "name";
  }
  return "ignore";
}

/**
 * Assign each header a target field; first column wins when multiple map to the same field.
 */
export function buildInitialColumnMapping(headers: string[]): ContactImportFieldId[] {
  const used = new Set<ContactImportFieldId>();
  const result: ContactImportFieldId[] = [];
  for (const h of headers) {
    let m = autoMatchColumn(h);
    if (m !== "ignore" && used.has(m)) m = "ignore";
    if (m !== "ignore") used.add(m);
    result.push(m);
  }
  return result;
}

/** Minimal CSV line split (handles quoted fields with commas). */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && c === ",") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    if (!inQ && (c === "\n" || c === "\r")) break;
    cur += c;
  }
  out.push(cur.trim());
  return out.length === 1 && out[0] === "" ? [] : out;
}

export type ContactImportPreview = {
  headers: string[];
  /** First data row after header, if readable (CSV). */
  sampleRow: string[] | null;
  rowCountEstimate: number;
};

/**
 * Reads the first lines of a CSV for headers + sample row; Excel types get plausible mock headers.
 */
export async function readContactImportPreview(file: File): Promise<ContactImportPreview> {
  const name = file.name.toLowerCase();
  const estimatedBySize = Math.max(12, Math.min(5000, Math.round(file.size / 48)));

  if (name.endsWith(".csv") || file.type === "text/csv") {
    const maxBytes = Math.min(file.size, 96 * 1024);
    const text = await file.slice(0, maxBytes).text();
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    const headerLine = lines[0] ?? "";
    const headers = parseCsvLine(headerLine).filter(Boolean);
    if (headers.length === 0) {
      return {
        headers: ["Column A", "Column B"],
        sampleRow: null,
        rowCountEstimate: estimatedBySize,
      };
    }
    const dataLine = lines[1];
    const sampleRow = dataLine ? parseCsvLine(dataLine) : null;
    const rowCountEstimate = Math.max(0, lines.length - 1);
    return { headers, sampleRow: sampleRow && sampleRow.length ? sampleRow : null, rowCountEstimate };
  }

  // XLS/XLSX: mock plausible LP export headers (no client-side xlsx parse in demo)
  return {
    headers: ["Contact Name", "Work Email", "Organization", "Title", "Phone"],
    sampleRow: ["Alex Morgan", "alex@example.com", "Harbor LP", "Partner", "+1 415-555-0100"],
    rowCountEstimate: estimatedBySize,
  };
}

export function summarizeMapping(headers: string[], mapping: ContactImportFieldId[]): string {
  const parts: string[] = [];
  for (let i = 0; i < headers.length; i++) {
    const m = mapping[i];
    if (m === "ignore") continue;
    const label = CONTACT_IMPORT_FIELD_OPTIONS.find((o) => o.id === m)?.label ?? m;
    parts.push(`${headers[i]} → ${label}`);
  }
  return parts.length ? parts.join("; ") : "No columns mapped";
}
