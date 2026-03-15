import { describe, it, expect } from "vitest";
import { composeClasses } from "../compose-classes";

describe("composeClasses", () => {
  it("joins multiple string classes", () => {
    expect(composeClasses("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("filters out null values", () => {
    expect(composeClasses("foo", null, "bar")).toBe("foo bar");
  });

  it("filters out undefined values", () => {
    expect(composeClasses("foo", undefined, "bar")).toBe("foo bar");
  });

  it("filters out false values", () => {
    expect(composeClasses("foo", false, "bar")).toBe("foo bar");
  });

  it("filters out empty strings", () => {
    expect(composeClasses("foo", "", "bar")).toBe("foo bar");
  });

  it("handles all falsy values together", () => {
    expect(composeClasses(null, undefined, false, "", "foo")).toBe("foo");
  });

  it("returns empty string when all values are falsy", () => {
    expect(composeClasses(null, undefined, false)).toBe("");
  });

  it("returns empty string with no arguments", () => {
    expect(composeClasses()).toBe("");
  });

  it("handles a single class", () => {
    expect(composeClasses("foo")).toBe("foo");
  });
});
