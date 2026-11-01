// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StaleBadge } from "@/components/common/StaleBadge";

afterEach(() => {
  cleanup();
});

describe("StaleBadge Serbian freshness", () => {
  it("shows a warning label from providerSyncedAt when the caller marks it stale", () => {
    const updatedAt = new Date(Date.now() - 15 * 60_000).toISOString();

    render(<StaleBadge language="sr" stale updatedAt={updatedAt} />);

    const label = screen.getByText("Ažurirano pre 15 min");
    expect(label.parentElement).toHaveClass("bg-warning/15");
  });

  it("keeps the English label for the design-system default", () => {
    const updatedAt = new Date(Date.now() - 15 * 60_000).toISOString();

    render(<StaleBadge updatedAt={updatedAt} />);

    expect(screen.getByText("Stale · 15m ago")).toBeInTheDocument();
  });
});
