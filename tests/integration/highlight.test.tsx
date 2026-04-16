import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Highlight, HighlightItem } from "@/components/ui/highlight";

describe("Highlight + HighlightItem", () => {
  it("renders all children", () => {
    render(
      <Highlight>
        <HighlightItem value="a">
          <button type="button">A</button>
        </HighlightItem>
        <HighlightItem value="b">
          <button type="button">B</button>
        </HighlightItem>
      </Highlight>,
    );
    expect(screen.getByText("A")).toBeDefined();
    expect(screen.getByText("B")).toBeDefined();
  });

  it("clicking an item sets data-active=true on that item's container", () => {
    render(
      <Highlight controlledItems>
        <HighlightItem value="home">
          <button type="button">Home</button>
        </HighlightItem>
        <HighlightItem value="about">
          <button type="button">About</button>
        </HighlightItem>
      </Highlight>,
    );

    // The HighlightItem container div carries data-value and data-active
    const homeContainer = screen
      .getByText("Home")
      .closest("[data-slot='motion-highlight-item-container']") as HTMLElement;
    fireEvent.click(homeContainer);
    expect(homeContainer.dataset["active"]).toBe("true");
  });

  it("defaultValue pre-selects the active item", () => {
    render(
      <Highlight controlledItems defaultValue="about">
        <HighlightItem value="home">
          <button type="button">Home</button>
        </HighlightItem>
        <HighlightItem value="about">
          <button type="button">About</button>
        </HighlightItem>
      </Highlight>,
    );

    const aboutContainer = screen
      .getByText("About")
      .closest("[data-slot='motion-highlight-item-container']") as HTMLElement;
    expect(aboutContainer.dataset["active"]).toBe("true");
  });
});
