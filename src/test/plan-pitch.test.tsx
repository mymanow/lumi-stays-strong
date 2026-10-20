import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "@/i18n/en";

vi.mock("@/i18n", () => ({
  useI18n: () => ({ lang: "en", tl: (key: string) => (key === "pitch.steps" ? en.pitch.steps : []), t: (key: string) => {
    let value: unknown = en;
    for (const part of key.split(".")) value = (value as Record<string, unknown>)[part];
    return typeof value === "string" ? value : key;
  } }),
}));

import { PlanPitch } from "@/components/hold/PlanPitch";

afterEach(cleanup);

describe("plan pitch", () => {
  it("shows the yearly plan first and reveals the monthly one on demand", () => {
    const onChange = vi.fn();
    render(<PlanPitch value="yearly" onChange={onChange} />);
    const more = screen.getByRole("button", { name: /Show more plans/ });
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("radio", { name: /Yearly/ })).toBeChecked();
    expect(screen.queryByRole("radio", { name: /Monthly/ })).toBeNull(); // collapsed part is hidden from assistive tech
    fireEvent.click(more);
    expect(screen.getByRole("button", { name: /Hide/ })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("radio", { name: /Monthly/ }));
    expect(onChange).toHaveBeenCalledWith("monthly");
  });

  it("makes no trial or free-billing promise", () => {
    expect(JSON.stringify(en.pitch)).not.toMatch(/trial|essai/i);
  });
});
