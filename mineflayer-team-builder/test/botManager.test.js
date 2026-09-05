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
