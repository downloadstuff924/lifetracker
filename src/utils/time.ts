import type { DaySettings } from "@/types/models";
export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export const toTime = (minutes: number) =>
  `${Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
export const duration = (start: string, end: string) =>
  toMinutes(end) - toMinutes(start);
export const formatDuration = (minutes: number) =>
  minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const shiftDate = (date: string, step: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + step);
  return localDate(d);
};
type Timed = { id?: string; title: string; startTime: string; endTime: string };
export function validateBlock(
  block: Timed,
  others: Timed[],
  settings: DaySettings,
) {
  if (!block.title.trim()) return "Give this block a title.";
  if (
    ![block.startTime, block.endTime].every((t) =>
      /^([01]\d|2[0-3]):[0-5]\d$/.test(t),
    )
  )
    return "Enter valid start and end times.";
  if (duration(block.startTime, block.endTime) <= 0)
    return "End time must be later than start time.";
  if (block.startTime < settings.startTime || block.endTime > settings.endTime)
    return `Keep this block between ${settings.startTime} and ${settings.endTime}.`;
  const overlap = others.find(
    (b) =>
      (!block.id || b.id !== block.id) &&
      block.startTime < b.endTime &&
      block.endTime > b.startTime,
  );
  return overlap
    ? `This block overlaps with ${overlap.title} (${overlap.startTime}–${overlap.endTime}).`
    : null;
}
export function freeGaps(blocks: Timed[], settings: DaySettings) {
  let cursor = toMinutes(settings.startTime);
  const end = toMinutes(settings.endTime);
  const gaps: { startTime: string; endTime: string }[] = [];
  for (const block of [...blocks].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  )) {
    const start = Math.min(end, Math.max(cursor, toMinutes(block.startTime)));
    if (start > cursor)
      gaps.push({ startTime: toTime(cursor), endTime: toTime(start) });
    cursor = Math.min(end, Math.max(cursor, toMinutes(block.endTime)));
  }
  if (cursor < end)
    gaps.push({ startTime: toTime(cursor), endTime: toTime(end) });
  return gaps;
}
