import { assertStandIn, pickNode, withFakeGh } from "./fake-gh";
import { expectRejection } from "./test-support";

test("METRO-92 on Windows only a real .exe qualifies, never an extensionless shim", () => {
  const shim = String.raw`C:\Tools\node`;
  const exe = String.raw`C:\Program Files\nodejs\node.exe`;
  expect(pickNode([shim, "", exe], "win32")).toBe(exe);
  expect(pickNode([`  ${exe}  `], "win32")).toBe(exe);
  expect(() => pickNode([shim], "win32")).toThrow(`the lookup found: ${shim}`);
  expect(() => pickNode([], "win32")).toThrow("the lookup found: nothing");
});

test("METRO-92 elsewhere the first lookup result is used", () => {
  expect(pickNode(["/usr/bin/node", "/opt/node"], "linux")).toBe("/usr/bin/node");
  expect(() => pickNode(["", " "], "linux")).toThrow("nothing");
});

test("METRO-92 a stand-in that did not run the preload is rejected with what it printed", () => {
  expect(() => assertStandIn("v26.13.0\n", "/tmp/gh")).toThrow(
    'did not run the preload (printed "v26.13.0\\n")',
  );
  expect(() => assertStandIn("listing probe", "/tmp/gh")).not.toThrow();
});

test("METRO-92 a probe that could not start is reported as not having run the preload", () => {
  expect(() => assertStandIn(null, "/tmp/gh")).toThrow('(printed "")');
  expect(() => assertStandIn(undefined, "/tmp/gh")).toThrow("did not run the preload");
});

const snapshot = () => ({
  PATH: process.env["PATH"],
  NODE_OPTIONS: process.env["NODE_OPTIONS"],
  FAKE_GH: process.env["FAKE_GH"],
});

test("METRO-92 the helper's PATH, NODE_OPTIONS and FAKE_GH are visible only inside run", async () => {
  const saved = process.env["FAKE_GH"];
  try {
    for (const prior of [undefined, "prior-value"]) {
      if (prior === undefined) delete process.env["FAKE_GH"];
      else process.env["FAKE_GH"] = prior;
      const before = snapshot();
      await withFakeGh(() => {
        expect(process.env["NODE_OPTIONS"]).toContain("--require");
        process.env["FAKE_GH"] = "fail";
      });
      expect(snapshot()).toStrictEqual(before);
      await expectRejection(
        withFakeGh(() => {
          process.env["FAKE_GH"] = "silent";
          throw new Error("boom");
        }),
        "boom",
      );
      expect(snapshot()).toStrictEqual(before);
    }
  } finally {
    if (saved === undefined) delete process.env["FAKE_GH"];
    else process.env["FAKE_GH"] = saved;
  }
}, 60000);
