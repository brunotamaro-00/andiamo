import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getLoginPasswords, isValidLoginPassword } from "./login-passwords";

const ORIGINAL = process.env.LOGIN_PASSWORDS;

function setPasswords(value: string | undefined) {
  if (value === undefined) delete process.env.LOGIN_PASSWORDS;
  else process.env.LOGIN_PASSWORDS = value;
}

beforeEach(() => {
  // secretsMatch() hashes with SESSION_SECRET, which is only optional outside prod.
  process.env.SESSION_SECRET ??= "test-secret";
});

afterEach(() => {
  setPasswords(ORIGINAL);
});

describe("getLoginPasswords", () => {
  it("splits on commas and trims", () => {
    setPasswords(" uno , dos ");
    expect(getLoginPasswords()).toEqual(["uno", "dos"]);
  });

  it("drops empty entries so a trailing comma can't match an empty field", () => {
    setPasswords("uno,,dos,");
    expect(getLoginPasswords()).toEqual(["uno", "dos"]);
  });

  it("is empty when unset", () => {
    setPasswords(undefined);
    expect(getLoginPasswords()).toEqual([]);
  });
});

describe("isValidLoginPassword", () => {
  it("accepts every configured password", () => {
    setPasswords("bruny1003,sandia12#");
    expect(isValidLoginPassword("bruny1003")).toBe(true);
    expect(isValidLoginPassword("sandia12#")).toBe(true);
  });

  it("rejects a wrong password", () => {
    setPasswords("bruny1003,sandia12#");
    expect(isValidLoginPassword("bruny1004")).toBe(false);
    expect(isValidLoginPassword("sandia12")).toBe(false);
  });

  it("rejects the empty string", () => {
    setPasswords("bruny1003");
    expect(isValidLoginPassword("")).toBe(false);
  });

  it("fails closed when the env var is unset or blank", () => {
    setPasswords(undefined);
    expect(isValidLoginPassword("bruny1003")).toBe(false);
    setPasswords("  ,  ");
    expect(isValidLoginPassword("")).toBe(false);
    expect(isValidLoginPassword("anything")).toBe(false);
  });
});
