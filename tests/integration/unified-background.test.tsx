import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UnifiedBackground } from "@/components/common/unified-background";

describe("UnifiedBackground", () => {
  it("renders three layered background elements", () => {
    const { container } = render(<UnifiedBackground />);

    const wrapper = container.firstElementChild;
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(wrapper?.children).toHaveLength(3);
  });

  it("sets a stable displayName", () => {
    expect(UnifiedBackground.displayName).toBe("UnifiedBackground");
  });
});
