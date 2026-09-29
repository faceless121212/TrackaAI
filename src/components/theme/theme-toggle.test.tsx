import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  savePreference: vi.fn(async () => ({ ok: true })),
  resolvedTheme: "dark" as string | undefined,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: mocks.resolvedTheme, setTheme: mocks.setTheme }),
}));
vi.mock("@/server/actions/profile", () => ({ setThemePreferenceAction: mocks.savePreference }));

describe("ThemeToggle", () => {
  beforeEach(() => {
    mocks.setTheme.mockReset();
    mocks.savePreference.mockClear();
  });

  it("switches dark to light and saves the preference", () => {
    mocks.resolvedTheme = "dark";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(mocks.setTheme).toHaveBeenCalledWith("light");
    expect(mocks.savePreference).toHaveBeenCalledWith("light");
  });

  it("switches light to dark", () => {
    mocks.resolvedTheme = "light";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(mocks.setTheme).toHaveBeenCalledWith("dark");
    expect(mocks.savePreference).toHaveBeenCalledWith("dark");
  });
});
