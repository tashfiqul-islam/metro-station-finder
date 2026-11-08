import { parseErrorEnvelope } from "../packages/contracts/src/index.ts";
import { expect, test } from "./fixtures";
import { installMapsStub } from "./maps-stub";

test.describe("API through the real runtime", () => {
  test("FND-T3 every /api route returns a schema-valid 404 envelope (the API has no routes)", async ({
    request,
  }) => {
    for (const path of ["/api/unknown", "/api/nearest"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
      expect(parseErrorEnvelope(await response.json()).error.code, path).toBe("not_found");
    }
  });

  test("FND-T3 a method other than GET on /assets/* returns a 405 envelope", async ({
    request,
  }) => {
    const response = await request.post("/assets/anything.js");
    expect(response.status()).toBe(405);
    expect(response.headers()["allow"]).toBe("GET, HEAD");
    expect(parseErrorEnvelope(await response.json()).error.code).toBe("method_not_allowed");
  });
});

test.describe("page", () => {
  test("FND-T3 / shows the nearest-station slice with a title, icon and no failed requests", async ({
    page,
  }) => {
    const failed: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
    });
    await installMapsStub(page);
    await page.goto("/");
    await expect(page).toHaveTitle("Nearest Metro station");
    await expect(
      page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
    ).toBeVisible();
    expect((await page.request.get("/favicon.svg")).status()).toBe(200);
    expect(failed).toEqual([]);
  });

  test("FND-T3 a deep link serves the SPA shell and shows the slice", async ({ page }) => {
    await installMapsStub(page);
    const response = await page.goto("/deep/link");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
    ).toBeVisible();
  });
});
