#!/usr/bin/env node

require("dotenv").config();

const path = require("path");

const { BotManager } = require("./botManager");
const { buildAssignments } = require("./buildPlanner");
const { loadConfig } = require("./config");
const { createLogger } = require("./logger");
const { loadBuildPlan } = require("./schematicReader");

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const config = loadConfig(args.config);
  const plan = loadBuildPlan(config.planFile);
  const planOrigin = plan.origin || { x: 0, y: 0, z: 0 };
  const buildOrigin = config.origin || planOrigin;
  const assignments = buildAssignments(plan, config.bots, buildOrigin);

  logger.info(`Đã tải config: ${path.relative(process.cwd(), config.planFile)}`);
  logger.info(`Build plan "${plan.name}" có ${plan.blocks.length} block cho ${assignments.length} bot.`);
  assignments.forEach((assignment) => {
    logger.info(`- ${assignment.bot.username} (${assignment.bot.role || "general"}): ${assignment.blocks.length} block`);
  });

  if (args.dryRun) {
    logger.info("Dry run hoàn tất. Không kết nối server.");
    return;
  }

  const manager = new BotManager({ ...config, origin: buildOrigin }, assignments);
  const connectedBots = await manager.connectAll();
  logger.info("Tất cả bot đã sẵn sàng. Bắt đầu xây dựng.");
  await manager.runBuild(connectedBots);
  logger.info("Đội bot đã hoàn tất build plan.");
}

main().catch((error) => {
  logger.error(error.message);
  process.exitCode = 1;
});
