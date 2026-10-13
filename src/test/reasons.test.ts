import { describe, expect, it } from "vitest";
import { addOwnReason, sosReasons } from "@/lib/reasons";

describe("optional own reasons", () => {
  it("allows up to three and refuses a fourth", () => {
    expect(addOwnReason(["a", "b"], "c")).toEqual(["a", "b", "c"]);
    expect(addOwnReason(["a", "b", "c"], "d")).toEqual(["a", "b", "c"]);
  });
  it("places own reasons before motivation and situation, capped at three", () => {
    expect(sosReasons(["mine"], "move_on", "going_back", (k) => k)).toEqual(["mine", "commit.motivation.move_on", "commit.situation.going_back"]);
    expect(sosReasons(["a", "b", "c"], "move_on", "going_back", (k) => k)).toEqual(["a", "b", "c"]);
  });
  it("uses motivation and situation without any required own reasons", () => {
    expect(sosReasons([], "win_back", "breakup", (k) => k)).toEqual(["commit.motivation.win_back", "commit.situation.default"]);
  });
  it("falls back to neutral phrases for unknown or legacy values", () => {
    expect(sosReasons([], "take_back_control", "toxic", (k) => k)).toEqual(["commit.motivation.unsure", "commit.situation.default"]);
  });
});
