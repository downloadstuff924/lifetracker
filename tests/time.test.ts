import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toMinutes,
  toTime,
  duration,
  formatDuration,
  freeGaps,
  validateBlock,
  shiftDate,
} from "../src/utils/time";
const settings = { startTime: "07:00", endTime: "22:00" };
test("clock conversions and duration formatting", () => {
  assert.equal(toMinutes("09:30"), 570);
  assert.equal(toTime(570), "09:30");
  assert.equal(duration("09:00", "10:30"), 90);
  assert.equal(formatDuration(90), "1h 30m");
  assert.equal(formatDuration(60), "1h");
  assert.equal(formatDuration(15), "15 min");
});
test("free time covers all gaps without mutating saved blocks", () => {
  const blocks = [
    { id: "b", title: "Call", startTime: "09:30", endTime: "10:00" },
    { id: "a", title: "Morning", startTime: "07:00", endTime: "08:00" },
  ];
  assert.deepEqual(freeGaps(blocks, settings), [
    { startTime: "08:00", endTime: "09:30" },
    { startTime: "10:00", endTime: "22:00" },
  ]);
  assert.equal(blocks[0].id, "b");
});
test("empty day and fully occupied day", () => {
  assert.deepEqual(freeGaps([], settings), [settings]);
  assert.deepEqual(
    freeGaps([{ title: "Full day", ...settings }], settings),
    [],
  );
});
test("overlap detection allows touching boundaries and ignores the edited block", () => {
  const meeting = {
    id: "m",
    title: "Meeting",
    startTime: "10:30",
    endTime: "12:00",
  };
  assert.match(
    validateBlock(
      { title: "Work", startTime: "09:00", endTime: "11:00" },
      [meeting],
      settings,
    )!,
    /overlaps with Meeting/,
  );
  assert.equal(
    validateBlock(
      { title: "Work", startTime: "09:00", endTime: "10:30" },
      [meeting],
      settings,
    ),
    null,
  );
  assert.equal(validateBlock(meeting, [meeting], settings), null);
});
test("invalid ranges and out of hours are rejected", () => {
  assert.match(
    validateBlock(
      { title: "Backwards", startTime: "10:00", endTime: "09:00" },
      [],
      settings,
    )!,
    /later/,
  );
  assert.match(
    validateBlock(
      { title: "Early", startTime: "06:00", endTime: "08:00" },
      [],
      settings,
    )!,
    /between/,
  );
  assert.match(
    validateBlock(
      { title: "", startTime: "08:00", endTime: "09:00" },
      [],
      settings,
    )!,
    /title/,
  );
});
test("free gaps tolerate legacy overlaps and blocks outside current day settings", () => {
  assert.deepEqual(
    freeGaps(
      [
        { title: "Early", startTime: "05:00", endTime: "08:00" },
        { title: "Overlap", startTime: "07:30", endTime: "09:00" },
        { title: "Late", startTime: "21:00", endTime: "23:00" },
      ],
      settings,
    ),
    [{ startTime: "09:00", endTime: "21:00" }],
  );
});
test("date navigation crosses months and years", () => {
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDate("2024-03-01", -1), "2024-02-29");
});
