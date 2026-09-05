const test = require("node:test");
const assert = require("node:assert/strict");

const { validatePlan } = require("../src/schematicReader");

test("validatePlan accepts non-empty JSON build plans", () => {
  const plan = validatePlan({
    name: "demo",
    size: { width: 1, height: 1, length: 1 },
    blocks: [{ x: 0, y: 0, z: 0, block: "minecraft:stone" }],
  });

  assert.equal(plan.blocks.length, 1);
});

test("validatePlan rejects missing size", () => {
  assert.throws(
    () => validatePlan({ blocks: [{ x: 0, y: 0, z: 0, block: "minecraft:stone" }] }),
    /size\.width/
  );
});

test("validatePlan rejects empty blocks", () => {
  assert.throws(
    () => validatePlan({ size: { width: 1, height: 1, length: 1 }, blocks: [] }),
    /blocks không rỗng/
  );
});

test("validatePlan rejects invalid block entries", () => {
  assert.throws(
    () => validatePlan({ size: { width: 1, height: 1, length: 1 }, blocks: [{ x: "0", y: 0, z: 0, block: 1 }] }),
    /x, y, z và block/
  );
});
