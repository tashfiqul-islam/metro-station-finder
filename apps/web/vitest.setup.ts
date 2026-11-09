import { act, configure, getConfig } from "@testing-library/react";

type Wrapper = (callback: () => Promise<unknown>) => Promise<unknown>;

/**
 * Makes `findBy*` and `waitFor` return only after React has flushed the effects its DOM change scheduled.
 *
 * Testing Library drains after an async query with `setTimeout(0)`, and React runs passive effects (a focus
 * move, say) in a Scheduler macrotask. Which of the two runs first depends on timer resolution and load, so a
 * test that asserted focus right after `findByRole` saw `<body>` about once in 400 runs on a loaded machine
 * (METRO-125: 12 of 5,220 repeated notice tests, none alone). An empty `act` flushes the pending effects
 * deterministically; it waits on no clock and changes no assertion. A file that has not turned the act
 * environment on is left as it was.
 */
const previous = getConfig();
const wrapped: Wrapper = async (callback) => {
  const result: unknown = await previous.asyncWrapper(callback);
  if (Reflect.get(globalThis, "IS_REACT_ACT_ENVIRONMENT") === true) {
    await act(async () => null);
  }
  return result;
};
configure({ asyncWrapper: wrapped });
