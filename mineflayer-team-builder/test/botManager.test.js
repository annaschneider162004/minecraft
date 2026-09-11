const test = require("node:test");
const assert = require("node:assert/strict");

const { BotManager } = require("../src/botManager");

test("connectAll connects bots in configured batches", async () => {
  const assignments = Array.from({ length: 7 }, (_, index) => ({
    bot: { username: `Builder_${String(index + 1).padStart(2, "0")}` },
    blocks: [],
  }));
  const manager = new BotManager({ joinBatchSize: 3, joinBatchDelayMs: 10 }, assignments);
  manager.logger = { info() {} };

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
