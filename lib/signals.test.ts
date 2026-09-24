// lib/signals.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.HERRLE_DATA_DIR = mkdtempSync(join(tmpdir(), "herrle-signals-"));
const { validateFindings, saveFindings, dismiss, visibleFindings } = await import("./signals.ts");

const allowed = new Set(["m1", "m2"]);

test("drops findings that cite an id not in the bundle", () => {
  const raw = {
    findings: [
      { severity: "watch", domain: "clients", title: "Real", detail: "d", confidence: "high",
        provenance: [{ id: "m1", label: "email" }] },
      { severity: "escalate", domain: "clients", title: "Hallucinated", detail: "d", confidence: "high",
        provenance: [{ id: "ghost", label: "made up" }] },
    ],
  };
  const out = validateFindings(raw, allowed);
  assert.equal(out.length, 1);
  assert.equal(out[0].title, "Real");
  assert.ok(out[0].signature.length > 0);
});

test("coerces bad severity/confidence to safe values", () => {
  const out = validateFindings(
    { findings: [{ severity: "nonsense", title: "X", detail: "d", confidence: "bogus", provenance: [{ id: "m1", label: "e" }] }] },
    allowed,
  );
  assert.equal(out[0].severity, "watch");
  assert.equal(out[0].confidence, "medium");
});

test("dismiss hides a finding by signature across reloads", () => {
  const out = validateFindings(
    { findings: [{ severity: "watch", domain: "clients", title: "Hide me", detail: "d", confidence: "high", provenance: [{ id: "m2", label: "e" }] }] },
    allowed,
  );
  saveFindings(out);
  assert.equal(visibleFindings().length, 1);
  dismiss(out[0].signature);
  assert.equal(visibleFindings().length, 0);
});
