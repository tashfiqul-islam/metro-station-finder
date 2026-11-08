import { expect, test } from "vitest";

import { alert, locate, locateOff, refresh } from "../../icons/icon-data";
import { alertIcon, locateIcon, locateOffIcon, refreshIcon } from "./location-icons";

test("METRO-113 the chunk-local location icons are the same shapes as icon-data's", () => {
  expect(locateIcon).toEqual(locate);
  expect(locateOffIcon).toEqual(locateOff);
  expect(alertIcon).toEqual(alert);
  expect(refreshIcon).toEqual(refresh);
});

test("METRO-113 the control: a different shape is not equal", () => {
  expect(locateIcon).not.toEqual(locateOff);
});
