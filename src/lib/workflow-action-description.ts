/**
 * Short process-flow labels for workflow action steps (5–7 words).
 * Derived from the Optimised prompt **Objective** line when possible.
 */

const META_ACTION_LABEL = /lock\s+in|optimi[sz]ed\s+prompt|draft\s+step|cohort\s+outreach\s+emails|meta-instruction/i;

const OBJECTIVE_HEADING = /^\s*(?:[-*•]\s*)?\*{0,2}Objective\*{0,2}\s*:\s*(.*)$/i;
const NEXT_SECTION_LINE = /^\s*(?:[-*•]\s*)?\*{0,2}[A-Za-z][\w\s]*\*{0,2}\s*:/;

function extractObjectiveFromInstruction(instruction: string): string | null {
  const lines = instruction.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(OBJECTIVE_HEADING);
    if (!heading) continue;

    const parts: string[] = [];
    if (heading[1].trim()) parts.push(heading[1].trim());

    while (i + 1 < lines.length) {
      const next = lines[i + 1];
      if (!next.trim()) break;
      if (NEXT_SECTION_LINE.test(next) || /^\s*[-*•]\s/.test(next)) break;
      i++;
      parts.push(next.trim());
    }

    const line = parts.join(" ").replace(/\s+/g, " ").trim();
    return line || null;
  }
  return null;
}

/** Prefer an "inviting …" / "invite …" clause — often the clearest short label. */
function clauseAfterInvite(text: string): string | null {
  const m = text.match(/\b(inviting|invite)\b\s*(.+)$/i);
  if (!m?.[2]) return null;
  return m[2].trim().replace(/\.$/, "");
}

function stripLeadingVerbs(text: string): string {
  return text
    .replace(/^(write|draft|send|create|prepare)\s+(a\s+)?(personalized?|personalised?)\s+/i, "")
    .replace(/^(write|draft|send|create|prepare)\s+/i, "")
    .trim();
}

/** Cap at maxWords (default 7); aim for at least minWords when the source allows. */
export function shortenToProcessLabel(text: string, maxWords = 7, minWords = 5): string {
  const fromInvite = clauseAfterInvite(text);
  const base = (fromInvite ?? stripLeadingVerbs(text)).trim() || text.trim();
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Outreach email";
  if (words.length <= maxWords) {
    return words.join(" ");
  }
  const capped = words.slice(0, maxWords).join(" ");
  const cappedCount = capped.split(/\s+/).length;
  if (cappedCount >= minWords) return capped;
  return words.slice(0, Math.min(words.length, minWords)).join(" ");
}

export function isMetaActionDescription(value: string): boolean {
  return META_ACTION_LABEL.test(value.trim());
}

/**
 * Process-flow label for the ACTION node: Objective from the Optimised prompt, 5–7 words.
 */
export function deriveWorkflowActionDescription(params: {
  instruction: string;
  actionDescription?: string | null;
}): string {
  const instruction = params.instruction.trim();
  const fromTool = params.actionDescription?.trim() ?? "";
  const objective = instruction ? extractObjectiveFromInstruction(instruction) : null;

  let source = "";
  if (fromTool && !isMetaActionDescription(fromTool)) {
    source = fromTool;
  } else if (objective) {
    source = objective;
  } else if (fromTool) {
    source = fromTool;
  } else {
    const firstLine = instruction.split("\n").map((l) => l.trim()).find(Boolean);
    source = firstLine ?? "Outreach email";
  }

  return shortenToProcessLabel(source);
}
