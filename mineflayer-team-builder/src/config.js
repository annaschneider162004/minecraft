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
    origin: withDefault(parsed.origin, { x: 0, y: 64, z: 0 }),
    bots: parsed.bots,
    planFile,
    creativeMode: parsed.creativeMode !== false,
    commandPrefix: withDefault(parsed.commandPrefix, "/"),
    issueCreativeCommands: parsed.issueCreativeCommands === true,
    placementDelayMs: withDefault(parsed.placementDelayMs, withDefault(readNumberEnv("TEAM_BUILDER_PLACEMENT_DELAY_MS"), 700)),
    movementTimeoutMs: withDefault(parsed.movementTimeoutMs, 15000),
    connectTimeoutMs: withDefault(parsed.connectTimeoutMs, withDefault(readNumberEnv("TEAM_BUILDER_CONNECT_TIMEOUT_MS"), 30000)),
    maxPlacementRetries: withDefault(parsed.maxPlacementRetries, 2),
    joinBatchSize: withDefault(parsed.joinBatchSize, 5),
    joinBatchDelayMs: withDefault(parsed.joinBatchDelayMs, 3000),
    replaceOccupiedBlocks: parsed.replaceOccupiedBlocks === true,
  };
}

module.exports = {
  loadConfig,
};
