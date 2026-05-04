import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

describe("Progress", () => {
  it("renders label and value helpers", () => {
    render(
      <Progress value={42}>
        <ProgressLabel>Upload</ProgressLabel>
        <ProgressValue>{() => "42%"}</ProgressValue>
      </Progress>,
    );

    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
  });
});
