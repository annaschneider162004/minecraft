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
