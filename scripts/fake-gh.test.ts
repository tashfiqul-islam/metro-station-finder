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

test("METRO-92 the helper's PATH, NODE_OPTIONS and FAKE_GH are visible only inside run", async () => {
  const before = {
    PATH: process.env["PATH"],
    NODE_OPTIONS: process.env["NODE_OPTIONS"],
    FAKE_GH: process.env["FAKE_GH"],
  };
  await withFakeGh(() => {
    expect(process.env["NODE_OPTIONS"]).toContain("--require");
    process.env["FAKE_GH"] = "fail";
  });
  expect({
    PATH: process.env["PATH"],
    NODE_OPTIONS: process.env["NODE_OPTIONS"],
    FAKE_GH: process.env["FAKE_GH"],
  }).toEqual(before);
  await expectRejection(
    withFakeGh(() => {
      throw new Error("boom");
    }),
    "boom",
  );
  expect(process.env["NODE_OPTIONS"]).toBe(before.NODE_OPTIONS);
}, 60000);
