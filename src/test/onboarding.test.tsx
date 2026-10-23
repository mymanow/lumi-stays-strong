import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { en } from "@/i18n/en";

const { updateProfile, profile, navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  profile: {
    id: "test-profile", name: "Alex", onboarding_step: 2, onboarding_completed: false,
  } as Record<string, unknown>,
}));

vi.mock("@/lib/app-state", () => ({ useApp: () => ({ ready: true, profile, updateProfile }) }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  useNavigate: () => navigateMock,
  useHydrated: () => false,
}));
vi.mock("@/i18n", () => ({
  useI18n: () => ({ lang: "en", setLang: vi.fn(), tl: (key: string) => (key === "info.bio.rows" ? en.info.bio.rows : key === "info.compare.rows" ? en.info.compare.rows : key === "reviews.examples" ? en.reviews.examples : key === "build.steps" ? en.build.steps : key === "ready.chips" ? en.ready.chips : key === "ready.cards" ? en.ready.cards : key === "pitch.steps" ? en.pitch.steps : key === "paywall.chips" ? en.paywall.chips : []), t: (key: string, vars?: Record<string, string>) => {
    let value: unknown = en;
    for (const part of key.split(".")) value = (value as Record<string, unknown>)[part];
    return typeof value === "string" ? value.replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? `{${k}}`) : key;
  } }),
  interpolate: (value: string) => value,
}));

// The real sheet needs Supabase and Whop; here we only check that it opens for the right plan.
vi.mock("@/components/hold/CheckoutSheet", () => ({
  CheckoutSheet: ({ open, plan }: { open: boolean; plan: string }) => (open ? <div role="dialog" data-testid="checkout" data-plan={plan} /> : null),
}));

import { Route } from "@/routes/onboarding";

const Component = () => {
  const C = Route.options.component as React.ComponentType;
  return <C />;
};
const next = () => screen.getByRole("button", { name: "Continue" });

beforeEach(() => {
  // jsdom doesn't implement Element.scrollTo, which the age picker calls on mount.
  Element.prototype.scrollTo = (() => {}) as typeof Element.prototype.scrollTo;
  window.scrollTo = (() => {}) as typeof window.scrollTo;
  window.matchMedia = vi.fn().mockReturnValue({ matches: true });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); for (const k of Object.keys(profile)) delete profile[k]; Object.assign(profile, { id: "test-profile", name: "Alex", onboarding_step: 2, onboarding_completed: false }); });

describe("onboarding questions", () => {
  it("Q1 asks what brought the user here: 7 choices, one answer", () => {
    render(<Component />);
    expect(screen.getByRole("heading", { name: en.onb.situationTitle })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(7);
    expect(next()).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: en.options.situation.breakup }));
    fireEvent.click(screen.getByRole("radio", { name: en.options.situation.going_back }));
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenCalledWith({ situation_type: "going_back", onboarding_step: 3 });
  });

  it("Q2 saves the range and starts the counter at its lowest bound", () => {
    Object.assign(profile, { onboarding_step: 3 });
    render(<Component />);
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    fireEvent.click(screen.getByRole("radio", { name: en.options.lastContact.m1_3 }));
    fireEvent.click(next());
    const patch = updateProfile.mock.calls[0]![0] as { last_contact_range: string; last_contact_at: string; onboarding_step: number };
    expect(patch).toMatchObject({ last_contact_range: "m1_3", onboarding_step: 4 });
    const days = (Date.now() - new Date(patch.last_contact_at).getTime()) / 86400000;
    expect(days).toBeGreaterThan(30.9);
    expect(days).toBeLessThan(31.1);
  });

  it("Q3 is multi-select and 'I haven't reached out yet' is exclusive", () => {
    Object.assign(profile, { onboarding_step: 4 });
    render(<Component />);
    expect(screen.getByText(en.onb.multiSub)).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(7);
    expect(next()).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: en.options.after.worse }));
    fireEvent.click(screen.getByRole("checkbox", { name: en.options.after.argued }));
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(2);
    fireEvent.click(screen.getByRole("checkbox", { name: en.options.after.not_yet }));
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);
    fireEvent.click(screen.getByRole("checkbox", { name: en.options.after.worse }));
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);
    expect(screen.getByRole("checkbox", { checked: true })).toHaveTextContent(en.options.after.worse);
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenCalledWith({ last_contact_feelings: ["worse"], onboarding_step: 5 });
  });

  it("Q4 is multi-select with 7 choices", () => {
    Object.assign(profile, { onboarding_step: 5 });
    render(<Component />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(7);
    fireEvent.click(screen.getByRole("checkbox", { name: en.options.now.lonely }));
    fireEvent.click(screen.getByRole("checkbox", { name: en.options.now.okay }));
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenCalledWith({ current_feelings: ["lonely", "okay"], onboarding_step: 6 });
  });

  it("Q5 saves the hope as motivation", () => {
    Object.assign(profile, { onboarding_step: 6 });
    render(<Component />);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    fireEvent.click(screen.getByRole("radio", { name: en.options.motivation.perspective }));
    expect(document.getElementById("choice-detail-perspective")).toHaveAttribute("aria-hidden", "false");
    expect(document.getElementById("choice-detail-win_back")).toHaveAttribute("aria-hidden", "true");
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenCalledWith({ motivation: "perspective", onboarding_step: 7 });
  });

  it("asks how the user heard about the app, saves the answer, then the goal", () => {
    Object.assign(profile, { onboarding_step: 7 });
    render(<Component />);
    expect(screen.getByRole("heading", { name: /^How did you learn about/ })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    expect(next()).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: en.options.source.tiktok }));
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenCalledWith({ acquisition_source: "tiktok", onboarding_step: 8 });
    expect(screen.getByRole("heading", { name: en.onb.goalTitle })).toBeInTheDocument();
  });

  it("unfolds the explanation under the chosen situation and folds the previous one", () => {
    Object.assign(profile, { onboarding_step: 2 });
    render(<Component />);
    const panel = (k: string) => document.getElementById(`choice-detail-${k}`)!;
    fireEvent.click(screen.getByRole("radio", { name: en.options.situation.breakup }));
    expect(panel("breakup")).toHaveAttribute("aria-hidden", "false");
    expect(panel("breakup")).toHaveTextContent(/Breakups shock your whole system/);
    fireEvent.click(screen.getByRole("radio", { name: en.options.situation.mixed_signals }));
    expect(panel("breakup")).toHaveAttribute("aria-hidden", "true");
    expect(panel("mixed_signals")).toHaveAttribute("aria-hidden", "false");
  });

  it("Q7 offers 7 goals including no end date", () => {
    Object.assign(profile, { onboarding_step: 8 });
    render(<Component />);
    expect(screen.getAllByRole("radio")).toHaveLength(7);
    fireEvent.click(screen.getByRole("radio", { name: en.options.goal.open }));
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenCalledWith({ no_contact_goal: "open", onboarding_step: 9 });
  });

  it("lets the user skip the goal question without saving a goal", () => {
    Object.assign(profile, { onboarding_step: 8 });
    render(<Component />);
    expect(next()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: en.onb.skip }));
    expect(updateProfile).toHaveBeenCalledWith({ no_contact_goal: null, onboarding_step: 9 });
    expect(screen.getByRole("heading", { name: "Alex, many slips happen in a moment of weakness" })).toBeInTheDocument();
  });

  it("resumes with previously saved answers and ignores legacy values", () => {
    Object.assign(profile, { onboarding_step: 2, situation_type: "toxic" });
    render(<Component />);
    expect(screen.queryByRole("radio", { checked: true })).not.toBeInTheDocument();
    cleanup();
    Object.assign(profile, { situation_type: "mixed_signals" });
    render(<Component />);
    expect(screen.getByRole("radio", { checked: true })).toHaveTextContent(en.options.situation.mixed_signals);
  });

  it("shows five information screens after the goal, then the rules", () => {
    Object.assign(profile, { onboarding_step: 9 });
    render(<Component />);
    expect(screen.getByRole("heading", { name: "Alex, many slips happen in a moment of weakness" })).toBeInTheDocument();
    fireEvent.click(next());
    expect(screen.getByRole("heading", { name: en.info.bio.title })).toBeInTheDocument();
    fireEvent.click(next());
    expect(screen.getByRole("heading", { name: en.info.compare.title })).toBeInTheDocument();
    fireEvent.click(next());
    expect(screen.getByRole("heading", { name: en.info.science.title })).toBeInTheDocument();
    fireEvent.click(next());
    expect(screen.getByRole("heading", { name: en.info.toolkit.title })).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenLastCalledWith({ onboarding_step: 10 });
    expect(screen.getByRole("heading", { name: en.onb.rulesTitle })).toBeInTheDocument();
  });

  it("greets the user by name after the name, before the first question", () => {
    Object.assign(profile, { onboarding_step: 1 });
    render(<Component />);
    expect(screen.getByRole("heading", { name: en.onb.nameTitle })).toBeInTheDocument();
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenCalledWith({ name: "Alex" });
    expect(screen.getByRole("heading", { name: "Nice to meet you, Alex!" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: en.onb.greet.cta }));
    expect(updateProfile).toHaveBeenLastCalledWith({ onboarding_step: 2 });
    expect(screen.getByRole("heading", { name: en.onb.situationTitle })).toBeInTheDocument();
  });

  it("saves the selected no-contact rules, then continues", () => {
    Object.assign(profile, { onboarding_step: 10, no_contact_rules: ["no_texting", "bogus"] });
    render(<Component />);
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);
    fireEvent.click(screen.getByRole("checkbox", { name: en.options.rules.no_meeting }));
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenCalledWith({ no_contact_rules: ["no_texting", "no_meeting"], onboarding_step: 11 });
    expect(screen.getByRole("heading", { name: /^You won't have to do it alone/ })).toBeInTheDocument();
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenLastCalledWith({ onboarding_step: 12 });
    expect(screen.getByRole("heading", { name: en.reviews.title })).toBeInTheDocument();
    expect(screen.getAllByText(en.reviews.example)).toHaveLength(3);
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenLastCalledWith({ onboarding_step: 13 });
    expect(screen.getByRole("heading", { name: en.build.title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: en.build.ready }));
    expect(updateProfile).toHaveBeenLastCalledWith({ onboarding_step: 14 });
    expect(screen.getByRole("heading", { name: "Your personalized plan is ready, Alex!" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: en.ready.start }));
    expect(updateProfile).toHaveBeenLastCalledWith({ onboarding_step: 15 });
    expect(screen.getByRole("heading", { name: /Start your journey with support/ })).toBeInTheDocument();
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenLastCalledWith({ onboarding_step: 16 });
    expect(screen.getByRole("heading", { name: /You are not alone in this/ })).toBeInTheDocument();
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenLastCalledWith({ onboarding_step: 17 });
    expect(screen.getByRole("heading", { name: /A gentle reminder every day to hold on/ })).toBeInTheDocument();
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenLastCalledWith({ onboarding_step: 20 }); // jsdom has no Notification API: the permission screen is skipped, and the hidden plan pitch (SHOW_PLAN_PITCH) too
    expect(screen.queryByRole("heading", { name: /Your recovery starts now/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: en.paywall.title })).toBeInTheDocument(); // commitment and "plan ready" screens were removed
  });

  it("goes back through the information screens to the goal question", () => {
    Object.assign(profile, { onboarding_step: 9 });
    render(<Component />);
    fireEvent.click(next());
    fireEvent.click(next());
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: en.info.bio.title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Alex, many slips happen in a moment of weakness" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: en.onb.goalTitle })).toBeInTheDocument();
  });
});

describe("paywall result screen", () => {
  it("shows today + 90 days, the quarterly plan first, and opens the checkout for the selected plan", async () => {
    Object.assign(profile, { onboarding_step: 20 });
    render(<Component />);
    const expected = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(Date.now() + 90 * 86400000));
    expect(screen.getByTestId("target-date")).toHaveTextContent(expected);
    expect(screen.getByRole("radio", { name: /Quarterly/ })).toBeChecked();
    expect(screen.getByText(en.paywall.quarterly.billed)).toBeInTheDocument();
    expect(screen.queryByTestId("checkout")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: en.paywall.cta }));
    expect(await screen.findByTestId("checkout")).toHaveAttribute("data-plan", "quarterly");
    expect(navigateMock).not.toHaveBeenCalled(); // no separate paywall page any more
  });

  it("keeps the weekly plan hidden until 'Show more plans' and sends it to the checkout once chosen", async () => {
    Object.assign(profile, { onboarding_step: 20 });
    render(<Component />);
    expect(screen.queryByRole("radio", { name: /Weekly/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Show more plans/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Weekly/ }));
    fireEvent.click(screen.getByRole("button", { name: en.paywall.cta }));
    expect((await screen.findByTestId("checkout")).getAttribute("data-plan")).toBe("weekly");
  });

  it("hiding the weekly plan falls back to the visible one", async () => {
    Object.assign(profile, { onboarding_step: 20 });
    render(<Component />);
    fireEvent.click(screen.getByRole("button", { name: /Show more plans/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Weekly/ }));
    fireEvent.click(screen.getByRole("button", { name: /Hide/ }));
    fireEvent.click(screen.getByRole("button", { name: en.paywall.cta }));
    expect((await screen.findByTestId("checkout")).getAttribute("data-plan")).toBe("quarterly");
  });

  it("is the last screen: skipping completes the onboarding and goes home, opening the checkout completes it too", async () => {
    Object.assign(profile, { onboarding_step: 20 });
    render(<Component />);
    fireEvent.click(screen.getByRole("button", { name: en.paywall.skip }));
    await Promise.resolve();
    expect(updateProfile).toHaveBeenCalledWith({ onboarding_completed: true, onboarding_step: 20 });
    expect(navigateMock).toHaveBeenCalledWith({ to: "/" });
    updateProfile.mockClear();
    fireEvent.click(screen.getByRole("button", { name: en.paywall.cta }));
    expect(updateProfile).toHaveBeenCalledWith({ onboarding_completed: true, onboarding_step: 20 });
  });

  it("shows no star rating while there is no real rating", () => {
    Object.assign(profile, { onboarding_step: 20 });
    render(<Component />);
    expect(screen.queryByLabelText(/\/ 5$/)).toBeNull();
  });
});

describe("payment simulation (test only)", () => {
  it("jumps from the plan pitch to the post-payment screen without writing any subscription", () => {
    Object.assign(profile, { onboarding_step: 19 });
    render(<Component />);
    fireEvent.click(screen.getByRole("button", { name: en.pitch.simulate }));
    expect(updateProfile).toHaveBeenCalledWith({ onboarding_completed: true, onboarding_step: 20 });
    expect(navigateMock).toHaveBeenCalledWith({ to: "/subscribe/success", search: { simulate: "1" } });
    expect(updateProfile.mock.calls.some(([p]) => JSON.stringify(p).includes("subscri"))).toBe(false);
  });
});

describe("information screens honesty", () => {
  it("carries the real citation and no unsourced statistic", () => {
    const text = JSON.stringify(en.info);
    expect(text).toContain("Clinical Psychological Science, 8(3), 450–463");
    expect(text).not.toMatch(/\d+x/);
    expect(en.info.science.caveat).toMatch(/not proof/);
  });
});
