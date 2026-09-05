const { Movements, goals } = require("mineflayer-pathfinder");
const { Vec3 } = require("vec3");
const minecraftData = require("minecraft-data");

function createMovements(bot) {
  const mcData = minecraftData(bot.version);
  const movement = new Movements(bot, mcData);
  movement.allowParkour = false;
  movement.canDig = false;
  return movement;
}

async function moveNear(bot, position, timeoutMs) {
  const target = new Vec3(position.x, position.y, position.z);
  const goal = new goals.GoalNear(target.x, target.y, target.z, 2);
  await Promise.race([
    bot.pathfinder.goto(goal),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Di chuyển quá thời gian cho phép.")), timeoutMs)),
  ]);
}

module.exports = {
  createMovements,
  moveNear,
};
