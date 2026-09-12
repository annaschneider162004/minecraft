#!/usr/bin/env node

require("dotenv").config();

const path = require("path");

const { BotManager } = require("./botManager");
const { buildAssignments, filterAssignmentsByStage, resolveStageOrder } = require("./buildPlanner");
const { loadConfig } = require("./config");
const { createLogger } = require("./logger");
const { loadBuildPlan } = require("./schematicReader");
const { areaBounds, canUseWorldCommands, findBuildOrigin, isAutoOriginEnabled, resolvePlatformOrigin } = require("./siteFinder");

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

function formatCoordinate(value) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

function stageProgressLabel(index, total) {
  return `phase ${index + 1}/${total}`;
}

function getStageBlocks(plan, stage) {
  return plan.blocks.filter((block) => block.stage === stage);
}

function calculateStageCenter(stageBlocks, origin) {
  if (!Array.isArray(stageBlocks) || stageBlocks.length === 0) {
    throw new Error("Không thể tính tâm stage vì stage không có block.");
  }
  const bounds = stageBlocks.reduce(
    (current, block) => ({
      minX: Math.min(current.minX, block.x),
      maxX: Math.max(current.maxX, block.x),
      minY: Math.min(current.minY, block.y),
      maxY: Math.max(current.maxY, block.y),
      minZ: Math.min(current.minZ, block.z),
      maxZ: Math.max(current.maxZ, block.z),
    }),
    {
      minX: stageBlocks[0].x,
      maxX: stageBlocks[0].x,
      minY: stageBlocks[0].y,
      maxY: stageBlocks[0].y,
      minZ: stageBlocks[0].z,
      maxZ: stageBlocks[0].z,
    }
  );
  return {
    x: origin.x + (bounds.minX + bounds.maxX) / 2 + 0.5,
    y: origin.y + (bounds.minY + bounds.maxY) / 2 + 0.5,
    z: origin.z + (bounds.minZ + bounds.maxZ) / 2 + 0.5,
  };
}

function calculateLookAngles(from, target) {
  const deltaX = target.x - from.x;
  const deltaY = target.y - from.y;
  const deltaZ = target.z - from.z;
  const horizontal = Math.sqrt(deltaX ** 2 + deltaZ ** 2) || 1;
  return {
    yaw: -Math.atan2(deltaX, deltaZ) * (180 / Math.PI),
    pitch: -Math.atan2(deltaY, horizontal) * (180 / Math.PI),
  };
}

function createCameraOrbitCommand(cameraPlayer, stageCenter, options = {}) {
  const radius = Math.max(1, Number(options.radius) || 12);
  const height = Number(options.height) || 8;
  const stepIndex = Math.max(0, Number(options.stepIndex) || 0);
  const totalSteps = Math.max(1, Number(options.totalSteps) || 12);
  const angle = (Math.PI * 2 * stepIndex) / totalSteps;
  const position = {
    x: stageCenter.x + Math.cos(angle) * radius,
    y: stageCenter.y + height,
    z: stageCenter.z + Math.sin(angle) * radius,
  };
  const { yaw, pitch } = calculateLookAngles(position, stageCenter);
  return `tp ${cameraPlayer} ${formatCoordinate(position.x)} ${formatCoordinate(position.y)} ${formatCoordinate(position.z)} ${formatCoordinate(yaw)} ${formatCoordinate(pitch)}`;
}

function createOfflineCameraError(cameraPlayer, message) {
  const error = new Error(`Camera player ${cameraPlayer} hiện không online hoặc server không tìm thấy người chơi này.`);
  error.cameraPlayerOffline = true;
  error.chatMessage = message;
  return error;
}

function isMissingPlayerMessage(message) {
  return (
    /no entity was found/i.test(message) ||
    /no player was found/i.test(message) ||
    /can't find player/i.test(message) ||
    /player not found/i.test(message)
  );
}

function createCameraErrorMatcher(cameraPlayer) {
  return (message) => (isMissingPlayerMessage(message) ? createOfflineCameraError(cameraPlayer, message) : null);
}

async function issueCameraCommand(manager, config, command, scopedLogger) {
  await manager.issueWorldCommand(command, scopedLogger, {
    delayMs: Math.max(0, Number(config.commandDelayMs) || Number(config.placementDelayMs) || 0),
    logCommand: config.verbose === true,
    errorMatcher: createCameraErrorMatcher(config.cameraPlayer),
  });
}

async function prepareCamera(manager, config, scopedLogger) {
  if (!config.cinematicMode || !config.cameraPlayer) {
    return true;
  }
  try {
    await issueCameraCommand(manager, config, `gamemode ${config.cameraGamemode} ${config.cameraPlayer}`, scopedLogger);
    scopedLogger.info(`Đã chuyển camera ${config.cameraPlayer} sang chế độ ${config.cameraGamemode}.`);
    return true;
  } catch (error) {
    if (error?.cameraPlayerOffline) {
      scopedLogger.warn(
        `Cảnh báo: không tìm thấy camera player "${config.cameraPlayer}" trong server. Tiếp tục build không có camera orbit.`
      );
      return false;
    }
    throw error;
  }
}

async function gatherBotsAroundStage(manager, config, connectedBots, stageCenter, scopedLogger) {
  const anchor = {
    x: Math.round(stageCenter.x),
    y: Math.round(stageCenter.y),
    z: Math.round(stageCenter.z),
  };
  for (const [index, entry] of connectedBots.entries()) {
    const target = teleportTargetForIndex(anchor, index);
    await manager.issueWorldCommand(`tp ${entry.username} ${target.x} ${target.y} ${target.z}`, scopedLogger, {
      delayMs: 100,
      logCommand: config.verbose === true,
    });
  }
}

async function gatherBotsAroundCamera(manager, config, connectedBots, scopedLogger) {
  for (const entry of connectedBots) {
    await manager.issueWorldCommand(`tp ${entry.username} ${config.cameraPlayer}`, scopedLogger, {
      delayMs: 100,
      logCommand: config.verbose === true,
      errorMatcher: createCameraErrorMatcher(config.cameraPlayer),
    });
  }
}

async function orbitCameraForStage(manager, config, stageCenter, scopedLogger, shouldContinue) {
  if (!config.cameraOrbitEnabled || !config.cameraPlayer) {
    return;
  }
  scopedLogger.info(`Đang di chuyển camera ${config.cameraPlayer} quanh khu vực đang xây...`);
  const totalSteps = Math.max(1, Number(config.cameraOrbitStepsPerStage) || 1);
  const stepDelayMs = Math.max(0, Number(config.cameraOrbitStepDelayMs) || 0);
  for (let stepIndex = 0; stepIndex < totalSteps; stepIndex += 1) {
    if (!shouldContinue()) {
      break;
    }
    await issueCameraCommand(
      manager,
      config,
      createCameraOrbitCommand(config.cameraPlayer, stageCenter, {
        radius: config.cameraOrbitRadius,
        height: config.cameraOrbitHeight,
        stepIndex,
        totalSteps,
      }),
      scopedLogger
    );
    if (stepDelayMs > 0 && shouldContinue()) {
      await sleep(stepDelayMs);
    }
  }
}

async function runCinematicBuild(manager, config, plan, assignments, connectedBots, buildOrigin, scopedLogger) {
  const stageOrder = resolveStageOrder(plan, config.buildStageOrder);
  const totalStages = stageOrder.length;
  if (totalStages === 0) {
    scopedLogger.warn("Cinematic mode đang bật nhưng build plan chưa có stage. Tool sẽ build theo chế độ cũ.");
    await manager.runBuild(connectedBots);
    return;
  }
  let cameraReady = await prepareCamera(manager, config, scopedLogger);

  for (const [stageIndex, stage] of stageOrder.entries()) {
    const stageAssignments = filterAssignmentsByStage(assignments, stage);
    const stageBlocks = getStageBlocks(plan, stage);
    if (stageAssignments.length === 0 || stageBlocks.length === 0) {
      continue;
    }
    const label = stageProgressLabel(stageIndex, totalStages);
    const stageCenter = calculateStageCenter(stageBlocks, buildOrigin);
    scopedLogger.info(`Bắt đầu ${label}: ${stage}`);
    if (config.announceStages) {
      await manager.issueWorldCommand(`say Bắt đầu ${label}: ${stage}`, scopedLogger, {
        delayMs: Math.max(0, Number(config.commandDelayMs) || Number(config.placementDelayMs) || 0),
        logCommand: config.verbose === true,
      });
    }
    if (config.gatherBotsAroundCamera && cameraReady) {
      try {
        await gatherBotsAroundCamera(manager, config, connectedBots, scopedLogger);
      } catch (error) {
        if (error?.cameraPlayerOffline) {
          cameraReady = false;
          scopedLogger.warn(
            `Cảnh báo: camera player "${config.cameraPlayer}" đã rời server khi đang gather bot. Tiếp tục build stage ${stage}.`
          );
        } else {
          throw error;
        }
      }
    }
    if (config.gatherBotsAroundStage) {
      await gatherBotsAroundStage(manager, config, connectedBots, stageCenter, scopedLogger);
    }

    let buildCompleted = false;
    const buildPromise = manager.runBuild(connectedBots, stageAssignments).finally(() => {
      buildCompleted = true;
    });
    if (cameraReady && config.cameraOrbitEnabled) {
      try {
        await orbitCameraForStage(manager, config, stageCenter, scopedLogger, () => !buildCompleted);
      } catch (error) {
        if (error?.cameraPlayerOffline) {
          cameraReady = false;
          scopedLogger.warn(
            `Cảnh báo: camera player "${config.cameraPlayer}" đã offline giữa lúc quay stage ${stage}. Tiếp tục build không có camera orbit.`
          );
        } else {
          throw error;
        }
      }
    }
    await buildPromise;
    scopedLogger.info(`Hoàn thành ${label}: ${stage}.`);

    if (config.pauseBetweenStages && config.stagePauseMs > 0 && stageIndex < totalStages - 1) {
      scopedLogger.info(
        `Hoàn thành ${label}, tạm dừng ${Math.round(config.stagePauseMs / 1000)} giây để quay cảnh chuyển phase...`
      );
      await sleep(config.stagePauseMs);
    }
  }
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
  const platformPadding = Math.max(
    0,
    Math.max(Number(config.platformPadding) || 0, config.clearBuildArea ? oldClearPadding : 0)
  );
  const platformExtraHeight = Math.max(0, Number(config.platformExtraHeight) || 0);
  if (config.clearBuildArea) {
    const clearBounds = areaBounds(buildOrigin, plan.size, oldClearPadding);
    const clearTopY = buildOrigin.y + plan.size.height + platformExtraHeight;
    commands.push({
      description: "dọn khu build cũ",
      command: `fill ${clearBounds.minX} ${buildOrigin.y} ${clearBounds.minZ} ${clearBounds.maxX} ${clearTopY} ${clearBounds.maxZ} air`,
    });
  }

  if (!(config.prepareBuildPlatform && canUseWorldCommands(config))) {
    return commands;
  }

  const platformBounds = areaBounds(buildOrigin, plan.size, platformPadding);
  if (config.clearAbovePlatform) {
    const clearTopY = buildOrigin.y + plan.size.height + platformExtraHeight;
    commands.push({
      description: "dọn thể tích phía trên nền build",
      command: `fill ${platformBounds.minX} ${buildOrigin.y} ${platformBounds.minZ} ${platformBounds.maxX} ${clearTopY} ${platformBounds.maxZ} air`,
    });
  }
  commands.push({
    description: "tạo nền build",
    command: `fill ${platformBounds.minX} ${buildOrigin.y - 1} ${platformBounds.minZ} ${platformBounds.maxX} ${buildOrigin.y - 1} ${platformBounds.maxZ} ${config.platformBlock}`,
  });
  return commands;
}

async function runPreparationCommands(manager, config, scoutEntry, connectedBots, plan, buildOrigin, scopedLogger) {
  if (!scoutEntry || !scoutEntry.bot) {
    return;
  }
  const creativeCommandDelayMs = Math.max(0, Number(config.creativeCommandDelayMs) || 750);
  const commandDelayMs = Math.max(0, Number(config.commandDelayMs) || Number(config.placementDelayMs) || 0);
  const platformOrigin = resolvePlatformOrigin(config, buildOrigin, scoutEntry.bot);

  if (config.setWorldConditions) {
    const worldCommands = ["time set day", "weather clear", "gamerule doDaylightCycle false"];
    for (const command of worldCommands) {
      await manager.issueWorldCommand(command, scopedLogger, {
        delayMs: commandDelayMs,
        logCommand: config.verbose === true,
      });
    }
  }

  const fillCommands = buildPlatformCommands(config, plan, platformOrigin);
  if (fillCommands.length > 0) {
    scopedLogger.info("Đang tạo nền phẳng tự động bằng /fill...");
  }
  for (const entry of fillCommands) {
    await manager.issueWorldCommand(entry.command, scopedLogger, {
      delayMs: commandDelayMs,
      logCommand: true,
    });
  }
  if (config.prepareBuildPlatform && canUseWorldCommands(config)) {
    scopedLogger.info("Chuẩn bị nền build chỉ dọn phần thể tích phía trên nền và không đào xuống dưới mặt đất.");
  }

  if (config.teleportBotsToOrigin) {
    for (const [index, entry] of connectedBots.entries()) {
      const target = teleportTargetForIndex(buildOrigin, index);
      await manager.issueWorldCommand(`tp ${entry.username} ${target.x} ${target.y} ${target.z}`, scopedLogger, {
        delayMs: 100,
        logCommand: config.verbose === true,
      });
    }
  }

  if (config.creativeMode && config.issueCreativeCommands) {
    for (const entry of connectedBots) {
      await manager.issueWorldCommand(`gamemode creative ${entry.username}`, scopedLogger, {
        delayMs: creativeCommandDelayMs,
        logCommand: config.verbose === true,
      });
      scopedLogger.info(`Đã gửi lệnh chuyển ${entry.username} sang Creative.`);
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
      if (typeof manager.setCommandController === "function") {
        manager.setCommandController(connectedScout);
      }
      await runPreparationCommands(manager, config, connectedScout, connectedBots, plan, buildOrigin, scopedLogger);
      scopedLogger.info("Tất cả bot đã sẵn sàng. Bắt đầu xây dựng.");
      if (config.cinematicMode) {
        await runCinematicBuild(manager, config, plan, assignments, connectedBots, buildOrigin, scopedLogger);
      } else {
        await manager.runBuild(connectedBots);
      }
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
  if (typeof manager.setCommandController === "function") {
    manager.setCommandController(connectedScout);
  }
  await runPreparationCommands(manager, config, connectedScout, connectedBots, plan, buildOrigin, scopedLogger);
  scopedLogger.info("Tất cả bot đã sẵn sàng. Bắt đầu xây dựng.");
  if (config.cinematicMode) {
    await runCinematicBuild(manager, config, plan, assignments, connectedBots, buildOrigin, scopedLogger);
  } else {
    await manager.runBuild(connectedBots);
  }
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
  calculateStageCenter,
  createCameraOrbitCommand,
  executeBuild,
  formatCommand,
  gatherBotsAroundCamera,
  gatherBotsAroundStage,
  main,
  parseArgs,
  pickPreparationController,
  prepareCamera,
  runCinematicBuild,
  runPreparationCommands,
  teleportTargetForIndex,
};

if (require.main === module) {
  main().catch((error) => {
    logger.error(error.message);
    process.exitCode = 1;
  });
}
