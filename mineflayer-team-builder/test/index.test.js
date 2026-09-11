const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const { buildPlatformCommands, executeBuild } = require("../src/index");

test("dry-run with auto origin does not require world access", () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "mf-index-"));
  try {
    const planPath = path.join(tempdir, "plan.json");
    const configPath = path.join(tempdir, "config.json");
    fs.writeFileSync(
      planPath,
      JSON.stringify({
        name: "Dry run test",
        size: { width: 2, height: 3, length: 2 },
        origin: { x: 0, y: 0, z: 0 },
        blocks: [{ x: 0, y: 0, z: 0, block: "stone", role: "foundation" }],
      }),
      "utf8"
    );
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        host: "localhost",
        port: 25565,
        autoFindOrigin: true,
        origin: "auto",
        bots: [{ username: "Builder_01", role: "foundation" }],
        planFile: "./plan.json",
      }),
      "utf8"
    );

    const result = spawnSync(process.execPath, ["src/index.js", "--config", configPath, "--dry-run"], {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Auto-origin đang bật/);
    assert.match(result.stdout, /Dry run hoàn tất/);
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

test("executeBuild keeps scout connected and only connects remaining bots after auto-origin", async () => {
  const calls = [];
  let quitCalled = false;

  class MockManager {
    constructor(config, assignments) {
      this.config = config;
      this.assignments = assignments;
    }

    async connectBot(botConfig) {
      calls.push(["connectBot", botConfig.username]);
      return {
        ...botConfig,
        bot: {
          username: botConfig.username,
          chat() {},
          quit() {
            quitCalled = true;
          },
        },
      };
    }

    async connectBots(botConfigs) {
      calls.push(["connectBots", botConfigs.map((bot) => bot.username)]);
      return botConfigs.map((botConfig) => ({
        ...botConfig,
        bot: {
          username: botConfig.username,
          chat() {},
        },
      }));
    }

    async connectAll() {
      throw new Error("connectAll should not be used in auto-origin mode");
    }

    async runBuild(connectedBots) {
      calls.push(["runBuild", connectedBots.map((entry) => entry.username)]);
    }
  }

  const config = {
    host: "localhost",
    port: 25565,
    auth: "offline",
    version: false,
    autoFindOriginConfigured: true,
    autoFindOrigin: true,
    origin: "auto",
    bots: [
      { username: "Builder_01", role: "foundation" },
      { username: "Builder_02", role: "walls" },
      { username: "Builder_03", role: "roof" },
    ],
    scoutBot: "Builder_01",
    planFile: "/tmp/example_plan.json",
    creativeMode: false,
    issueCreativeCommands: false,
    issueWorldCommands: false,
    setWorldConditions: false,
    teleportBotsToOrigin: false,
    clearBuildArea: false,
    prepareBuildPlatform: false,
  };
  const plan = {
    name: "Auto origin test",
    size: { width: 2, height: 3, length: 2 },
    origin: { x: 0, y: 0, z: 0 },
    blocks: [],
  };
  const buildAssignments = (_plan, bots) => bots.map((bot) => ({ bot, blocks: [] }));

  const result = await executeBuild(config, plan, {
    logger: { info() {}, warn() {} },
    BotManagerClass: MockManager,
    buildAssignments,
    findBuildOrigin: async () => ({ x: 10, y: 70, z: -5 }),
  });

  assert.equal(quitCalled, false);
  assert.deepEqual(calls[0], ["connectBot", "Builder_01"]);
  assert.deepEqual(calls[1], ["connectBots", ["Builder_02", "Builder_03"]]);
  assert.deepEqual(calls[2], ["runBuild", ["Builder_01", "Builder_02", "Builder_03"]]);
  assert.deepEqual(result.buildOrigin, { x: 10, y: 70, z: -5 });
});

test("buildPlatformCommands uses padded bounds above and below origin", () => {
  const commands = buildPlatformCommands(
    {
      prepareBuildPlatform: true,
      clearAbovePlatform: true,
      platformPadding: 8,
      platformBlock: "minecraft:grass_block",
      issueCreativeCommands: true,
      issueWorldCommands: false,
      clearBuildArea: false,
      buildPadding: 6,
    },
    { size: { width: 4, height: 6, length: 3 } },
    { x: 10, y: 64, z: -2 }
  );

  assert.deepEqual(commands, [
    {
      description: "dọn thể tích phía trên nền build",
      command: "fill 2 64 -10 21 71 8 air",
    },
    {
      description: "tạo nền build",
      command: "fill 2 63 -10 21 63 8 minecraft:grass_block",
    },
  ]);
});

test("buildPlatformCommands restores the full cleared footprint when old clear mode is also enabled", () => {
  const commands = buildPlatformCommands(
    {
      prepareBuildPlatform: true,
      clearAbovePlatform: true,
      platformPadding: 4,
      platformBlock: "minecraft:grass_block",
      issueCreativeCommands: true,
      issueWorldCommands: false,
      clearBuildArea: true,
      buildPadding: 8,
    },
    { size: { width: 4, height: 6, length: 3 } },
    { x: 10, y: 64, z: -2 }
  );

  assert.deepEqual(commands[0], {
    description: "dọn khu build cũ",
    command: "fill 2 64 -10 21 71 8 air",
  });
  assert.deepEqual(commands[2], {
    description: "tạo nền build",
    command: "fill 2 63 -10 21 63 8 minecraft:grass_block",
  });
});

test("executeBuild disconnects scout if auto-origin run aborts before build starts", async () => {
  let quitCalled = false;

  class MockManager {
    constructor(config, assignments) {
      this.config = config;
      this.assignments = assignments;
    }

    async connectBot(botConfig) {
      return {
        ...botConfig,
        bot: {
          username: botConfig.username,
          chat() {},
          quit() {
            quitCalled = true;
          },
        },
      };
    }

    async connectBots() {
      throw new Error("remaining bots failed");
    }
  }

  const config = {
    host: "localhost",
    port: 25565,
    auth: "offline",
    version: false,
    autoFindOriginConfigured: true,
    autoFindOrigin: true,
    origin: "auto",
    bots: [
      { username: "Builder_01", role: "foundation" },
      { username: "Builder_02", role: "walls" },
    ],
    scoutBot: "Builder_01",
    planFile: "/tmp/example_plan.json",
    creativeMode: false,
    issueCreativeCommands: false,
    issueWorldCommands: false,
    setWorldConditions: false,
    teleportBotsToOrigin: false,
    clearBuildArea: false,
    prepareBuildPlatform: false,
  };
  const plan = {
    name: "Auto origin abort test",
    size: { width: 2, height: 3, length: 2 },
    origin: { x: 0, y: 0, z: 0 },
    blocks: [],
  };

  await assert.rejects(
    () =>
      executeBuild(config, plan, {
        logger: { info() {}, warn() {} },
        BotManagerClass: MockManager,
        buildAssignments: (_plan, bots) => bots.map((bot) => ({ bot, blocks: [] })),
        findBuildOrigin: async () => ({ x: 10, y: 70, z: -5 }),
      }),
    /remaining bots failed/
  );
  assert.equal(quitCalled, true);
});
