const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");

const mineflayer = require("mineflayer");
const {
  BotManager,
  formatServerFullMessage,
  formatWorldCommandPermissionMessage,
  worldPositionFromOrigin,
} = require("../src/botManager");

function createFakeConnectingBot(onCreate) {
  const bot = new EventEmitter();
  bot.version = "1.20.1";
  bot.pathfinder = { setMovements() {} };
  bot.loadPlugin = () => {};
  bot.chat = () => {};
  bot.quit = () => {};
  setImmediate(() => onCreate(bot));
  return bot;
}

test("connectAll connects bots in configured batches", async () => {
  const assignments = Array.from({ length: 7 }, (_, index) => ({
    bot: { username: `Builder_${String(index + 1).padStart(2, "0")}` },
    blocks: [],
  }));
  const manager = new BotManager({ joinBatchSize: 3, joinBatchDelayMs: 10 }, assignments);
  manager.logger = { info() {}, warn() {} };

  let active = 0;
  let maxActive = 0;
  manager.connectBot = async (botConfig) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 20));
    active -= 1;
    return { ...botConfig };
  };

  const connected = await manager.connectAll();
  assert.equal(connected.length, 7);
  assert.equal(maxActive, 3);
});

test("connectBot retries after an initial connection failure", async () => {
  const originalCreateBot = mineflayer.createBot;
  let attempts = 0;
  try {
    mineflayer.createBot = () => {
      attempts += 1;
      return createFakeConnectingBot((bot) => {
        if (attempts === 1) {
          bot.emit("error", new Error("ECONNRESET"));
          return;
        }
        bot.emit("spawn");
      });
    };

    const manager = new BotManager({
      host: "localhost",
      port: 25565,
      auth: "offline",
      version: false,
      connectTimeoutMs: 100,
      connectRetries: 2,
      connectRetryDelayMs: 0,
      creativeMode: false,
    }, []);
    manager.handleCreativeModeOnConnect = async () => {};

    const connected = await manager.connectBot({ username: "Builder_01" });
    assert.equal(connected.username, "Builder_01");
    assert.equal(attempts, 2);
  } finally {
    mineflayer.createBot = originalCreateBot;
  }
});

test("server_full error explains how to fix server.properties", async () => {
  const originalCreateBot = mineflayer.createBot;
  let attempts = 0;
  try {
    mineflayer.createBot = () => {
      attempts += 1;
      return (
      createFakeConnectingBot((bot) => {
        bot.emit("kicked", { translate: "multiplayer.disconnect.server_full" });
      })
      );
    };

    const manager = new BotManager({
      host: "localhost",
      port: 25565,
      auth: "offline",
      version: false,
      connectTimeoutMs: 100,
      connectRetries: 0,
      connectRetryDelayMs: 0,
      creativeMode: false,
    }, []);
    manager.handleCreativeModeOnConnect = async () => {};

    await assert.rejects(
      () => manager.connectBot({ username: "Builder_08" }),
      /server\.properties|max-players=50|tổng số bot \+ số người chơi/
    );
    assert.equal(attempts, 1);
  } finally {
    mineflayer.createBot = originalCreateBot;
  }
});

test("handleCreativeModeOnConnect sends gamemode command when enabled", async () => {
  const manager = new BotManager({
    creativeMode: true,
    issueCreativeCommands: true,
    commandPrefix: "/",
    creativeCommandDelayMs: 0,
  }, []);
  const chats = [];
  const logs = [];
  const bot = { chat(message) { chats.push(message); } };
  const logger = { info(message) { logs.push(message); } };

  await manager.handleCreativeModeOnConnect(bot, { username: "Builder_01" }, logger);

  assert.deepEqual(chats, ["/gamemode creative Builder_01"]);
  assert.match(logs[0], /Đã gửi lệnh chuyển Builder_01 sang Creative/);
});

test("handleCreativeModeOnConnect respects non-zero creative command delay", async () => {
  const manager = new BotManager({
    creativeMode: true,
    issueCreativeCommands: true,
    commandPrefix: "/",
    creativeCommandDelayMs: 5,
  }, []);
  const bot = { chat() {} };
  const logger = { info() {} };
  const startedAt = Date.now();

  await manager.handleCreativeModeOnConnect(bot, { username: "Builder_01" }, logger);

  assert.ok(Date.now() - startedAt >= 4);
});

test("handleCreativeModeOnConnect logs clear manual command note when disabled", async () => {
  const manager = new BotManager({
    creativeMode: true,
    issueCreativeCommands: false,
    commandPrefix: "/",
    creativeCommandDelayMs: 0,
  }, []);
  const chats = [];
  const logs = [];
  const bot = { chat(message) { chats.push(message); } };
  const logger = { info(message) { logs.push(message); } };

  await manager.handleCreativeModeOnConnect(bot, { username: "Builder_01" }, logger);

  assert.deepEqual(chats, []);
  assert.match(logs[0], /\/gamemode creative @a/);
});

test("worldPositionFromOrigin adds origin offsets for command placement", () => {
  const position = worldPositionFromOrigin({ x: 696, y: 81, z: -163 }, { x: 2, y: 5, z: -4 });
  assert.deepEqual({ x: position.x, y: position.y, z: position.z }, { x: 698, y: 86, z: -167 });
});

test("commands mode places blocks by /setblock without calling mineflayer placement", async () => {
  const manager = new BotManager({
    origin: { x: 696, y: 81, z: -163 },
    placementMode: "commands",
    issueWorldCommands: true,
    issueCreativeCommands: false,
    commandPrefix: "/",
    commandDelayMs: 0,
    verbose: false,
  }, []);
  const chats = [];
  manager.commandController = {
    username: "Builder_01",
    bot: Object.assign(new EventEmitter(), {
      chat(message) {
        chats.push(message);
      },
    }),
  };
  manager.placeBlockWithMineflayer = async () => {
    throw new Error("mineflayer placement should not be used");
  };

  const result = await manager.placeBlock({ blockAt() {} }, {}, { x: 2, y: 5, z: -4, block: "minecraft:stone" }, { info() {} });

  assert.equal(result, "placed");
  assert.deepEqual(chats, ["/setblock 698 86 -167 minecraft:stone"]);
});

test("commands mode surfaces a clear Vietnamese permission error", async () => {
  const manager = new BotManager({
    origin: { x: 0, y: 100, z: 0 },
    placementMode: "commands",
    issueWorldCommands: true,
    issueCreativeCommands: false,
    commandPrefix: "/",
    commandDelayMs: 0,
  }, []);
  manager.commandController = {
    username: "Builder_01",
    bot: Object.assign(new EventEmitter(), {
      chat() {
        setImmediate(() => this.emit("messagestr", "You do not have permission to perform this command"));
      },
    }),
  };

  await assert.rejects(
    () => manager.placeBlockByCommand({ x: 0, y: 0, z: 0, block: "minecraft:stone" }, { info() {} }),
    /op Builder_01|gamemode=creative|force-gamemode=true|online-mode=false|max-players=50/
  );
});

test("formatServerFullMessage includes dedicated server guidance", () => {
  const message = formatServerFullMessage("Builder_08");
  assert.match(message, /server\.properties/);
  assert.match(message, /max-players=50/);
  assert.match(message, /Builder_08/);
});

test("formatWorldCommandPermissionMessage includes local server command guidance", () => {
  const message = formatWorldCommandPermissionMessage("Builder_01");
  assert.match(message, /op Builder_01/);
  assert.match(message, /gamemode=creative/);
  assert.match(message, /force-gamemode=true/);
  assert.match(message, /online-mode=false/);
  assert.match(message, /max-players=50/);
});
