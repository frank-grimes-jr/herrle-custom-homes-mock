// Run: npm test. Parsing of `claude -p --output-format json` (no CLI call).
import { test } from "node:test";
import assert from "node:assert/strict";
import { resultText, SIGN_IN_HINT } from "./claude.ts";

test("returns the answer from a successful run", () => {
  assert.equal(resultText('{"type":"result","is_error":false,"result":"{\\"ok\\":true}"}'), '{"ok":true}');
});

test("an expired or missing sign-in becomes the self-service hint", () => {
  const expired = '{"is_error":true,"api_error_status":401,"result":"Failed to authenticate. API Error: 401 OAuth access token has expired."}';
  assert.throws(() => resultText(expired), { message: SIGN_IN_HINT });
  assert.throws(() => resultText('{"is_error":true,"result":"Not logged in · Please run /login"}'), { message: SIGN_IN_HINT });
});

test("other failures stay distinct from sign-in", () => {
  assert.throws(() => resultText('{"is_error":true,"result":"Overloaded"}'), /claude: Overloaded/);
  assert.throws(() => resultText("not json"), /unexpected output/);
});
