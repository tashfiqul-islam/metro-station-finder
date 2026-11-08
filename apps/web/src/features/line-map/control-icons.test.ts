import { expect, test } from "vitest";

import { maximize, minus, plus } from "../../icons/icon-data";
import { fitIcon, zoomInIcon, zoomOutIcon } from "./control-icons";

test("METRO-111 the chunk-local zoom icons are the same shapes as icon-data's plus, minus and maximize", () => {
  expect(zoomInIcon).toEqual(plus);
  expect(zoomOutIcon).toEqual(minus);
  expect(fitIcon).toEqual(maximize);
});
