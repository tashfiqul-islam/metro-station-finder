import { parseErrorEnvelope, parseScaffoldStatus } from "../packages/contracts/src/index.ts";
import { expect, test } from "./fixtures";

test.describe("API through the real runtime", () => {
  test("FND-T3 GET /api/scaffold/status returns a schema-valid body", async ({ request }) => {
    const response = await request.get("/api/scaffold/status");
    expect(response.status()).toBe(200);
    expect(parseScaffoldStatus(await response.json())).toEqual({
      kind: "synthetic-scaffold",
      ready: true,
    });
  });

  test("FND-T3 unknown /api routes return a schema-valid 404 envelope", async ({ request }) => {
    const response = await request.get("/api/unknown");
    expect(response.status()).toBe(404);
    expect(parseErrorEnvelope(await response.json()).error.code).toBe("not_found");
  });

  test("FND-T3 other methods on the status route return a 405 envelope", async ({ request }) => {
    const response = await request.post("/api/scaffold/status");
    expect(response.status()).toBe(405);
    expect(response.headers()["allow"]).toBe("GET, HEAD");
    expect(parseErrorEnvelope(await response.json()).error.code).toBe("method_not_allowed");
  });
});

test.describe("page", () => {
  test("FND-T3 shows the validated status with a title, icon and no failed requests", async ({
    page,
  }) => {
    const failed: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
    });
    await page.goto("/");
    await expect(page).toHaveTitle("Metro scaffold");
    await expect(page.getByRole("heading", { name: "Metro scaffold", exact: true })).toBeVisible();
    const output = page.getByLabel("Scaffold status");
    await expect(output).toBeVisible();
    expect(parseScaffoldStatus(JSON.parse(await output.innerText()))).toEqual({
      kind: "synthetic-scaffold",
      ready: true,
    });
    expect((await page.request.get("/favicon.svg")).status()).toBe(200);
    expect(failed).toEqual([]);
  });

  test("FND-T3 a deep link serves the SPA and shows the success state", async ({ page }) => {
    const response = await page.goto("/deep/link");
    expect(response?.status()).toBe(200);
    await expect(page.getByLabel("Scaffold status")).toBeVisible();
  });

  test.describe("when the status request fails", () => {
    test.use({ allowedConsoleError: /Failed to load resource.*status of 500/ });

    test("FND-T3 an intercepted 500 shows the error state with role=alert", async ({ page }) => {
      await page.route("**/api/scaffold/status", (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "internal_error", message: "Internal server error" },
          }),
        }),
      );
      await page.goto("/");
      await expect(page.getByRole("alert")).toContainText("unavailable");
      await expect(page.getByLabel("Scaffold status")).toHaveCount(0);
    });
  });
});
