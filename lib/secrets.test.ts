// Run: npm test  (node --test, native TS type-stripping — no framework)
// Round-trips a THROWAWAY key so it never touches Dave's real secrets, and skips
// where no OS credential vault exists (e.g. headless CI / Linux without a keyring).
import { test } from "node:test";
import assert from "node:assert/strict";
import { getSecret, setSecret, deleteSecret, hasSecret } from "./secrets.ts";

const KEY = "__selftest__";

let vaultOk = true;
try {
  setSecret(KEY, "probe");
  deleteSecret(KEY);
} catch {
  vaultOk = false;
}

test(
  "secret set → get → delete round-trips through the OS vault",
  { skip: vaultOk ? false : "no OS credential vault available" },
  () => {
    assert.equal(getSecret(KEY), null); // absent to start
    setSecret(KEY, "s3cr3t-value");
    assert.equal(getSecret(KEY), "s3cr3t-value");
    assert.equal(hasSecret(KEY), true);
    deleteSecret(KEY);
    assert.equal(getSecret(KEY), null); // gone
    assert.equal(hasSecret(KEY), false);
  },
);
