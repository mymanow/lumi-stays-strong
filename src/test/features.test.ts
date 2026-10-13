import { describe, expect, it } from "vitest";
import { streakStats } from "@/lib/streaks";
import { dailyTipIndex, journeyIndexForDays, journeyProgress } from "@/lib/journey";
import { chartSeries, topTriggers, weekSummary, type CheckinRow } from "@/lib/insights";
import { MAX_FILE_BYTES, MAX_TOTAL_BYTES, mediaKindFor, mediaRefusal, pickRedFlags, type RedFlag } from "@/lib/keepsakes";

const NOW = new Date("2026-10-13T12:00:00").getTime();

describe("streakStats", () => {
  it("derives current, best, attempts and past streaks from events", () => {
    const s = streakStats(
      [
        { type: "relapse", occurred_at: "2026-09-01T10:00:00Z", previous_streak_seconds: 5 * 86400 },
        { type: "relapse", occurred_at: "2026-10-01T10:00:00Z", previous_streak_seconds: 20 * 86400 },
        { type: "resistance", occurred_at: "2026-10-05T10:00:00Z", previous_streak_seconds: null },
      ],
      "2026-10-03T12:00:00", 0, NOW,
    );
    expect(Math.round(s.currentSeconds / 86400)).toBe(10);
    expect(s.bestSeconds).toBe(20 * 86400);
    expect(s.attempts).toBe(3);
    expect(s.resistances).toBe(1);
    expect(s.past.map((p) => p.seconds / 86400)).toEqual([20, 5]);
  });
  it("never lowers the best below the profile's stored best", () => {
    expect(streakStats([], "2026-10-13T11:00:00", 99 * 86400, NOW).bestSeconds).toBe(99 * 86400);
  });
  it("handles a missing last contact", () => {
    expect(streakStats([], null, 0, NOW)).toMatchObject({ currentSeconds: 0, attempts: 1, past: [] });
  });
});

describe("journey", () => {
  it("maps days to the six phases", () => {
    expect([0, 3, 4, 14, 15, 30, 31, 60, 61, 90, 91, 400].map(journeyIndexForDays)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  it("cycles tips deterministically and reports progress", () => {
    expect(dailyTipIndex(7, 3)).toBe(1);
    expect(dailyTipIndex(3, 0)).toBe(0);
    expect(journeyProgress(0)).toBe(0);
    expect(journeyProgress(500)).toBe(1);
    expect(journeyProgress(9.5)).toBeCloseTo(0.5, 1);
  });
});

describe("insights", () => {
  const today = new Date("2026-10-13T12:00:00");
  const row = (date: string, mood: number, urge: number, triggers: string[] = []): CheckinRow => ({ date, mood, urge, triggers });
  it("builds a series with null for missing days", () => {
    const s = chartSeries([row("2026-10-13", 4, 2)], 3, today);
    expect(s).toEqual([
      { date: "2026-10-11", mood: null, urge: null },
      { date: "2026-10-12", mood: null, urge: null },
      { date: "2026-10-13", mood: 4, urge: 2 },
    ]);
  });
  it("reports a trend only with enough check-ins in both weeks", () => {
    const recent = ["07", "08", "09", "10"].map((d) => row(`2026-10-${d}`, 4, 2));
    const before = ["01", "02", "03"].map((d) => row(`2026-10-${d}`, 2, 4));
    const w = weekSummary([...recent, ...before], today);
    expect(w).toMatchObject({ count: 4, moodTrend: "up", urgeTrend: "down" });
    expect(weekSummary(recent, today).moodTrend).toBeNull();
  });
  it("ranks triggers from check-ins and relapses", () => {
    const top = topTriggers([row("2026-10-12", 3, 3, ["evening", "alcohol"]), row("2026-10-13", 3, 3, ["evening"])], [{ type: "relapse", trigger: "alcohol" }, { type: "resistance", trigger: "x" }]);
    expect(top).toEqual([{ key: "alcohol", count: 2 }, { key: "evening", count: 2 }]);
  });
});

describe("keepsakes", () => {
  it("classifies and limits media", () => {
    expect(mediaKindFor("image/png")).toBe("image");
    expect(mediaKindFor("application/pdf")).toBeNull();
    expect(mediaRefusal({ type: "application/pdf", size: 1 }, [])).toBe("type");
    expect(mediaRefusal({ type: "video/mp4", size: MAX_FILE_BYTES + 1 }, [])).toBe("size");
    expect(mediaRefusal({ type: "audio/webm", size: 1000 }, [{ size: MAX_TOTAL_BYTES }])).toBe("storage");
    expect(mediaRefusal({ type: "image/jpeg", size: 1000 }, [])).toBeNull();
  });
  it("picks pinned red flags first, then random ones", () => {
    const f = (id: string, pinned = false): RedFlag => ({ id, text: id, pinned, createdAt: "" });
    const out = pickRedFlags([f("a"), f("b", true), f("c"), f("d")], 3, () => 0);
    expect(out[0]!.id).toBe("b");
    expect(out).toHaveLength(3);
    expect(pickRedFlags([], 3)).toEqual([]);
  });
});

import { msUntilNext } from "@/lib/notify";
describe("msUntilNext", () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 13, h, m, 0, 0);
  it("targets later today when the time is still ahead", () => {
    expect(msUntilNext("21:30", at(20, 30))).toBe(60 * 60 * 1000);
  });
  it("rolls over to tomorrow when the time has passed", () => {
    expect(msUntilNext("21:30", at(22, 30))).toBe(23 * 60 * 60 * 1000);
    expect(msUntilNext("21:30", at(21, 30))).toBe(24 * 60 * 60 * 1000);
  });
});

import { highestReached, milestoneToCelebrate } from "@/lib/milestones";
describe("milestones", () => {
  it("celebrates the highest new milestone once", () => {
    expect(milestoneToCelebrate(0, 0)).toBeNull();
    expect(milestoneToCelebrate(1, 0)).toBe(1);
    expect(milestoneToCelebrate(8, 3)).toBe(7);
    expect(milestoneToCelebrate(8, 7)).toBeNull();
    expect(milestoneToCelebrate(400, 90)).toBeNull();
  });
  it("records past progress silently", () => {
    expect(highestReached(20)).toBe(14);
    expect(highestReached(0)).toBe(0);
  });
});
