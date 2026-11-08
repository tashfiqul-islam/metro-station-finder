import { expect, test } from "vitest";

import { chevronRight, externalLink, mapPin, navigation, search, x } from "../../icons/icon-data";
import {
  chevronIcon,
  clearIcon,
  directionsIcon,
  externalIcon,
  pinIcon,
  searchIcon,
} from "./picker-icons";

test("METRO-112 the chunk-local picker icons are the same shapes as icon-data's", () => {
  expect(searchIcon).toEqual(search);
  expect(clearIcon).toEqual(x);
  expect(chevronIcon).toEqual(chevronRight);
  expect(directionsIcon).toEqual(navigation);
  expect(externalIcon).toEqual(externalLink);
  expect(pinIcon).toEqual(mapPin);
});
