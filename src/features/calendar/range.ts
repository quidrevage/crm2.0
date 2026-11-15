import { monthGrid, shiftKey, weekStart } from "@/lib/dates";

export type CalendarMode = "month" | "week" | "agenda";

/** The day range the server must load for a view anchored at `anchor`. */
export function calendarRange(view: CalendarMode, anchor: string): [string, string] {
  if (view === "week") {
    const start = weekStart(anchor);
    return [start, shiftKey(start, 6)];
  }
  if (view === "agenda") return [anchor, shiftKey(anchor, 29)];
  const grid = monthGrid(anchor);
  return [grid[0], grid[grid.length - 1]];
}
