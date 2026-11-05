import { expect, test } from "bun:test";

import { parseErrorEnvelope } from "@metro/contracts";

import { createApp } from "./app";

const html = () =>
  new Response("<!doctype html>", { headers: { "content-type": "text/html; charset=utf-8" } });
const script = () =>
  new Response("console.log(1)", { headers: { "content-type": "text/javascript" } });

function envWith(respond: () => Response): Env {
  return { ASSETS: { fetch: () => Promise.resolve(respond()) } };
}

test("METRO-31 /assets/* passes a real asset through untouched", async () => {
  const response = await createApp().request("/assets/index-abc.js", {}, envWith(script));
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("text/javascript");
  expect(await response.text()).toBe("console.log(1)");
});

test("METRO-31 /assets/* turns the SPA index.html fallback into a 404 envelope", async () => {
  // Static Assets answers a missing file with index.html (200), which _headers would mark immutable.
  const response = await createApp().request("/assets/missing-abc.js", {}, envWith(html));
  expect(response.status).toBe(404);
  expect(parseErrorEnvelope(await response.json()).error.code).toBe("not_found");
});
