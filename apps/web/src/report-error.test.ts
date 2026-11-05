import { describeError, reportError } from "./report-error";

test("METRO-58 describeError keeps only a built-in error name", () => {
  expect(describeError(new TypeError("lat=23.81 lng=90.41"))).toBe("TypeError");
  expect(describeError(new Error("x"))).toBe("Error");
  expect(describeError(new RangeError("x"))).toBe("RangeError");
});

test("METRO-58 describeError never echoes a custom name, a message or a non-error", () => {
  class Leaky extends Error {
    override name = "https://example.test/?lat=23.81&lng=90.41";
  }
  expect(describeError(new Leaky("boom"))).toBe("Error");
  expect(describeError("lat=23.81")).toBe("NonError");
  expect(describeError({ name: "TypeError" })).toBe("NonError");
  expect(describeError(null)).toBe("NonError");
});

test("METRO-58 reportError labels a recoverable error as such and still logs only the class", () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    reportError(new Error("https://example.test/?lat=23.81"), "Recoverable error");
    expect(spy.mock.calls).toEqual([["Recoverable error: Error"]]);
  } finally {
    spy.mockRestore();
  }
});

test("METRO-58 reportError logs the safe class and nothing else", () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    reportError(new Error("https://example.test/?lat=23.81&lng=90.41"));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toEqual(["Render error: Error"]);
  } finally {
    spy.mockRestore();
  }
});
