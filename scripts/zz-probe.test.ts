test("p", () => {
  expect(1).toBe(1);
  jest.spyOn(Math, "random");
});
