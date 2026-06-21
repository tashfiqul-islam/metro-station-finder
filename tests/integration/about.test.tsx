import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Route } from "@/routes/about";

const AboutPage = Route.options.component;

const renderAbout = () => {
  if (!AboutPage) {
    throw new Error("About route component is not defined");
  }

  return render(<AboutPage />);
};

describe("About Page", () => {
  it("renders without crashing", () => {
    renderAbout();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Built for Dhaka commuters,shaped by a product owner who ships tools/iu,
      }),
    ).toBeInTheDocument();
  });

  it("displays the About heading and subtitle", () => {
    renderAbout();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Built for Dhaka commuters,shaped by a product owner who ships tools/iu,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Built for Dhaka commuters/u)).toBeInTheDocument();
  });

  it("renders all four section eyebrows without interaction", () => {
    renderAbout();
    expect(screen.getByText("The maintainer")).toBeInTheDocument();
    expect(screen.getByText("Operating principles")).toBeInTheDocument();
    expect(screen.getByText("Open source work")).toBeInTheDocument();
    expect(screen.getByText("Contribute")).toBeInTheDocument();
  });

  it("renders overview content", () => {
    renderAbout();
    expect(
      screen.getByText(/slow to check at the exact moment people needed certainty/u),
    ).toBeInTheDocument();
  });

  it("renders maintainer profile content", () => {
    renderAbout();
    expect(
      screen.getByText(/software that feels practical the moment it is opened/u),
    ).toBeInTheDocument();
  });

  it("renders maintainer social links", () => {
    renderAbout();
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByText("Reddit")).toBeInTheDocument();
  });

  it("renders other open source projects", () => {
    renderAbout();
    expect(screen.getByText("Profile View Counter")).toBeInTheDocument();
    expect(screen.getByText("Profile Weather View")).toBeInTheDocument();
  });

  it("renders contribution actions", () => {
    renderAbout();
    expect(screen.getByText("Open an Issue")).toBeInTheDocument();
    expect(screen.getByText("View Repository")).toBeInTheDocument();
  });

  it("renders content immediately without mounted guard delay", () => {
    renderAbout();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Built for Dhaka commuters,shaped by a product owner who ships tools/iu,
      }),
    ).toBeInTheDocument();
  });
});
