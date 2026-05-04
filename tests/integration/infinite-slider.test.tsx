import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InfiniteSlider } from "@/components/ui/infinite-slider";

describe("InfiniteSlider", () => {
  it("renders children four times for seamless looping", () => {
    const { getAllByText } = render(
      <InfiniteSlider>
        <span>Slide</span>
      </InfiniteSlider>,
    );

    expect(getAllByText("Slide")).toHaveLength(4);
  });

  it("applies reverse direction and vertical layout styles", () => {
    const { container } = render(
      <InfiniteSlider className="outer" direction="vertical" gap={24} reverse speed={50}>
        <span>Item</span>
      </InfiniteSlider>,
    );

    const outer = container.firstElementChild as HTMLDivElement;
    const track = outer.firstElementChild as HTMLDivElement;

    expect(outer.className).toContain("outer");
    expect(track.style.animation).toContain("52s");
    expect(track.style.animationDirection).toBe("reverse");
    expect(track.style.flexDirection).toBe("column");
    expect(track.style.gap).toBe("24px");
  });

  it("clamps very high speed to the minimum duration floor", () => {
    const { container } = render(
      <InfiniteSlider speed={1000}>
        <span>Fast</span>
      </InfiniteSlider>,
    );

    const outer = container.firstElementChild as HTMLDivElement;
    const track = outer.firstElementChild as HTMLDivElement;
    expect(track.style.animation).toContain("18s");
  });
});
