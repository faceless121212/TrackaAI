import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandMenu } from "./command-menu";

const mocks = vi.hoisted(() => ({ push: vi.fn(), setTheme: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme: mocks.setTheme }) }));

describe("CommandMenu", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.setTheme.mockReset();
  });

  it("opens with Cmd+K", () => {
    render(<CommandMenu />);
    expect(screen.queryByPlaceholderText("Type a command or search…")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByPlaceholderText("Type a command or search…")).toBeInTheDocument();
  });

  it("switches theme from the palette", () => {
    render(<CommandMenu />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByText("Light theme"));
    expect(mocks.setTheme).toHaveBeenCalledWith("light");
  });

  it("navigates to a nav item", () => {
    render(<CommandMenu />);
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    fireEvent.click(screen.getByText("My tasks"));
    expect(mocks.push).toHaveBeenCalledWith("/");
  });
});
