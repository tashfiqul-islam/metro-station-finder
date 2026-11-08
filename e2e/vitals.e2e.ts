import { parseErrorEnvelope, parseWebVitalPayload } from "../packages/contracts/src/index.ts";
import { expect, test } from "./fixtures";
import { expectNoCoordinateInApi, installMapsStub, trackApiRequests } from "./maps-stub";

test.describe("real-user web vitals beacon (METRO-44)", () => {
  test("METRO-44 the built app sends contract-valid, position-free beacons to /api/vitals and the Worker accepts them", async ({
    page,
  }) => {
    const apiRequests = trackApiRequests(page);
    const beacons: { method: string; type: string; body: string; url: string }[] = [];
    const statuses: number[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/vitals") {
        beacons.push({
          method: request.method(),
          type: request.headers()["content-type"] ?? "",
          body: request.postData() ?? "",
          url: request.url(),
        });
      }
    });
    page.on("response", (response) => {
      if (new URL(response.url()).pathname === "/api/vitals") statuses.push(response.status());
    });
    await installMapsStub(page);
    // A query string on the page URL must not travel to the beacon, in the URL, the body or anywhere.
    await page.goto("/?lat=23.87&lng=90.367&q=uttara");
    await expect(
      page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
    ).toBeVisible();
    // web-vitals loads after the load event, and LCP and CLS report when the page is hidden. Hide the
    // page on every poll until both beacons have arrived (a later hide adds no duplicate).
    await expect
      .poll(
        async () => {
          await page.evaluate(() => {
            Object.defineProperty(document, "visibilityState", {
              value: "hidden",
              configurable: true,
            });
            document.dispatchEvent(new Event("visibilitychange"));
          });
          return beacons
            .map((beacon) => parseWebVitalPayload(JSON.parse(beacon.body)).name)
            .toSorted();
        },
        { message: "LCP and CLS beacons" },
      )
      .toEqual(expect.arrayContaining(["LCP", "CLS"]));
    await expect.poll(() => statuses.length).toBe(beacons.length);
    expect(statuses.every((status) => status === 204)).toBe(true);

    for (const beacon of beacons) {
      expect(beacon.method).toBe("POST");
      expect(new URL(beacon.url).search).toBe("");
      expect(beacon.type).toContain("application/json");
      const parsed = parseWebVitalPayload(JSON.parse(beacon.body));
      expect(Object.keys(parsed).toSorted()).toEqual([
        "id",
        "name",
        "navigationType",
        "rating",
        "value",
      ]);
      for (const fragment of ["lat", "lng", "23.87", "90.367", "uttara", "?", "http"]) {
        expect(beacon.body, fragment).not.toContain(fragment);
      }
    }
    expect(apiRequests.some((request) => request.url.endsWith("/api/vitals"))).toBe(true);
    await expectNoCoordinateInApi(page, apiRequests);
  });

  test("METRO-44 the Worker rejects a non-contract beacon with the fixed envelope and a wrong method with 405", async ({
    request,
  }) => {
    const rejected = await request.post("/api/vitals", {
      data: {
        name: "LCP",
        value: 1,
        rating: "good",
        navigationType: "navigate",
        id: "abcdef",
        lat: 23.87,
      },
    });
    expect(rejected.status()).toBe(400);
    expect(parseErrorEnvelope(await rejected.json()).error.code).toBe("invalid_payload");
    const wrongMethod = await request.get("/api/vitals");
    expect(wrongMethod.status()).toBe(405);
    expect(wrongMethod.headers()["allow"]).toBe("POST");
    expect(parseErrorEnvelope(await wrongMethod.json()).error.code).toBe("method_not_allowed");
  });
});
