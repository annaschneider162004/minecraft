const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { loadConfig } = require("../src/config");

test("loadConfig applies beginner-friendly local server defaults", () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "mf-config-"));
  try {
    const configPath = path.join(tempdir, "team-config.json");
    const planPath = path.join(tempdir, "team-plan.json");
    fs.writeFileSync(planPath, JSON.stringify({ blocks: [] }), "utf8");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        host: "localhost",
        bots: [{ username: "Builder_01", role: "foundation" }],
        planFile: "./team-plan.json",
      }),
      "utf8"
    );

    const loaded = loadConfig(configPath);
    assert.equal(loaded.joinBatchSize, 1);
    assert.equal(loaded.joinBatchDelayMs, 5000);
    assert.equal(loaded.placementDelayMs, 700);
    assert.equal(loaded.commandDelayMs, 50);
    assert.equal(loaded.placementMode, "commands");
    assert.equal(loaded.commandBuildFallback, true);
    assert.equal(loaded.connectTimeoutMs, 120000);
    assert.equal(loaded.connectRetries, 3);
    assert.equal(loaded.connectRetryDelayMs, 5000);
    assert.equal(loaded.allowPartialTeam, false);
    assert.equal(loaded.prepareBuildPlatform, true);
    assert.equal(loaded.clearAbovePlatform, true);
    assert.equal(loaded.platformBlock, "minecraft:grass_block");
    assert.equal(loaded.platformPadding, 20);
    assert.equal(loaded.platformExtraHeight, 20);
    assert.equal(loaded.autoFindOriginConfigured, false);
    assert.equal(loaded.autoFindOrigin, false);
    assert.deepEqual(loaded.origin, { x: 0, y: 100, z: 0 });
    assert.deepEqual(loaded.platformOrigin, { x: 0, y: 100, z: 0 });
    assert.equal(loaded.planFile, planPath);
    assert.equal(loaded.issueCreativeCommands, false);
    assert.equal(loaded.issueWorldCommands, true);
    assert.equal(loaded.creativeCommandDelayMs, 750);
    assert.equal(loaded.verbose, false);
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

test("loadConfig reads creative and command fallback settings", () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "mf-config-"));
  try {
    const configPath = path.join(tempdir, "team-config.json");
    const planPath = path.join(tempdir, "team-plan.json");
    fs.writeFileSync(planPath, JSON.stringify({ blocks: [] }), "utf8");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        host: "localhost",
        bots: [{ username: "Builder_01", role: "foundation" }],
        planFile: "./team-plan.json",
        creativeMode: true,
        issueCreativeCommands: true,
        issueWorldCommands: true,
        creativeCommandDelayMs: 900,
        commandDelayMs: 450,
        placementMode: "commands",
      }),
      "utf8"
    );

    const loaded = loadConfig(configPath);
    assert.equal(loaded.creativeMode, true);
    assert.equal(loaded.issueCreativeCommands, true);
    assert.equal(loaded.issueWorldCommands, true);
    assert.equal(loaded.creativeCommandDelayMs, 900);
    assert.equal(loaded.commandDelayMs, 450);
    assert.equal(loaded.placementMode, "commands");
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

test("loadConfig supports env override for creative command delay", () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "mf-config-"));
  const previous = process.env.TEAM_BUILDER_CREATIVE_COMMAND_DELAY_MS;
  process.env.TEAM_BUILDER_CREATIVE_COMMAND_DELAY_MS = "880";
  try {
    const configPath = path.join(tempdir, "team-config.json");
    const planPath = path.join(tempdir, "team-plan.json");
    fs.writeFileSync(planPath, JSON.stringify({ blocks: [] }), "utf8");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        host: "localhost",
        bots: [{ username: "Builder_01", role: "foundation" }],
        planFile: "./team-plan.json",
      }),
      "utf8"
    );

    const loaded = loadConfig(configPath);
    assert.equal(loaded.creativeCommandDelayMs, 880);
  } finally {
    if (previous === undefined) {
      delete process.env.TEAM_BUILDER_CREATIVE_COMMAND_DELAY_MS;
    } else {
      process.env.TEAM_BUILDER_CREATIVE_COMMAND_DELAY_MS = previous;
    }
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

test("loadConfig accepts origin auto mode and auto-origin defaults", () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "mf-config-"));
  try {
    const configPath = path.join(tempdir, "team-config.json");
    const planPath = path.join(tempdir, "team-plan.json");
    fs.writeFileSync(planPath, JSON.stringify({ blocks: [] }), "utf8");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        host: "localhost",
        bots: [{ username: "Builder_01", role: "foundation" }],
        planFile: "./team-plan.json",
        origin: "auto",
        autoFindOrigin: true,
      }),
      "utf8"
    );

    const loaded = loadConfig(configPath);
    assert.equal(loaded.autoFindOriginConfigured, true);
    assert.equal(loaded.origin, "auto");
    assert.equal(loaded.autoFindOrigin, true);
    assert.equal(loaded.searchCenter, "spawn");
    assert.equal(loaded.searchRadius, 80);
    assert.equal(loaded.maxSearchRadius, 160);
    assert.equal(loaded.requiredFlatness, 3);
    assert.equal(loaded.clearanceHeight, 20);
    assert.equal(loaded.buildPadding, 6);
    assert.equal(loaded.teleportBotsToOrigin, false);
    assert.equal(loaded.setWorldConditions, false);
    assert.equal(loaded.clearBuildArea, false);
    assert.deepEqual(loaded.platformOrigin, { x: 0, y: 100, z: 0 });
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

test("loadConfig rejects empty bot lists before planning", () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "mf-config-"));
  try {
    const configPath = path.join(tempdir, "team-config.json");
    const planPath = path.join(tempdir, "team-plan.json");
    fs.writeFileSync(planPath, JSON.stringify({ blocks: [] }), "utf8");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        host: "localhost",
        bots: [],
        planFile: "./team-plan.json",
      }),
      "utf8"
    );

    assert.throws(() => loadConfig(configPath), /ít nhất 1 bot/);
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

test("loadConfig keeps explicit numeric origin unchanged", () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "mf-config-"));
  try {
    const configPath = path.join(tempdir, "team-config.json");
    const planPath = path.join(tempdir, "team-plan.json");
    fs.writeFileSync(planPath, JSON.stringify({ blocks: [] }), "utf8");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        host: "localhost",
        bots: [{ username: "Builder_01", role: "foundation" }],
        planFile: "./team-plan.json",
        origin: { x: 123, y: 70, z: -45 },
      }),
      "utf8"
    );

    const loaded = loadConfig(configPath);
    assert.equal(loaded.autoFindOriginConfigured, false);
    assert.deepEqual(loaded.origin, { x: 123, y: 70, z: -45 });
    assert.deepEqual(loaded.platformOrigin, { x: 123, y: 70, z: -45 });
    assert.equal(loaded.autoFindOrigin, false);
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

test("loadConfig keeps explicit platform origin unchanged", () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "mf-config-"));
  try {
    const configPath = path.join(tempdir, "team-config.json");
    const planPath = path.join(tempdir, "team-plan.json");
    fs.writeFileSync(planPath, JSON.stringify({ blocks: [] }), "utf8");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        host: "localhost",
        bots: [{ username: "Builder_01", role: "foundation" }],
        planFile: "./team-plan.json",
        origin: { x: 10, y: 90, z: 10 },
        platformOrigin: { x: 20, y: 100, z: -5 },
      }),
      "utf8"
    );

    const loaded = loadConfig(configPath);
    assert.deepEqual(loaded.origin, { x: 10, y: 90, z: 10 });
    assert.deepEqual(loaded.platformOrigin, { x: 20, y: 100, z: -5 });
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});
