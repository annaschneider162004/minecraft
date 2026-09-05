const test = require("node:test");
const assert = require("node:assert/strict");

const { buildAssignments } = require("../src/buildPlanner");

test("buildAssignments groups by role and falls back for unmatched roles", () => {
  const plan = {
    size: { width: 3, height: 3, length: 3 },
    blocks: [
      { x: 0, y: 0, z: 0, block: "minecraft:stone_bricks", role: "foundation" },
      { x: 0, y: 1, z: 0, block: "minecraft:spruce_planks", role: "walls" },
      { x: 1, y: 1, z: 0, block: "minecraft:lantern", role: "decorations" },
    ],
  };
  const bots = [
    { username: "Builder_Mason", role: "foundation" },
    { username: "Builder_Carpenter", role: "walls" },
  ];

  const assignments = buildAssignments(plan, bots, { x: 0, y: 64, z: 0 });
  assert.equal(assignments.length, 2);
  assert.equal(assignments[0].blocks[0].role, "foundation");
  assert.equal(assignments[1].blocks[0].role, "walls");
  assert.equal(assignments[0].blocks.length + assignments[1].blocks.length, 3);
});
