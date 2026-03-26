const WEEKDAY_SHORT_TO_LONG: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

/** Today “Coming up” — day + time + TZ (e.g. “Today · 2:00 PM ET”). */
export function commitmentDayTime(datetime: string): string {
  const t = datetime.trim();
  if (/^Today\s+/i.test(t)) return `Today · ${t.replace(/^Today\s+/i, "")}`;
  if (/^Tomorrow\s+/i.test(t)) return `Tomorrow · ${t.replace(/^Tomorrow\s+/i, "")}`;
  const m = t.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(.+)/);
  if (m) {
    const long = WEEKDAY_SHORT_TO_LONG[m[1]!] ?? m[1];
    return `${long} · ${m[2]!.trim()}`;
  }
  return t;
}
