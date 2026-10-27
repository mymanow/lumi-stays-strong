import { describe, expect, it } from "vitest";
import { readCookie, verifyState } from "@/lib/whop-oauth";

describe("whop oauth state", () => {
  it("returns the verifier when state matches", () => {
    expect(verifyState("abc.ver", "abc")).toBe("ver");
  });
  it("rejects a mismatched or missing state", () => {
    expect(verifyState("abc.ver", "xyz")).toBeNull();
    expect(verifyState(null, "abc")).toBeNull();
  });
  it("reads the cookie by name", () => {
    expect(readCookie("a=1; hold_whop_oauth=s.v", "hold_whop_oauth")).toBe("s.v");
  });
});
