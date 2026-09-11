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

function stringifyReason(reason) {
  if (typeof reason === "string") {
    return reason;
  }
  try {
    return JSON.stringify(reason);
  } catch (error) {
    return String(reason);
  }
}

function isServerFullReason(reason) {
  return stringifyReason(reason).includes("multiplayer.disconnect.server_full");
}

function formatServerFullMessage(username) {
  return [
    `Bot ${username} bị kick vì server đã đầy slot (multiplayer.disconnect.server_full).`,
    "Server dedicated cần max-players lớn hơn tổng số bot + số người chơi thật.",
    "Hãy mở file server.properties của server local/private rồi tăng giới hạn, ví dụ: max-players=50.",
    "Nên kiểm tra các dòng: max-players=50, online-mode=false, gamemode=creative, force-gamemode=true, allow-flight=true, spawn-protection=0.",
  ].join(" ");
}

function worldPositionFromOrigin(origin, block) {
  return new Vec3(origin.x + block.x, origin.y + block.y, origin.z + block.z);
}

function shouldUseCommandFallback(error) {
  const message = String(error?.message || error || "");
  return (
    /Không tìm thấy block để đặt bám vào/i.test(message) ||
    /Took too long to decide path to goal/i.test(message) ||
    /No path to the goal/i.test(message) ||
    /Goal.*path/i.test(message)
  );
}

class BotManager {
  constructor(config, assignments) {
    this.config = config;
    this.assignments = assignments;
    this.logger = createLogger("manager");
    this.commandQueue = Promise.resolve();
    this.commandController = null;
  }

  async connectAll() {
    return this.connectBots(this.assignments.map((assignment) => assignment.bot));
  }

  async connectBots(botConfigs) {
    if (!Array.isArray(botConfigs) || botConfigs.length === 0) {
      return [];
    }
    const batchSize = Math.max(1, Number(this.config.joinBatchSize) || 1);
    const batchDelayMs = Math.max(0, Number(this.config.joinBatchDelayMs) || 0);
    const connected = [];
    const totalBatches = Math.ceil(botConfigs.length / batchSize);
    const failures = [];

    for (let start = 0; start < botConfigs.length; start += batchSize) {
      const batchIndex = Math.floor(start / batchSize);
      const batch = botConfigs.slice(start, start + batchSize);
      this.logger.info(`Đang kết nối batch ${batchIndex + 1}/${totalBatches}...`);
      const batchResults = await Promise.all(
        batch.map(async (botConfig) => {
          try {
            return { ok: true, value: await this.connectBot(botConfig) };
          } catch (error) {
            return { ok: false, botConfig, error };
          }
        })
      );
      for (const result of batchResults) {
        if (result.ok) {
          connected.push(result.value);
        } else {
          failures.push(result);
          this.logger.warn(result.error.message);
        }
      }
      if (batchIndex < totalBatches - 1 && batchDelayMs > 0) {
        await sleep(batchDelayMs);
      }
    }

    const summary = `Tóm tắt kết nối: connected ${connected.length}/${botConfigs.length} bot.`;
    if (failures.length > 0) {
      if (!this.config.allowPartialTeam) {
        throw new Error(`${summary} Hãy sửa lỗi kết nối rồi chạy lại, hoặc bật allowPartialTeam=true nếu muốn tiếp tục với đội chưa đủ bot.`);
      }
      this.logger.warn(`${summary} Tiếp tục vì allowPartialTeam=true.`);
      return connected;
    }

    this.logger.info(summary);
    return connected;
  }

  async connectBot(botConfig) {
    const logger = createLogger(botConfig.username);
    const maxAttempts = Math.max(1, (Number(this.config.connectRetries) || 0) + 1);
    const retryDelayMs = Math.max(0, Number(this.config.connectRetryDelayMs) || 0);
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      logger.info(`Đang kết nối tới ${this.config.host}:${this.config.port} (lần ${attempt}/${maxAttempts})...`);
      try {
        return await this.connectBotOnce(botConfig, logger);
      } catch (error) {
        lastError = error;
        if (isServerFullReason(error?.cause || error?.message || error)) {
          throw new Error(formatServerFullMessage(botConfig.username));
        }
        if (attempt >= maxAttempts) {
          break;
        }
        const currentDelayMs = retryDelayMs * attempt;
        logger.warn(
          `Kết nối ${botConfig.username} thất bại ở lần ${attempt}/${maxAttempts}: ${error.message}. Thử lại sau ${currentDelayMs}ms.`
        );
        if (currentDelayMs > 0) {
          await sleep(currentDelayMs);
        }
      }
    }

    if (isServerFullReason(lastError?.cause || lastError?.message || lastError)) {
      throw new Error(formatServerFullMessage(botConfig.username));
    }
    throw new Error(`Bot ${botConfig.username} kết nối thất bại sau ${maxAttempts} lần: ${lastError?.message || lastError}`);
  }

  async connectBotOnce(botConfig, logger) {
    const bot = mineflayer.createBot({
      host: this.config.host,
      port: this.config.port,
      username: botConfig.username,
      version: this.config.version,
      auth: this.config.auth,
    });
    bot.loadPlugin(pathfinder);

    try {
      await new Promise((resolve, reject) => {
        let settled = false;
        const settle = (callback, value) => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timer);
          bot.removeListener("spawn", onSpawn);
          bot.removeListener("error", onError);
          bot.removeListener("kicked", onKicked);
          callback(value);
        };
        const timer = setTimeout(
          () => settle(reject, new Error(`Bot ${botConfig.username} kết nối quá lâu.`)),
          this.config.connectTimeoutMs
        );

        const onSpawn = () => {
          try {
            bot.pathfinder.setMovements(createMovements(bot));
          } catch (error) {
            logger.warn(`Không thể khởi tạo pathfinder: ${error.message}`);
          }
          logger.info("Đã spawn vào server.");
          settle(resolve);
        };

        const onError = (error) => {
          settle(reject, error);
        };

        const onKicked = (reason) => {
          const message = isServerFullReason(reason)
            ? formatServerFullMessage(botConfig.username)
            : `Bot bị kick: ${stringifyReason(reason)}`;
          const kickedError = new Error(message);
          kickedError.cause = stringifyReason(reason);
          settle(reject, kickedError);
        };

        bot.once("spawn", onSpawn);
        bot.once("error", onError);
        bot.once("kicked", onKicked);
      });

      await this.handleCreativeModeOnConnect(bot, botConfig, logger);

      return { ...botConfig, bot, logger, mcData: minecraftData(bot.version) };
    } catch (error) {
      if (typeof bot.quit === "function") {
        try {
          bot.quit("Kết nối thất bại, đóng bot để thử lại.");
        } catch (quitError) {
          logger.warn(`Không thể đóng bot sau lỗi kết nối: ${quitError.message}`);
        }
      }
      throw error;
    }
  }

  async handleCreativeModeOnConnect(bot, botConfig, logger) {
    if (this.config.creativeMode && this.config.issueCreativeCommands && this.config.issueCreativeCommandsOnConnect !== false) {
      bot.chat(`${this.config.commandPrefix}gamemode creative ${botConfig.username}`);
      logger.info(`Đã gửi lệnh chuyển ${botConfig.username} sang Creative.`);
      await sleep(Math.max(0, Number(this.config.creativeCommandDelayMs) || 750));
      return;
    }
    if (this.config.creativeMode) {
      logger.info(
        "Lưu ý: creativeMode chỉ giúp bot ưu tiên inventory creative. Nếu bot không đặt block được, trong Minecraft chạy: /gamemode creative @a"
      );
    }
  }

  async runBuild(connectedBots) {
    this.commandController =
      this.commandController ||
      connectedBots.find((entry) => entry.username === this.config.scoutBot) ||
      connectedBots[0] ||
      null;
    const activeAssignments = this.assignments.filter((assignment) => {
        const connected = connectedBots.find((entry) => entry.username === assignment.bot.username);
        if (!connected) {
          if (!this.config.allowPartialTeam) {
            throw new Error(`Thiếu bot đã kết nối cho ${assignment.bot.username}`);
          }
          this.logger.warn(`Bỏ qua phần việc của ${assignment.bot.username} vì bot này chưa kết nối được.`);
          return false;
        }
        return true;
      });
    await Promise.all(
      activeAssignments.map((assignment) => {
        const connected = connectedBots.find((entry) => entry.username === assignment.bot.username);
        return this.runAssignment(connected, assignment.blocks);
      })
    );
  }

  canUseWorldCommands() {
    return this.config.issueCreativeCommands === true || this.config.issueWorldCommands === true;
  }

  setCommandController(entry) {
    this.commandController = entry || null;
  }

  getWorldPosition(block) {
    return worldPositionFromOrigin(this.config.origin, block);
  }

  async runAssignment(connected, blocks) {
    const { bot, logger, mcData, role } = connected;
    logger.info(`Nhận ${blocks.length} block cho vai trò ${role || "general"}.`);
    let placed = 0;
    let skipped = 0;
    let failed = 0;

    for (const block of blocks) {
      try {
        const result = await this.placeBlock(bot, mcData, block, logger);
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

  async placeBlockByCommand(block, logger) {
    if (!this.canUseWorldCommands()) {
      throw new Error('placementMode dạng command yêu cầu bật issueCreativeCommands hoặc issueWorldCommands.');
    }
    if (!this.commandController?.bot) {
      throw new Error("Không có controller bot đang online để gửi /setblock.");
    }
    const worldPosition = this.getWorldPosition(block);
    const command = `${this.config.commandPrefix || "/"}setblock ${worldPosition.x} ${worldPosition.y} ${worldPosition.z} ${block.block}`;
    this.commandQueue = this.commandQueue.then(async () => {
      this.commandController.bot.chat(command);
      if (logger) {
        logger.info(`Dùng lệnh build fallback: ${command}`);
      }
      await sleep(Math.max(0, Number(this.config.commandDelayMs) || Number(this.config.placementDelayMs) || 0));
    });
    await this.commandQueue;
    return "placed";
  }

  async placeBlock(bot, mcData, block, logger) {
    const mode = this.config.placementMode || "command-fallback";
    if (mode === "commands") {
      return this.placeBlockByCommand(block, logger);
    }

    const worldPosition = this.getWorldPosition(block);
    try {
      return await this.placeBlockWithMineflayer(bot, mcData, block, worldPosition);
    } catch (error) {
      if (mode === "command-fallback" && this.config.commandBuildFallback !== false && this.canUseWorldCommands() && shouldUseCommandFallback(error)) {
        return this.placeBlockByCommand(block, logger);
      }
      throw error;
    }
  }

  async placeBlockWithMineflayer(bot, mcData, block, worldPosition) {
    await moveNear(
      bot,
      { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z },
      this.config.movementTimeoutMs
    );

    const equipped = await equipBlockItem(bot, mcData, block.block, this.config.creativeMode);
    if (!equipped) {
      throw new Error(`Không có vật liệu ${block.block} trong inventory.`);
    }

    for (let attempt = 0; attempt <= this.config.maxPlacementRetries; attempt += 1) {
      try {
        const currentBlock = bot.blockAt(worldPosition);
        if (currentBlock && normalizeBlockName(currentBlock.name) === normalizeBlockName(block.block)) {
          return "skipped";
        }
        if (currentBlock && normalizeBlockName(currentBlock.name) !== "air") {
          if (!this.config.replaceOccupiedBlocks) {
            return "skipped";
          }
          await bot.dig(currentBlock, true);
          await sleep(150);
        }

        const support = this.findSupportBlock(bot, worldPosition);
        if (!support) {
          throw new Error("Không tìm thấy block để đặt bám vào.");
        }

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
  formatServerFullMessage,
  isServerFullReason,
  worldPositionFromOrigin,
};
