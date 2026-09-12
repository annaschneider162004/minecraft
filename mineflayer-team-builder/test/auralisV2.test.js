const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { validatePlan } = require("../src/schematicReader");
const { loadConfig } = require("../src/config");

const examplesDir = path.resolve(__dirname, "../examples");
const planPath = path.join(examplesDir, "auralis_v2_team_plan.json");
const configPath = path.join(examplesDir, "auralis_v2_team_config.json");
const requiredStages = [
  "dragon_body",
  "dragon_head",
  "heavenly_gate",
  "city_platform",
  "central_tower",
  "elemental_temples",
  "void_abyss",
  "demon_fortress",
  "decorations",
  "lighting",
];

test("auralis v2 plan is valid and includes all required stages", () => {
  const plan = validatePlan(JSON.parse(fs.readFileSync(planPath, "utf8")));
  assert.equal(plan.size.width, 120);
  assert.equal(plan.size.height, 80);
  assert.equal(plan.size.length, 160);
  assert.ok(plan.blocks.length > 10000);

  const stageCounts = new Map();
  for (const block of plan.blocks) {
    stageCounts.set(block.stage, (stageCounts.get(block.stage) || 0) + 1);
  }

  for (const stage of requiredStages) {
    assert.ok(stageCounts.get(stage) > 0, `Missing stage: ${stage}`);
  }
});

test("auralis v2 blocks use minecraft namespaced block strings", () => {
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const blockPattern = /^minecraft:[a-z0-9_]+(?:\[[^\]]+\])?$/;

  for (const block of plan.blocks) {
    assert.match(block.block, blockPattern);
  }
});

test("auralis v2 config maps 10 bots and points to auralis v2 plan", () => {
  const config = loadConfig(configPath);
  assert.equal(config.autoFindOrigin, false);
  assert.deepEqual(config.origin, { x: 0, y: 100, z: 0 });
  assert.deepEqual(config.platformOrigin, { x: 0, y: 100, z: 0 });
  assert.equal(config.prepareBuildPlatform, true);
  assert.equal(config.issueWorldCommands, true);
  assert.equal(config.placementMode, "commands");
  assert.equal(config.commandDelayMs, 50);
  assert.equal(config.joinBatchSize, 1);
  assert.equal(config.bots.length, 10);
  assert.equal(config.planFile, planPath);

  const stagesFromBots = new Set(config.bots.flatMap((bot) => bot.assignedStages || []));
  for (const stage of requiredStages) {
    assert.ok(stagesFromBots.has(stage), `Missing stage mapping: ${stage}`);
  }
});
