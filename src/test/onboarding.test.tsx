import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "@/i18n/en";

const { updateProfile, profile } = vi.hoisted(() => ({
  updateProfile: vi.fn().mockResolvedValue(undefined),
  profile: {
    id: "test-profile", name: "Alex", onboarding_step: 1, onboarding_completed: false,
    motivation: undefined as string | undefined,
  },
}));

vi.mock("@/lib/app-state", () => ({ useApp: () => ({ ready: true, profile, updateProfile }) }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  useNavigate: () => vi.fn(),
  useHydrated: () => false,
}));
vi.mock("@/i18n", () => ({
  useI18n: () => ({ lang: "en", setLang: vi.fn(), tl: () => [], t: (key: string) => {
    let value: unknown = en;
    for (const part of key.split(".")) value = (value as Record<string, unknown>)[part];
    return typeof value === "string" ? value : key;
  } }),
  interpolate: (value: string) => value,
}));

import { Route } from "@/routes/onboarding";

afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); Object.assign(profile, { onboarding_step: 1, motivation: undefined }); });

describe("onboarding hardship question", () => {
  it("requires one selection after the name and before the contact question", () => {
    const Component = Route.options.component as React.ComponentType;
    render(<Component />);
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toBeDisabled();
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    fireEvent.click(screen.getByRole("radio", { name: en.options.hardest.text_urge }));
    fireEvent.click(screen.getByRole("radio", { name: en.options.hardest.rumination }));
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(localStorage.getItem("hold_onboarding_hardest_test-profile")).toBe("rumination");
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
  });

  it("resumes after a previously confirmed answer", () => {
    localStorage.setItem("hold_onboarding_hardest_test-profile", "guilt");
    const Component = Route.options.component as React.ComponentType;
    render(<Component />);
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
    expect(screen.getByRole("radio", { checked: true })).toHaveTextContent(en.options.hardest.guilt);
  });
});

describe("onboarding social media question", () => {
  it("asks after the motivation and keeps the answer on this device", async () => {
    Object.assign(profile, { onboarding_step: 6, motivation: "move_on" });
    const Component = Route.options.component as React.ComponentType;
    render(<Component />);
    expect(screen.getByRole("radio", { checked: true })).toHaveTextContent(en.options.motivation.move_on);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: en.onb.socialsTitle })).toBeInTheDocument();
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toBeDisabled();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    fireEvent.click(screen.getByRole("radio", { name: en.options.socials.several_daily }));
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(localStorage.getItem("hold_onboarding_socials_test-profile")).toBe("several_daily");
    expect(screen.getByRole("heading", { name: en.onb.emotion })).toBeInTheDocument();
  });

  it("resumes on the social media question with the saved answer", () => {
    Object.assign(profile, { onboarding_step: 6, motivation: "move_on" });
    localStorage.setItem("hold_onboarding_socials_test-profile", "never");
    const Component = Route.options.component as React.ComponentType;
    render(<Component />);
    expect(screen.getByRole("radio", { checked: true })).toHaveTextContent(en.options.socials.never);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("radio", { checked: true })).toHaveTextContent(en.options.motivation.move_on);
  });
});

describe("onboarding reasons question removed", () => {
  it("goes from the age straight to the commitment", () => {
    Object.assign(profile, { onboarding_step: 9 });
    const Component = Route.options.component as React.ComponentType;
    render(<Component />);
    expect(screen.getByRole("heading", { name: en.onb.age })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: en.commit.title })).toBeInTheDocument();
    expect(screen.queryByText("Why are you doing this?")).not.toBeInTheDocument();
  });
});