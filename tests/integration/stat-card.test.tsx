import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatCard } from "@/components/common/stat-card";

describe("StatCard", () => {
  it("renders without crashing", () => {
    render(<StatCard value="42" label="Stations" />);
    expect(screen.getByTestId("stat-card")).toBeDefined();
  });

  it("renders the value text", () => {
    render(<StatCard value="21" label="MRT stops" />);
    expect(screen.getByText("21")).toBeDefined();
  });

  it("renders the label text", () => {
    render(<StatCard value="21" label="MRT stops" />);
    expect(screen.getByText("MRT stops")).toBeDefined();
  });

  it("applies .stat-number class to the value element", () => {
    const { container } = render(<StatCard value="99" label="test" />);
    const span = container.querySelector(".stat-number");
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe("99");
  });

  it("applies a custom className to the outer wrapper", () => {
    const { container } = render(<StatCard value="1" label="x" className="extra-class" />);
    const el = container.firstElementChild;
    expect(el?.classList.contains("extra-class")).toBe(true);
  });
});
