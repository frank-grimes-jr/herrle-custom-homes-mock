// lib/settings.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.HERRLE_DATA_DIR = mkdtempSync(join(tmpdir(), "herrle-settings-"));
const { getAnalysisSettings, saveAnalysisSettings, DEFAULT_SETTINGS } = await import("./settings.ts");

test("defaults are returned when nothing is saved", () => {
  assert.equal(getAnalysisSettings().reasonModel, "claude-opus-4-8");
  assert.equal(getAnalysisSettings().enrichModel, "claude-haiku-4-5");
  assert.ok(getAnalysisSettings().systemPrompt.length > 0);
});

test("a saved patch overrides only those fields and persists", () => {
  saveAnalysisSettings({ reasonModel: "claude-opus-5-5", windowDays: 45 });
  const s = getAnalysisSettings();
  assert.equal(s.reasonModel, "claude-opus-5-5");
  assert.equal(s.windowDays, 45);
  assert.equal(s.enrichModel, DEFAULT_SETTINGS.enrichModel); // untouched
});
