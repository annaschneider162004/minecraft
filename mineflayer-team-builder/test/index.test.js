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

    async issueWorldCommand(command) {
      calls.push(["issueWorldCommand", command]);
    }

    setCommandController(entry) {
      this.commandController = entry;
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
    platformOrigin: { x: 0, y: 100, z: 0 },
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
      platformPadding: 20,
      platformExtraHeight: 20,
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
      command: "fill -10 64 -22 33 90 20 air",
    },
    {
      description: "tạo nền build",
      command: "fill -10 63 -22 33 63 20 minecraft:grass_block",
    },
  ]);
});

test("buildPlatformCommands restores the full cleared footprint when old clear mode is also enabled", () => {
  const commands = buildPlatformCommands(
    {
      prepareBuildPlatform: true,
      clearAbovePlatform: true,
      platformPadding: 4,
      platformExtraHeight: 20,
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
    command: "fill 2 64 -10 21 90 8 air",
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

    async issueWorldCommand() {}
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

test("runPreparationCommands logs exact Vietnamese /fill commands", async () => {
  const logs = [];
  const commands = [];
  const manager = {
    async issueWorldCommand(command, logger, options) {
      commands.push({ command, options });
      if (options.logCommand) {
        logger.info(`Đã gửi: /${command}`);
      }
    },
  };

  await require("../src/index").runPreparationCommands(
    manager,
    {
      commandPrefix: "/",
      commandDelayMs: 50,
      placementDelayMs: 700,
      prepareBuildPlatform: true,
      clearAbovePlatform: true,
      platformPadding: 20,
      platformExtraHeight: 20,
      platformBlock: "minecraft:grass_block",
      issueCreativeCommands: false,
      issueWorldCommands: true,
      creativeMode: false,
      setWorldConditions: false,
      teleportBotsToOrigin: false,
      verbose: false,
    },
    { bot: {} },
    [{ username: "Builder_01" }],
    { size: { width: 4, height: 6, length: 3 } },
    { x: 0, y: 100, z: 0 },
    { info(message) { logs.push(message); } }
  );

  assert.equal(logs[0], "Đang tạo nền phẳng tự động bằng /fill...");
  assert.match(logs[1], /^Đã gửi: \/fill .* air$/);
  assert.match(logs[2], /^Đã gửi: \/fill .* minecraft:grass_block$/);
  assert.equal(commands.length, 2);
});

test("executeBuild keeps role assignments anchored to build origin when platformOrigin differs", async () => {
  const origins = [];

  class MockManager {
    constructor(config, assignments) {
      this.config = config;
      this.assignments = assignments;
    }

    async connectAll() {
      return this.assignments.map((assignment) => ({
        ...assignment.bot,
        bot: { username: assignment.bot.username, chat() {} },
        logger: { info() {}, warn() {} },
        mcData: {},
      }));
    }

    setCommandController() {}

    async issueWorldCommand() {}

    async runBuild() {}
  }

  await executeBuild(
    {
      host: "localhost",
      port: 25565,
      auth: "offline",
      version: false,
      autoFindOriginConfigured: true,
      autoFindOrigin: false,
      origin: { x: 10, y: 70, z: -5 },
      platformOrigin: { x: 0, y: 100, z: 0 },
      bots: [{ username: "Builder_01", role: "foundation" }],
      scoutBot: "Builder_01",
      planFile: "/tmp/example_plan.json",
      creativeMode: false,
      issueCreativeCommands: false,
      issueWorldCommands: true,
      setWorldConditions: false,
      teleportBotsToOrigin: false,
      clearBuildArea: false,
      prepareBuildPlatform: true,
      platformPadding: 20,
      platformExtraHeight: 20,
      platformBlock: "minecraft:grass_block",
    },
    {
      name: "Fixed origin test",
      size: { width: 2, height: 3, length: 2 },
      origin: { x: 0, y: 0, z: 0 },
      blocks: [],
    },
    {
      logger: { info() {}, warn() {} },
      BotManagerClass: MockManager,
      buildAssignments: (_plan, bots, origin) => {
        origins.push(origin);
        return bots.map((bot) => ({ bot, blocks: [] }));
      },
    }
  );

  assert.deepEqual(origins, [{ x: 10, y: 70, z: -5 }]);
});
