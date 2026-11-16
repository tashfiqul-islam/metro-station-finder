import { expect, test } from "vitest";

import { createSession } from "./session";

function counter() {
  let made = 0;
  return { make: () => ({ id: (made += 1) }), made: () => made };
}

test("METRO-163 requests in one session share one token, made on first use", () => {
  const { make, made } = counter();
  const session = createSession(make);
  expect(made()).toBe(0);
  const first = session.token();
  expect(session.token()).toBe(first);
  expect(session.token()).toBe(first);
  expect(made()).toBe(1);
});

test("METRO-163 a finished session is never reused: the next token is new", () => {
  const { make } = counter();
  const session = createSession(make);
  const first = session.token();
  session.end();
  const second = session.token();
  expect(second).not.toBe(first);
  expect(second.id).toBe(2);
  session.end();
  session.end();
  expect(session.token().id).toBe(3);
});

test("METRO-163 ending a token that is no longer the open one leaves the open session alone", () => {
  const { make } = counter();
  const session = createSession(make);
  const first = session.token();
  session.end();
  const second = session.token();
  session.end(first);
  expect(session.token()).toBe(second);
  session.end(second);
  expect(session.token()).not.toBe(second);
});

test("METRO-163 ending with no open session makes no token", () => {
  const { make, made } = counter();
  createSession(make).end();
  expect(made()).toBe(0);
});
