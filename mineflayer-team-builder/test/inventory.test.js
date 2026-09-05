const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeBlockName } = require("../src/inventory");

test("normalizeBlockName strips namespace and states", () => {
  assert.equal(normalizeBlockName("minecraft:dark_oak_log[axis=y]"), "dark_oak_log");
  assert.equal(normalizeBlockName("minecraft:stone_bricks"), "stone_bricks");
  assert.equal(normalizeBlockName("lantern"), "lantern");
});
