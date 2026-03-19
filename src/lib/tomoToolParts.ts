import type { UIMessage } from "ai";

/** Extract tool invocation parts from a message (works with both typed and dynamic tools) */
export function getToolParts(message: UIMessage) {
  const parts: { toolName: string; state: string; input?: unknown; output?: unknown }[] = [];
  for (const part of message.parts ?? []) {
    if ("state" in part && typeof (part as Record<string, unknown>).state === "string") {
      const p = part as Record<string, unknown>;
      if (typeof p.type === "string" && p.type.startsWith("tool-")) {
        const toolName = (p as { toolName?: string }).toolName ?? (p.type as string).replace(/^tool-/, "");
        parts.push({ toolName, state: p.state as string, input: p.input, output: p.output });
      } else if (p.type === "dynamic-tool" && typeof p.toolName === "string") {
        parts.push({ toolName: p.toolName as string, state: p.state as string, input: p.input, output: p.output });
      }
    }
  }
  return parts;
}
