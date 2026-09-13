// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LiveStatusChip } from "@/components/match/LiveStatusChip";

afterEach(() => {
  cleanup();
});

vi.mock("motion/react", async () => {
  const actual =
    await vi.importActual<typeof import("motion/react")>("motion/react");
  return {
    ...actual,
    useReducedMotion: () => true,
    useInView: () => true,
  };
});

describe("LiveStatusChip", () => {
  it("shows minute badge in default appearance", () => {
    render(<LiveStatusChip minuteLabel="67'" appearance="default" />);
    expect(screen.getByText("67'")).toBeInTheDocument();
  });

  it("shows Live label when no minute is provided", () => {
    render(<LiveStatusChip appearance="default" />);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("compact appearance exposes live label without duplicate Live text", () => {
    render(<LiveStatusChip appearance="compact" />);
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Live")).toBeInTheDocument();
  });

  it("renders static dot when reduced motion is preferred", () => {
    const { container } = render(
      <LiveStatusChip appearance="compact" minuteLabel="12'" />
    );
    expect(container.querySelector("motion-span")).toBeNull();
  });
});
