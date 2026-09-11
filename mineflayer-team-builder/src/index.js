#!/usr/bin/env node

require("dotenv").config();

const path = require("path");

const { BotManager } = require("./botManager");
const { buildAssignments } = require("./buildPlanner");
const { loadConfig } = require("./config");
const { createLogger } = require("./logger");
const { loadBuildPlan } = require("./schematicReader");
const { areaBounds, findBuildOrigin, isAutoOriginEnabled } = require("./siteFinder");

const logger = createLogger("cli");

function parseArgs(argv) {
  const args = { config: null, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--config") {
      args.config = argv[index + 1];
      index += 1;
    } else if (token === "--dry-run") {
      args.dryRun = true;
    } else if (token === "--help" || token === "-h") {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log("Cách dùng: npm start -- --config examples/team-build-config.json [--dry-run]");
}

function formatCommand(prefix, command) {
  return `${prefix || "/"}${command}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function teleportTargetForIndex(origin, index) {
  const spacing = 2;
  const columns = 5;
  const row = Math.floor(index / columns);
  const column = index % columns;
  return {
    x: origin.x + (column - Math.floor(columns / 2)) * spacing,
    y: origin.y,
    z: origin.z + row * spacing,
  };
}

function pickPreparationController(connectedBots, scoutBotName, scopedLogger) {
  const preferred = connectedBots.find((entry) => entry.username === scoutBotName);
  if (preferred) {
    return preferred;
  }
  const fallback = connectedBots[0];
  if (fallback) {
    scopedLogger.warn(
      `Không tìm thấy scout bot "${scoutBotName}" trong danh sách đang online. Dùng ${fallback.username} để gửi lệnh chuẩn bị.`
    );
  }
  return fallback;
}

async function runPreparationCommands(config, scoutEntry, connectedBots, plan, buildOrigin, scopedLogger) {
  if (!scoutEntry || !scoutEntry.bot) {
    return;
  }
  const scout = scoutEntry.bot;
  const creativeCommandDelayMs = Math.max(0, Number(config.creativeCommandDelayMs) || 750);

  if (config.setWorldConditions) {
    scout.chat(formatCommand(config.commandPrefix, "time set day"));
    scout.chat(formatCommand(config.commandPrefix, "weather clear"));
    scout.chat(formatCommand(config.commandPrefix, "gamerule doDaylightCycle false"));
  }

  if (config.clearBuildArea) {
    const bounds = areaBounds(buildOrigin, plan.size, Math.max(0, Number(config.buildPadding) || 0));
    const topY = buildOrigin.y + plan.size.height + 1;
    scout.chat(
      formatCommand(
        config.commandPrefix,
        `fill ${bounds.minX} ${buildOrigin.y} ${bounds.minZ} ${bounds.maxX} ${topY} ${bounds.maxZ} air`
      )
    );
  }

  if (config.teleportBotsToOrigin) {
    for (const [index, entry] of connectedBots.entries()) {
      const target = teleportTargetForIndex(buildOrigin, index);
      scout.chat(formatCommand(config.commandPrefix, `tp ${entry.username} ${target.x} ${target.y} ${target.z}`));
      await sleep(100);
    }
  }

  if (config.creativeMode && config.issueCreativeCommands) {
    for (const entry of connectedBots) {
      scout.chat(formatCommand(config.commandPrefix, `gamemode creative ${entry.username}`));
      scopedLogger.info(`Đã gửi lệnh chuyển ${entry.username} sang Creative.`);
      await sleep(creativeCommandDelayMs);
    }
  } else if (config.creativeMode) {
    scopedLogger.info(
      "Lưu ý: creativeMode chỉ giúp bot ưu tiên inventory creative. Nếu bot không đặt block được, trong Minecraft chạy: /gamemode creative @a"
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const config = loadConfig(args.config);
  const plan = loadBuildPlan(config.planFile);
  const planOrigin = plan.origin || { x: 0, y: 0, z: 0 };
  const autoOriginEnabled = isAutoOriginEnabled(config);
  const previewOrigin = autoOriginEnabled ? planOrigin : config.origin || planOrigin;
  let assignments = buildAssignments(plan, config.bots, previewOrigin);

  logger.info(`Đã tải config: ${path.relative(process.cwd(), config.planFile)}`);
  logger.info(`Build plan "${plan.name}" có ${plan.blocks.length} block cho ${assignments.length} bot.`);
  assignments.forEach((assignment) => {
    logger.info(`- ${assignment.bot.username} (${assignment.bot.role || "general"}): ${assignment.blocks.length} block`);
  });

  if (args.dryRun) {
    if (autoOriginEnabled) {
      logger.info("Auto-origin đang bật. Chế độ này cần chạy thật để bot scout quét địa hình và chọn tọa độ.");
      logger.info(
        `Thông tin tìm vị trí: searchRadius=${config.searchRadius}, maxSearchRadius=${config.maxSearchRadius}, requiredFlatness=${config.requiredFlatness}, buildPadding=${config.buildPadding}.`
      );
    }
    logger.info("Dry run hoàn tất. Không kết nối server.");
    return;
  }

  let buildOrigin = previewOrigin;
  let connectedBots = [];
  const scoutBotName = config.scoutBot || config.bots[0].username;
  const scoutBot = config.bots.find((bot) => bot.username === scoutBotName) || config.bots[0];

  if (autoOriginEnabled) {
    const scoutManager = new BotManager({ ...config, origin: previewOrigin }, []);
    logger.info(`Đang kết nối scout bot ${scoutBot.username} để tự tìm vị trí xây...`);
    const scoutEntry = await scoutManager.connectBot(scoutBot);
    buildOrigin = await findBuildOrigin(scoutEntry.bot, config, plan.size, logger);
    logger.info(`Đã chọn build origin tự động: (${buildOrigin.x}, ${buildOrigin.y}, ${buildOrigin.z}).`);
    if (typeof scoutEntry.bot.quit === "function") {
      scoutEntry.bot.quit("Scout phase complete, reconnecting for team build.");
    }
    assignments = buildAssignments(plan, config.bots, buildOrigin);
    const manager = new BotManager({ ...config, origin: buildOrigin, issueCreativeCommandsOnConnect: false }, assignments);
    connectedBots = await manager.connectAll();
    const connectedScout = pickPreparationController(connectedBots, scoutBot.username, logger);
    await runPreparationCommands(config, connectedScout, connectedBots, plan, buildOrigin, logger);
    logger.info("Tất cả bot đã sẵn sàng. Bắt đầu xây dựng.");
    await manager.runBuild(connectedBots);
    logger.info("Đội bot đã hoàn tất build plan.");
    return;
  }

  const manager = new BotManager({ ...config, origin: buildOrigin, issueCreativeCommandsOnConnect: false }, assignments);
  connectedBots = await manager.connectAll();
  const connectedScout = pickPreparationController(connectedBots, scoutBot.username, logger);
  await runPreparationCommands(config, connectedScout, connectedBots, plan, buildOrigin, logger);
  logger.info("Tất cả bot đã sẵn sàng. Bắt đầu xây dựng.");
  await manager.runBuild(connectedBots);
  logger.info("Đội bot đã hoàn tất build plan.");
}

main().catch((error) => {
  logger.error(error.message);
  process.exitCode = 1;
});
