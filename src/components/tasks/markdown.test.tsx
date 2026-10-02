import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown, isIssueLink } from "./markdown";

describe("isIssueLink", () => {
  it("accepts only the exact issue-link shape", () => {
    expect(isIssueLink("/acme/board/4f1c2b7e-1d2a-4c3b-9e8f-0a1b2c3d4e5f?task=ENG-12")).toBe(true);
    for (const href of [
      "/sign-out",
      "/acme/settings/billing",
      "//evil.example/acme/board/x?task=ENG-1",
      "/%5Cevil.example",
      "/acme/board/x?task=ENG-1&next=//evil.example",
      "https://evil.example/acme/board/x?task=ENG-1",
      "/acme/board/x/y?task=ENG-1",
    ]) {
      expect(isIssueLink(href), href).toBe(false);
    }
  });
});

describe("Markdown (untrusted)", () => {
  it("keeps issue links in the app and opens everything else apart", () => {
    render(
      <Markdown untrusted>
        {"[ENG-1 Fix](/acme/board/abc-123?task=ENG-1) and [leave](/sign-out) and [site](https://example.com)"}
      </Markdown>,
    );
    expect(screen.getByRole("link", { name: "ENG-1 Fix" })).not.toHaveAttribute("target");
    for (const name of ["leave", "site"]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("target", "_blank");
      expect(screen.getByRole("link", { name })).toHaveAttribute("rel", "noopener noreferrer nofollow");
    }
  });
});
