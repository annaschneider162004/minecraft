const fs = require("fs");
const path = require("path");

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
    port: parsed.port || 25565,
    version: Object.prototype.hasOwnProperty.call(parsed, "version") ? parsed.version : false,
    auth: parsed.auth || "offline",
    origin: parsed.origin || { x: 0, y: 64, z: 0 },
    bots: parsed.bots,
    planFile,
    creativeMode: parsed.creativeMode !== false,
    commandPrefix: parsed.commandPrefix || "/",
    issueCreativeCommands: parsed.issueCreativeCommands === true,
    placementDelayMs: parsed.placementDelayMs || Number(process.env.TEAM_BUILDER_PLACEMENT_DELAY_MS) || 700,
    movementTimeoutMs: parsed.movementTimeoutMs || 15000,
    connectTimeoutMs: parsed.connectTimeoutMs || Number(process.env.TEAM_BUILDER_CONNECT_TIMEOUT_MS) || 30000,
    maxPlacementRetries: parsed.maxPlacementRetries || 2,
    replaceOccupiedBlocks: parsed.replaceOccupiedBlocks === true,
  };
}

module.exports = {
  loadConfig,
};
