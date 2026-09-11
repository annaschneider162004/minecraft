#!/usr/bin/env node

require("dotenv").config();

const path = require("path");

const { BotManager } = require("./botManager");
const { buildAssignments } = require("./buildPlanner");
const { loadConfig } = require("./config");
const { createLogger } = require("./logger");
const { loadBuildPlan } = require("./schematicReader");
const { areaBounds, canUseWorldCommands, findBuildOrigin, isAutoOriginEnabled } = require("./siteFinder");

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

function buildPlatformCommands(config, plan, buildOrigin) {
  const commands = [];
  const oldClearPadding = Math.max(0, Number(config.buildPadding) || 0);
  if (config.clearBuildArea) {
    const clearBounds = areaBounds(buildOrigin, plan.size, oldClearPadding);
    const clearTopY = buildOrigin.y + plan.size.height - 1;
    commands.push({
      description: "dọn khu build cũ",
      command: `fill ${clearBounds.minX} ${buildOrigin.y} ${clearBounds.minZ} ${clearBounds.maxX} ${clearTopY} ${clearBounds.maxZ} air`,
    });
  }

  if (!(config.prepareBuildPlatform && canUseWorldCommands(config))) {
    return commands;
  }

  const platformPadding = Math.max(0, Number(config.platformPadding) || 0);
  const platformBounds = areaBounds(buildOrigin, plan.size, platformPadding);
  if (config.clearAbovePlatform) {
    commands.push({
      description: "dọn thể tích phía trên nền build",
      command: `fill ${platformBounds.minX} ${buildOrigin.y} ${platformBounds.minZ} ${platformBounds.maxX} ${buildOrigin.y + plan.size.height - 1} ${platformBounds.maxZ} air`,
    });
  }
  commands.push({
    description: "tạo nền build",
    command: `fill ${platformBounds.minX} ${buildOrigin.y - 1} ${platformBounds.minZ} ${platformBounds.maxX} ${buildOrigin.y - 1} ${platformBounds.maxZ} ${config.platformBlock}`,
  });
  return commands;
}

async function runPreparationCommands(config, scoutEntry, connectedBots, plan, buildOrigin, scopedLogger) {
  if (!scoutEntry || !scoutEntry.bot) {
    return;
  }
  const scout = scoutEntry.bot;
  const creativeCommandDelayMs = Math.max(0, Number(config.creativeCommandDelayMs) || 750);
  const commandDelayMs = Math.max(0, Number(config.commandDelayMs) || Number(config.placementDelayMs) || 0);

  if (config.setWorldConditions) {
    const worldCommands = ["time set day", "weather clear", "gamerule doDaylightCycle false"];
    for (const command of worldCommands) {
      scout.chat(formatCommand(config.commandPrefix, command));
      scopedLogger.info(`Đã gửi lệnh chuẩn bị world: ${formatCommand(config.commandPrefix, command)}`);
      await sleep(commandDelayMs);
    }
  }

  const fillCommands = buildPlatformCommands(config, plan, buildOrigin);
  for (const entry of fillCommands) {
    scout.chat(formatCommand(config.commandPrefix, entry.command));
    scopedLogger.info(`Đã gửi lệnh ${entry.description}: ${formatCommand(config.commandPrefix, entry.command)}`);
    await sleep(commandDelayMs);
  }
  if (config.prepareBuildPlatform && canUseWorldCommands(config)) {
    scopedLogger.info("Chuẩn bị nền build chỉ dọn phần thể tích phía trên nền và không đào xuống dưới mặt đất.");
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

function logPlanSummary(plan, assignments, config, scopedLogger) {
  scopedLogger.info(`Đã tải build plan: ${path.relative(process.cwd(), config.planFile)}`);
  scopedLogger.info(`Build plan "${plan.name}" có ${plan.blocks.length} block cho ${assignments.length} bot.`);
  assignments.forEach((assignment) => {
    scopedLogger.info(`- ${assignment.bot.username} (${assignment.bot.role || "general"}): ${assignment.blocks.length} block`);
  });
}

async function executeBuild(config, plan, options = {}) {
  const scopedLogger = options.logger || logger;
  const buildAssignmentsFn = options.buildAssignments || buildAssignments;
  const BotManagerClass = options.BotManagerClass || BotManager;
  const findBuildOriginFn = options.findBuildOrigin || findBuildOrigin;
  const autoOriginEnabled = isAutoOriginEnabled(config);
  const planOrigin = plan.origin || { x: 0, y: 0, z: 0 };
  const previewOrigin = autoOriginEnabled ? planOrigin : config.origin || planOrigin;
  let assignments = buildAssignmentsFn(plan, config.bots, previewOrigin);

  logPlanSummary(plan, assignments, config, scopedLogger);

  let buildOrigin = previewOrigin;
  const scoutBotName = config.scoutBot || config.bots[0].username;
  const scoutBot = config.bots.find((bot) => bot.username === scoutBotName) || config.bots[0];

  if (autoOriginEnabled) {
    const scoutManager = new BotManagerClass({ ...config, origin: previewOrigin, issueCreativeCommandsOnConnect: false }, []);
    scopedLogger.info(`Đang kết nối scout bot ${scoutBot.username} để tự tìm vị trí xây...`);
    const scoutEntry = await scoutManager.connectBot(scoutBot);
    let completed = false;
    try {
      buildOrigin = await findBuildOriginFn(scoutEntry.bot, config, plan.size, scopedLogger);
      scopedLogger.info(`Đã chọn build origin tự động: (${buildOrigin.x}, ${buildOrigin.y}, ${buildOrigin.z}).`);
      assignments = buildAssignmentsFn(plan, config.bots, buildOrigin);
      const manager = new BotManagerClass({ ...config, origin: buildOrigin, issueCreativeCommandsOnConnect: false }, assignments);
      if (typeof manager.setCommandController === "function") {
        manager.setCommandController(scoutEntry);
      }
      const remainingBots = config.bots.filter((bot) => bot.username !== scoutBot.username);
      const remainingConnectedBots = await manager.connectBots(remainingBots);
      const connectedBots = [scoutEntry, ...remainingConnectedBots];
      scopedLogger.info(`Tổng kết đội hình: connected ${connectedBots.length}/${config.bots.length} bot.`);
      const connectedScout = pickPreparationController(connectedBots, scoutBot.username, scopedLogger);
      await runPreparationCommands(config, connectedScout, connectedBots, plan, buildOrigin, scopedLogger);
      scopedLogger.info("Tất cả bot đã sẵn sàng. Bắt đầu xây dựng.");
      await manager.runBuild(connectedBots);
      scopedLogger.info("Đội bot đã hoàn tất build plan.");
      completed = true;
      return { buildOrigin, connectedBots };
    } finally {
      if (!completed && typeof scoutEntry.bot?.quit === "function") {
        scoutEntry.bot.quit("Auto-origin aborted before full team build.");
      }
    }
  }

  const manager = new BotManagerClass({ ...config, origin: buildOrigin, issueCreativeCommandsOnConnect: false }, assignments);
  const connectedBots = await manager.connectAll();
  scopedLogger.info(`Tổng kết đội hình: connected ${connectedBots.length}/${config.bots.length} bot.`);
  const connectedScout = pickPreparationController(connectedBots, scoutBot.username, scopedLogger);
  await runPreparationCommands(config, connectedScout, connectedBots, plan, buildOrigin, scopedLogger);
  scopedLogger.info("Tất cả bot đã sẵn sàng. Bắt đầu xây dựng.");
  await manager.runBuild(connectedBots);
  scopedLogger.info("Đội bot đã hoàn tất build plan.");
  return { buildOrigin, connectedBots };
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  const config = loadConfig(args.config);
  const plan = loadBuildPlan(config.planFile);
  const planOrigin = plan.origin || { x: 0, y: 0, z: 0 };
  const autoOriginEnabled = isAutoOriginEnabled(config);
  const previewOrigin = autoOriginEnabled ? planOrigin : config.origin || planOrigin;
  const assignments = buildAssignments(plan, config.bots, previewOrigin);

  if (args.dryRun) {
    logPlanSummary(plan, assignments, config, logger);
    if (autoOriginEnabled) {
      logger.info("Auto-origin đang bật. Chế độ này cần chạy thật để bot scout quét địa hình và chọn tọa độ.");
      logger.info(
        `Thông tin tìm vị trí: searchRadius=${config.searchRadius}, maxSearchRadius=${config.maxSearchRadius}, requiredFlatness=${config.requiredFlatness}, buildPadding=${config.buildPadding}.`
      );
    }
    logger.info("Dry run hoàn tất. Không kết nối server.");
    return;
  }

  await executeBuild(config, plan, { logger });
}

module.exports = {
  buildPlatformCommands,
  executeBuild,
  formatCommand,
  main,
  parseArgs,
  pickPreparationController,
  runPreparationCommands,
  teleportTargetForIndex,
};

if (require.main === module) {
  main().catch((error) => {
    logger.error(error.message);
    process.exitCode = 1;
  });
}
