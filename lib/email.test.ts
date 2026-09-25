// Run: npm test. Maps Gmail's IMAP login failures to a reason Dave can act on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isBulk, loginProblem } from "./email.ts";

// Shapes as imapflow reports them (responseText is Gmail's own words).
const authFail = (responseText: string) => Object.assign(new Error("Command failed"), { authenticationFailed: true, responseText });

test("regular Google password where an App Password is required", () => {
  const e = authFail("[ALERT] Application-specific password required: https://support.google.com/accounts/answer/185833 (Failure)");
  assert.equal(loginProblem(e), "app_password_required");
});

test("wrong address or App Password", () => {
  assert.equal(loginProblem(authFail("Invalid credentials (Failure)")), "bad_login");
});

test("Google blocked the sign-in until it's confirmed in a browser", () => {
  const e = authFail("[ALERT] Please log in via your web browser: https://support.google.com/mail/accounts/answer/78754 (Failure)");
  assert.equal(loginProblem(e), "google_blocked");
});

test("no network / can't reach Gmail", () => {
  for (const code of ["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET"]) {
    assert.equal(loginProblem(Object.assign(new Error(code), { code })), "unreachable", code);
  }
});

test("anything else stays the generic error", () => {
  assert.equal(loginProblem(new Error("boom")), "error");
  assert.equal(loginProblem(undefined), "error");
});

test("marketing and list mail is bulk; a normal message is not", () => {
  assert.equal(isBulk(new Map([["list-unsubscribe", "<mailto:x@y>"]])), true);
  assert.equal(isBulk(new Map([["list-id", "<crew.example.com>"]])), true);
  assert.equal(isBulk(new Map([["precedence", "bulk"]])), true);
  assert.equal(isBulk(new Map([["subject", "Framing inspection Tuesday"]])), false);
});
