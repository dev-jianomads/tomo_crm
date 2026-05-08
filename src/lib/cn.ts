/** Join class names; falsy entries omitted (minimal helper — no tailwind-merge dependency). */
export function cn(...parts: Array<string | undefined | null | false>): string {
  return parts.filter(Boolean).join(" ");
}
