const fs = require("fs");
const path = require("path");

function withDefault(value, fallback) {
  return value ?? fallback;
}

function readNumberEnv(name) {
  if (!Object.prototype.hasOwnProperty.call(process.env, name)) {
    return undefined;
  }
  const value = Number(process.env[name]);
  return Number.isNaN(value) ? undefined : value;
}

function readNumberValue(value, fallback) {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? fallback : numeric;
}

function isCoordinateObject(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof value.x === "number" &&
      typeof value.y === "number" &&
      typeof value.z === "number"
  );
}

function parseOrigin(origin) {
  if (origin === "auto") {
    return "auto";
  }
  if (origin === undefined) {
    return { x: 0, y: 100, z: 0 };
  }
  if (!isCoordinateObject(origin)) {
    throw new Error("origin phải là {x, y, z} hoặc \"auto\".");
  }
  return origin;
}

function parseCoordinateOrigin(origin, fieldName) {
  if (origin === undefined) {
    return undefined;
  }
  if (!isCoordinateObject(origin)) {
    throw new Error(`${fieldName} phải là {x, y, z}.`);
  }
  return origin;
}

function parseSearchCenter(value) {
  if (value === undefined || value === "spawn") {
    return "spawn";
  }
  if (!isCoordinateObject(value)) {
    throw new Error("searchCenter phải là \"spawn\" hoặc {x, y, z}.");
  }
  return value;
}

function parsePlacementMode(value) {
  if (value === undefined || value === null || value === "") {
    return "commands";
  }
  if (value === "mineflayer" || value === "commands" || value === "command-fallback") {
    return value;
  }
  throw new Error('placementMode phải là "mineflayer", "commands" hoặc "command-fallback".');
}

function parseCameraFocus(value) {
  if (value === undefined || value === null || value === "") {
    return "stage_center";
  }
  if (value === "stage_center") {
    return value;
  }
  throw new Error('cameraFocus hiện chỉ hỗ trợ "stage_center".');
}

function loadConfig(configArg) {
  const configPath = configArg || process.env.TEAM_BUILDER_CONFIG;
  if (!configPath) {
    throw new Error("Thiếu đường dẫn config. Dùng --config <file.json> hoặc TEAM_BUILDER_CONFIG.");
  }

  const absolutePath = path.resolve(process.cwd(), configPath);
  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw);
  const configDir = path.dirname(absolutePath);
  const planFile = parsed.planFile ? path.resolve(configDir, parsed.planFile) : null;
  const origin = parseOrigin(parsed.origin);
  const platformOrigin =
    parseCoordinateOrigin(parsed.platformOrigin, "platformOrigin") ||
    (origin === "auto" ? { x: 0, y: 100, z: 0 } : origin);

  if (!parsed.host) {
    throw new Error("Config Mineflayer phải có trường host.");
  }
  if (!Array.isArray(parsed.bots) || parsed.bots.length === 0) {
    throw new Error("Config Mineflayer phải có ít nhất 1 bot trong bots.");
  }
  if (!planFile) {
    throw new Error("Config Mineflayer phải có planFile trỏ tới file JSON build plan.");
  }

  return {
    host: parsed.host,
    port: withDefault(parsed.port, 25565),
    version: Object.prototype.hasOwnProperty.call(parsed, "version") ? parsed.version : false,
    auth: withDefault(parsed.auth, "offline"),
    origin,
    platformOrigin,
    autoFindOriginConfigured: Object.prototype.hasOwnProperty.call(parsed, "autoFindOrigin"),
    autoFindOrigin: parsed.autoFindOrigin === true,
    searchCenter: parseSearchCenter(parsed.searchCenter),
    searchRadius: withDefault(parsed.searchRadius, 80),
    maxSearchRadius: withDefault(parsed.maxSearchRadius, 160),
    requiredFlatness: withDefault(parsed.requiredFlatness, 3),
    clearanceHeight: withDefault(parsed.clearanceHeight, 20),
    preferCurrentPlayerArea: parsed.preferCurrentPlayerArea !== false,
    buildPadding: withDefault(parsed.buildPadding, 6),
    scoutBot: typeof parsed.scoutBot === "string" ? parsed.scoutBot : null,
    bots: parsed.bots,
    planFile,
    creativeMode: parsed.creativeMode !== false,
    commandPrefix: withDefault(parsed.commandPrefix, "/"),
    issueCreativeCommands: parsed.issueCreativeCommands === true,
    issueWorldCommands: parsed.issueWorldCommands !== false,
    creativeCommandDelayMs: readNumberValue(
      withDefault(parsed.creativeCommandDelayMs, withDefault(readNumberEnv("TEAM_BUILDER_CREATIVE_COMMAND_DELAY_MS"), 750)),
      750
    ),
    placementDelayMs: withDefault(parsed.placementDelayMs, withDefault(readNumberEnv("TEAM_BUILDER_PLACEMENT_DELAY_MS"), 700)),
    commandDelayMs: readNumberValue(
      parsed.commandDelayMs,
      withDefault(readNumberEnv("TEAM_BUILDER_COMMAND_DELAY_MS"), withDefault(parsed.placementDelayMs, 700))
    ),
    placementMode: parsePlacementMode(parsed.placementMode),
    commandBuildFallback: parsed.commandBuildFallback !== false,
    movementTimeoutMs: withDefault(parsed.movementTimeoutMs, 15000),
    connectTimeoutMs: withDefault(parsed.connectTimeoutMs, withDefault(readNumberEnv("TEAM_BUILDER_CONNECT_TIMEOUT_MS"), 120000)),
    connectRetries: withDefault(parsed.connectRetries, 3),
    connectRetryDelayMs: withDefault(parsed.connectRetryDelayMs, 5000),
    maxPlacementRetries: withDefault(parsed.maxPlacementRetries, 2),
    joinBatchSize: withDefault(parsed.joinBatchSize, 1),
    joinBatchDelayMs: withDefault(parsed.joinBatchDelayMs, 5000),
    allowPartialTeam: parsed.allowPartialTeam === true,
    replaceOccupiedBlocks: parsed.replaceOccupiedBlocks === true,
    teleportBotsToOrigin: parsed.teleportBotsToOrigin === true,
    setWorldConditions: parsed.setWorldConditions === true,
    clearBuildArea: parsed.clearBuildArea === true,
    prepareBuildPlatform: parsed.prepareBuildPlatform !== false,
    platformBlock: withDefault(parsed.platformBlock, "minecraft:grass_block"),
    clearAbovePlatform: parsed.clearAbovePlatform !== false,
    platformPadding: withDefault(parsed.platformPadding, 20),
    platformExtraHeight: withDefault(parsed.platformExtraHeight, 20),
    cinematicMode: parsed.cinematicMode === true,
    cameraPlayer: typeof parsed.cameraPlayer === "string" ? parsed.cameraPlayer : null,
    cameraGamemode: withDefault(parsed.cameraGamemode, "spectator"),
    cameraOrbitEnabled: parsed.cameraOrbitEnabled === true,
    cameraOrbitRadius: readNumberValue(parsed.cameraOrbitRadius, 12),
    cameraOrbitHeight: readNumberValue(parsed.cameraOrbitHeight, 8),
    cameraOrbitStepDelayMs: readNumberValue(parsed.cameraOrbitStepDelayMs, 1200),
    cameraOrbitStepsPerStage: readNumberValue(parsed.cameraOrbitStepsPerStage, 12),
    cameraFocus: parseCameraFocus(parsed.cameraFocus),
    gatherBotsAroundStage: parsed.gatherBotsAroundStage === true,
    gatherBotsAroundCamera: parsed.gatherBotsAroundCamera === true,
    stagePauseMs: readNumberValue(parsed.stagePauseMs, 0),
    pauseBetweenStages: parsed.pauseBetweenStages === true,
    announceStages: parsed.announceStages === true,
    buildStageOrder: Array.isArray(parsed.buildStageOrder) ? parsed.buildStageOrder.filter((stage) => typeof stage === "string" && stage.trim()) : [],
    verbose: parsed.verbose === true,
  };
}

module.exports = {
  loadConfig,
};
