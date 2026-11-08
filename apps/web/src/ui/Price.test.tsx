import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";

import { Price } from "./Price";

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-105 the price shows the taka sign and reads as taka to a screen reader", () => {
  const { container } = render(
    <p>
      <Price amount={50} />
    </p>,
  );
  const visible = container.querySelector('[aria-hidden="true"]');
  expect(visible?.textContent).toBe("৳50");
  const spoken = screen.getByText("50 taka");
  expect(spoken.className).toBe("visually-hidden");
  expect(spoken.getAttribute("aria-hidden")).toBeNull();
});

test("METRO-105 an amount of 1 or 0 keeps the same form", () => {
  render(
    <p>
      <Price amount={0} />
      <Price amount={1} />
    </p>,
  );
  expect(screen.getByText("0 taka")).toBeTruthy();
  expect(screen.getByText("1 taka")).toBeTruthy();
});
