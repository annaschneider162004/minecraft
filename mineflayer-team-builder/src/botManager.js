const mineflayer = require("mineflayer");
const { pathfinder } = require("mineflayer-pathfinder");
const minecraftData = require("minecraft-data");
const { Vec3 } = require("vec3");

const { equipBlockItem, normalizeBlockName } = require("./inventory");
const { createLogger } = require("./logger");
const { createMovements, moveNear } = require("./movement");

const SUPPORT_FACES = [
  new Vec3(0, -1, 0),
  new Vec3(1, 0, 0),
  new Vec3(-1, 0, 0),
  new Vec3(0, 0, 1),
  new Vec3(0, 0, -1),
  new Vec3(0, 1, 0),
];
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class BotManager {
  constructor(config, assignments) {
    this.config = config;
    this.assignments = assignments;
    this.logger = createLogger("manager");
  }

  async connectAll() {
    const connected = await Promise.all(this.assignments.map((assignment) => this.connectBot(assignment.bot)));
    return connected;
  }

  async connectBot(botConfig) {
    const logger = createLogger(botConfig.username);
    logger.info(`Đang kết nối tới ${this.config.host}:${this.config.port}...`);

    const bot = mineflayer.createBot({
      host: this.config.host,
      port: this.config.port,
      username: botConfig.username,
      version: this.config.version,
      auth: this.config.auth,
    });
    bot.loadPlugin(pathfinder);

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Bot ${botConfig.username} kết nối quá lâu.`)), this.config.connectTimeoutMs);

      bot.once("spawn", () => {
        clearTimeout(timer);
        try {
          bot.pathfinder.setMovements(createMovements(bot));
        } catch (error) {
          logger.warn(`Không thể khởi tạo pathfinder: ${error.message}`);
        }
        logger.info("Đã spawn vào server.");
        resolve();
      });

      bot.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });

      bot.once("kicked", (reason) => {
        clearTimeout(timer);
        reject(new Error(`Bot bị kick: ${reason}`));
      });
    });

    if (this.config.creativeMode && this.config.issueCreativeCommands) {
      bot.chat(`${this.config.commandPrefix}gamemode creative ${botConfig.username}`);
      await sleep(250);
    } else if (this.config.creativeMode) {
      logger.info("Creative mode đang bật trong config. Nếu bot chưa ở creative, hãy cấp quyền/gamemode thủ công.");
    }

    return { ...botConfig, bot, logger, mcData: minecraftData(bot.version) };
  }

  async runBuild(connectedBots) {
    await Promise.all(
      this.assignments.map((assignment) => {
        const connected = connectedBots.find((entry) => entry.username === assignment.bot.username);
        if (!connected) {
          throw new Error(`Thiếu bot đã kết nối cho ${assignment.bot.username}`);
        }
        return this.runAssignment(connected, assignment.blocks);
      })
    );
  }

  async runAssignment(connected, blocks) {
    const { bot, logger, mcData, role } = connected;
    logger.info(`Nhận ${blocks.length} block cho vai trò ${role || "general"}.`);
    let placed = 0;
    let skipped = 0;
    let failed = 0;

    for (const block of blocks) {
      try {
        const result = await this.placeBlock(bot, mcData, block);
        if (result === "placed") {
          placed += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        logger.warn(`Bỏ qua block ${block.block} tại (${block.x}, ${block.y}, ${block.z}): ${error.message}`);
      }
      await sleep(this.config.placementDelayMs);
    }

    logger.info(`Hoàn tất: placed=${placed}, skipped=${skipped}, failed=${failed}.`);
  }

  findSupportBlock(bot, worldPosition) {
    for (const offset of SUPPORT_FACES) {
      const supportPosition = worldPosition.plus(offset);
      const supportBlock = bot.blockAt(supportPosition);
      if (!supportBlock || normalizeBlockName(supportBlock.name) === "air") {
        continue;
      }
      const faceVector = worldPosition.minus(supportBlock.position);
      const isUnitFace = Math.abs(faceVector.x) + Math.abs(faceVector.y) + Math.abs(faceVector.z) === 1;
      if (isUnitFace) {
        return { supportBlock, faceVector };
      }
    }
    return null;
  }

  async placeBlock(bot, mcData, block) {
    const worldPosition = new Vec3(
      this.config.origin.x + block.x,
      this.config.origin.y + block.y,
      this.config.origin.z + block.z
    );

    const currentBlock = bot.blockAt(worldPosition);
    if (currentBlock && normalizeBlockName(currentBlock.name) === normalizeBlockName(block.block)) {
      return "skipped";
    }
    if (currentBlock && normalizeBlockName(currentBlock.name) !== "air" && !this.config.replaceOccupiedBlocks) {
      return "skipped";
    }

    await moveNear(
      bot,
      { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z },
      this.config.movementTimeoutMs
    );

    const equipped = await equipBlockItem(bot, mcData, block.block, this.config.creativeMode);
    if (!equipped) {
      throw new Error(`Không có vật liệu ${block.block} trong inventory.`);
    }

    const support = this.findSupportBlock(bot, worldPosition);
    if (!support) {
      throw new Error("Không tìm thấy block để đặt bám vào.");
    }

    for (let attempt = 0; attempt <= this.config.maxPlacementRetries; attempt += 1) {
      try {
        await bot.lookAt(worldPosition.plus(new Vec3(0.5, 0.5, 0.5)), true);
        await bot.placeBlock(support.supportBlock, support.faceVector);
        return "placed";
      } catch (error) {
        if (attempt === this.config.maxPlacementRetries) {
          throw error;
        }
        await sleep(250);
      }
    }

    return "skipped";
  }
}

module.exports = {
  BotManager,
};
