import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "@/i18n/en";

vi.mock("@/i18n", () => ({
  useI18n: () => ({ lang: "en", tl: (key: string) => (key === "notify.installSteps" ? en.notify.installSteps : []), t: (key: string, vars?: Record<string, string>) => {
    let value: unknown = en;
    for (const part of key.split(".")) value = (value as Record<string, unknown>)[part];
    return typeof value === "string" ? value.replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? `{${k}}`) : key;
  } }),
}));

import { NotifyPermission } from "@/components/hold/NotifyPermission";
import { notifyScreenApplicable } from "@/lib/notify";

const setUA = (ua: string) => Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); setUA("jsdom"); });

describe("notification permission screen", () => {
  it("asks with our own dialog, then enables the reminder when the browser grants", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    vi.stubGlobal("Notification", Object.assign(vi.fn(), { permission: "default", requestPermission }));
    const onEnabled = vi.fn();
    render(<NotifyPermission onEnabled={onEnabled} />);
    expect(screen.getByRole("heading", { name: "Tap Allow to get your reminder" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
    await waitFor(() => expect(onEnabled).toHaveBeenCalled());
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("heading", { name: /Reminder on/ })).toBeInTheDocument();
  });

  it("does not ask the browser when the person declines", () => {
    const requestPermission = vi.fn();
    vi.stubGlobal("Notification", Object.assign(vi.fn(), { permission: "default", requestPermission }));
    render(<NotifyPermission onEnabled={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Don't Allow" }));
    expect(requestPermission).not.toHaveBeenCalled();
    expect(screen.getByText(en.notify.declined)).toBeInTheDocument();
  });

  it("explains how to install the web app on iPhone Safari instead of asking", () => {
    setUA(IPHONE);
    render(<NotifyPermission onEnabled={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Add Hold to your home screen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Allow" })).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("is skipped when notifications cannot work at all", () => {
    expect(notifyScreenApplicable()).toBe(false);
    setUA(IPHONE);
    expect(notifyScreenApplicable()).toBe(true);
  });
});
