const test = require("node:test");
const assert = require("node:assert/strict");

const { buildAssignments, filterAssignmentsByStage, resolveStageOrder } = require("../src/buildPlanner");

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

test("buildAssignments falls back to round robin when roles are missing", () => {
  const plan = {
    size: { width: 4, height: 2, length: 4 },
    blocks: [
      { x: 0, y: 0, z: 0, block: "minecraft:stone" },
      { x: 1, y: 0, z: 0, block: "minecraft:stone" },
      { x: 2, y: 0, z: 0, block: "minecraft:stone" },
    ],
  };
  const bots = [
    { username: "Bot_A" },
    { username: "Bot_B" },
  ];

  const assignments = buildAssignments(plan, bots, { x: 0, y: 64, z: 0 });
  assert.equal(assignments[0].blocks.length, 2);
  assert.equal(assignments[1].blocks.length, 1);
});

test("buildAssignments can match assignedStages when bot roles are grouped", () => {
  const plan = {
    size: { width: 4, height: 4, length: 4 },
    blocks: [
      { x: 0, y: 0, z: 0, block: "minecraft:stone", stage: "foundation", role: "foundation" },
      { x: 1, y: 1, z: 0, block: "minecraft:spruce_planks", stage: "walls", role: "walls" },
      { x: 2, y: 3, z: 0, block: "minecraft:lantern", stage: "decorations", role: "decorations" },
    ],
  };
  const bots = [
    { username: "Builder_01", role: "foundation", assignedStages: ["foundation"] },
    { username: "Builder_02", role: "structure", assignedStages: ["walls", "towers"] },
    { username: "Builder_03", role: "detail", assignedStages: ["roof", "secret_room", "decorations"] },
  ];

  const assignments = buildAssignments(plan, bots, { x: 0, y: 64, z: 0 });
  assert.equal(assignments[0].blocks.length, 1);
  assert.equal(assignments[1].blocks[0].stage, "walls");
  assert.equal(assignments[2].blocks[0].stage, "decorations");
});

test("resolveStageOrder keeps requested order and appends remaining plan stages", () => {
  const plan = {
    blocks: [
      { stage: "dragon_body" },
      { stage: "dragon_head" },
      { stage: "lighting" },
      { stage: "decorations" },
    ],
  };

  assert.deepEqual(resolveStageOrder(plan, ["lighting", "dragon_body"]), [
    "lighting",
    "dragon_body",
    "dragon_head",
    "decorations",
  ]);
});

test("filterAssignmentsByStage keeps only blocks for the requested stage", () => {
  const assignments = [
    {
      bot: { username: "Builder_01" },
      blocks: [
        { stage: "dragon_body", block: "minecraft:stone" },
        { stage: "lighting", block: "minecraft:sea_lantern" },
      ],
    },
    {
      bot: { username: "Builder_02" },
      blocks: [{ stage: "dragon_body", block: "minecraft:stone_bricks" }],
    },
  ];

  const filtered = filterAssignmentsByStage(assignments, "lighting");
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].bot.username, "Builder_01");
  assert.deepEqual(filtered[0].blocks, [{ stage: "lighting", block: "minecraft:sea_lantern" }]);
});
