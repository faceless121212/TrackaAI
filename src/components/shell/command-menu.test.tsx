import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandMenu } from "./command-menu";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setTheme: vi.fn(),
  savePreference: vi.fn(async () => ({ ok: true })),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme: mocks.setTheme }) }));
vi.mock("@/server/actions/profile", () => ({ setThemePreferenceAction: mocks.savePreference }));

const BOARDS = [{ id: "b1", name: "Roadmap" }];

describe("CommandMenu", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.setTheme.mockReset();
  });

  it("opens with Cmd+K", () => {
    render(<CommandMenu teamSlug="acme" boards={BOARDS} />);
    expect(screen.queryByPlaceholderText("Type a command or search…")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByPlaceholderText("Type a command or search…")).toBeInTheDocument();
  });

  it("switches theme from the palette", () => {
    render(<CommandMenu teamSlug="acme" boards={BOARDS} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByText("Light theme"));
    expect(mocks.setTheme).toHaveBeenCalledWith("light");
    expect(mocks.savePreference).toHaveBeenCalledWith("light");
  });

  it("navigates to a team page", () => {
    render(<CommandMenu teamSlug="acme" boards={BOARDS} />);
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    fireEvent.click(screen.getByText("My tasks"));
    expect(mocks.push).toHaveBeenCalledWith("/acme");
  });

  it("jumps to a board", () => {
    render(<CommandMenu teamSlug="acme" boards={BOARDS} />);
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    fireEvent.click(screen.getByText("Roadmap"));
    expect(mocks.push).toHaveBeenCalledWith("/acme/board/b1");
  });
});
