import { test } from "node:test";
import assert from "node:assert/strict";
import { pickUpdate, ASSET } from "./supervisor.mjs";

const assets = [
  { name: ASSET, url: "https://api.github.com/a/1" },
  { name: `${ASSET}.sha256`, url: "https://api.github.com/a/2" },
];

test("installs a release whose tag differs from the running version", () => {
  const u = pickUpdate({ tag_name: "build-42", assets }, "build-41");
  assert.equal(u.tag, "build-42");
  assert.equal(u.zip.url, "https://api.github.com/a/1");
  assert.equal(u.sum.url, "https://api.github.com/a/2");
});

test("a lower tag still installs — that's how deleting a bad release rolls back", () => {
  assert.equal(pickUpdate({ tag_name: "build-40", assets }, "build-41")?.tag, "build-40");
});

test("nothing to do when already current, or the release is incomplete/garbage", () => {
  assert.equal(pickUpdate({ tag_name: "build-41", assets }, "build-41"), null);
  assert.equal(pickUpdate({ tag_name: "build-42", assets: assets.slice(0, 1) }, "build-41"), null);
  assert.equal(pickUpdate({ message: "API rate limit exceeded" }, "build-41"), null);
  assert.equal(pickUpdate(null, "build-41"), null);
});

test("rejects tags that could escape the app folder", () => {
  for (const tag_name of ["..", "../evil", "a/b", "a\\b", ".hidden", ""]) {
    assert.equal(pickUpdate({ tag_name, assets }, "build-41"), null, tag_name);
  }
});
