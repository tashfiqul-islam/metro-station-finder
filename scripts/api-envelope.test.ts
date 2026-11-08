import { assertNotFoundEnvelope, envelopeProblem } from "./api-envelope.ts";
import { expectRejection } from "./test-support";

const BODY = JSON.stringify({ error: { code: "not_found", message: "No such API route" } });
const ID = { "x-request-id": "abcdefgh" };

function response(status: number, body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers });
}

test("METRO-44 a 404 with the envelope and a request id has no problem", async () => {
  expect(await envelopeProblem(response(404, BODY, ID))).toBeUndefined();
  await assertNotFoundEnvelope(response(404, BODY, ID));
});

test("METRO-44 each broken observation has its own problem and message", async () => {
  expect(await envelopeProblem(response(200, BODY, ID))).toBe("status");
  expect(await envelopeProblem(response(404, '{"x":1}', ID))).toBe("envelope");
  expect(await envelopeProblem(response(404, "not json", ID))).toBe("envelope");
  expect(await envelopeProblem(response(404, BODY))).toBe("request-id");
  await expectRejection(assertNotFoundEnvelope(response(200, BODY, ID)), "returned 200, not 404");
  await expectRejection(
    assertNotFoundEnvelope(response(404, "{}", ID)),
    "did not return the error envelope",
  );
  await expectRejection(assertNotFoundEnvelope(response(404, BODY)), "no x-request-id");
});

test("METRO-44 an envelope failure never repeats the body", async () => {
  const seen = await assertNotFoundEnvelope(response(404, '{"secret-marker":1}', ID)).then(
    () => "",
    (error: unknown) => String(error),
  );
  expect(seen).toContain("error envelope");
  expect(seen).not.toContain("secret-marker");
});
