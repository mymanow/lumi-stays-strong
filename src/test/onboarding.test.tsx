import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { en } from "@/i18n/en";

const { updateProfile, profile } = vi.hoisted(() => ({
  updateProfile: vi.fn().mockResolvedValue(undefined),
  profile: {
    id: "test-profile", name: "Alex", onboarding_step: 2, onboarding_completed: false,
  } as Record<string, unknown>,
}));

vi.mock("@/lib/app-state", () => ({ useApp: () => ({ ready: true, profile, updateProfile }) }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  useNavigate: () => vi.fn(),
  useHydrated: () => false,
}));
vi.mock("@/i18n", () => ({
  useI18n: () => ({ lang: "en", setLang: vi.fn(), tl: (key: string) => (key === "info.bio.rows" ? en.info.bio.rows : key === "info.compare.rows" ? en.info.compare.rows : []), t: (key: string, vars?: Record<string, string>) => {
    let value: unknown = en;
    for (const part of key.split(".")) value = (value as Record<string, unknown>)[part];
    return typeof value === "string" ? value.replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? `{${k}}`) : key;
  } }),
  interpolate: (value: string) => value,
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
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenCalledWith({ motivation: "perspective", onboarding_step: 7 });
  });

  it("Q6 offers 7 goals including no end date", () => {
    Object.assign(profile, { onboarding_step: 7 });
    render(<Component />);
    expect(screen.getAllByRole("radio")).toHaveLength(7);
    fireEvent.click(screen.getByRole("radio", { name: en.options.goal.open }));
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenCalledWith({ no_contact_goal: "open", onboarding_step: 8 });
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

  it("shows four information screens after the age, then the commitment", () => {
    Object.assign(profile, { onboarding_step: 9 });
    render(<Component />);
    expect(screen.getByRole("heading", { name: en.onb.age })).toBeInTheDocument();
    fireEvent.click(next());
    // age is saved without leaving step 9, so a refresh resumes on the age question
    expect(updateProfile).toHaveBeenCalledWith({ age: 30 });
    expect(screen.getByRole("heading", { name: "Alex, many slips happen in a moment of weakness" })).toBeInTheDocument();
    fireEvent.click(next());
    expect(screen.getByRole("heading", { name: en.info.bio.title })).toBeInTheDocument();
    fireEvent.click(next());
    expect(screen.getByRole("heading", { name: en.info.compare.title })).toBeInTheDocument();
    fireEvent.click(next());
    expect(screen.getByRole("heading", { name: en.info.science.title })).toBeInTheDocument();
    expect(updateProfile).toHaveBeenCalledTimes(1);
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenLastCalledWith({ age: 30, onboarding_step: 10 });
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

  it("saves the selected no-contact rules, then shows the commitment", () => {
    Object.assign(profile, { onboarding_step: 10, no_contact_rules: ["no_texting", "bogus"] });
    render(<Component />);
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);
    fireEvent.click(screen.getByRole("checkbox", { name: en.options.rules.no_meeting }));
    fireEvent.click(next());
    expect(updateProfile).toHaveBeenCalledWith({ no_contact_rules: ["no_texting", "no_meeting"], onboarding_step: 11 });
    expect(screen.getByRole("heading", { name: en.commit.title })).toBeInTheDocument();
  });

  it("goes back through the information screens to the age", () => {
    Object.assign(profile, { onboarding_step: 9 });
    render(<Component />);
    fireEvent.click(next());
    fireEvent.click(next());
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Alex, many slips happen in a moment of weakness" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: en.onb.age })).toBeInTheDocument();
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
