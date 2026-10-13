import { describe, expect, it } from "vitest";
import { CONTACT_RANGE_DAYS, commitmentPhraseKeys, crisisLineFor, detectCrisis, lumiStageForDays } from "@/lib/domain";

describe("Lumi stages", () => {
  it("day 1 is a spark, 7 stronger, 30 lights up, 90 full", () => {
    expect(lumiStageForDays(0)).toBe(1);
    expect(lumiStageForDays(7)).toBe(2);
    expect(lumiStageForDays(30)).toBe(3);
    expect(lumiStageForDays(90)).toBe(4);
  });
});

describe("commitment phrases", () => {
  it("toxic + take_back_control", () => {
    expect(commitmentPhraseKeys("perspective", "going_back")).toEqual(["commit.motivation.perspective", "commit.always", "commit.situation.going_back"]);
  });
  it("other situations use the default phrase", () => {
    expect(commitmentPhraseKeys("win_back", "breakup")[2]).toBe("commit.situation.default");
  });
});

describe("crisis", () => {
  it("France uses 3114", () => expect(crisisLineFor("fr").number).toBe("3114"));
  it("UK uses Samaritans", () => expect(crisisLineFor("en", "en-GB").number).toBe("116 123"));
  it("US uses 988", () => expect(crisisLineFor("en", "en-US").number).toBe("988"));
  it("detects distress keywords", () => {
    expect(detectCrisis("j'ai envie d'en finir")).toBe(true);
    expect(detectCrisis("I want to text him")).toBe(false);
  });
});

describe("last contact ranges", () => {
  it("start from the lowest bound of each range and only increase", () => {
    const days = Object.values(CONTACT_RANGE_DAYS);
    expect(days[0]).toBe(0);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });
});
