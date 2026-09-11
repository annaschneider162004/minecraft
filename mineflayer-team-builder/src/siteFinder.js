const { Vec3 } = require("vec3");

const AVOID_SURFACE_BLOCKS = new Set(["water", "lava"]);
const REPLACEABLE_SURFACE_BLOCKS = new Set([
  "air",
  "cave_air",
  "void_air",
  "grass",
  "tall_grass",
  "fern",
  "large_fern",
  "dead_bush",
  "dandelion",
  "poppy",
  "blue_orchid",
  "allium",
  "azure_bluet",
  "red_tulip",
  "orange_tulip",
  "white_tulip",
  "pink_tulip",
  "oxeye_daisy",
  "cornflower",
  "lily_of_the_valley",
  "torchflower",
  "snow",
  "oak_leaves",
  "birch_leaves",
  "spruce_leaves",
  "jungle_leaves",
  "acacia_leaves",
  "dark_oak_leaves",
  "mangrove_leaves",
  "azalea_leaves",
  "flowering_azalea_leaves",
]);

function normalizeName(name) {
  return String(name || "").replace(/^minecraft:/, "").split("[")[0];
}

function toVec3(position) {
  return new Vec3(Math.floor(position.x), Math.floor(position.y), Math.floor(position.z));
}

function isSolidGround(block) {
  if (!block) {
    return false;
  }
  if (block.boundingBox !== "block") {
    return false;
  }
  const blockName = normalizeName(block.name);
  return !AVOID_SURFACE_BLOCKS.has(blockName);
}

function isPassable(block, replaceOccupiedBlocks) {
  if (!block) {
    return true;
  }
  const name = normalizeName(block.name);
  if (REPLACEABLE_SURFACE_BLOCKS.has(name)) {
    return true;
  }
  return replaceOccupiedBlocks;
}

function resolveSearchCenter(bot, config) {
  if (config.searchCenter && typeof config.searchCenter === "object") {
    return toVec3(config.searchCenter);
  }
  if (config.preferCurrentPlayerArea !== false && bot.entity?.position) {
    return toVec3(bot.entity.position);
  }
  if (bot.entity?.position) {
    return toVec3(bot.entity.position);
  }
  return new Vec3(0, 64, 0);
}

function findGroundY(bot, x, z, startY, clearanceHeight) {
  const upper = Math.floor(startY + clearanceHeight + 8);
  const lower = Math.floor(startY - 48);
  for (let y = upper; y >= lower; y -= 1) {
    const below = bot.blockAt(new Vec3(x, y - 1, z));
    const at = bot.blockAt(new Vec3(x, y, z));
    if (!isSolidGround(below)) {
      continue;
    }
    if (AVOID_SURFACE_BLOCKS.has(normalizeName(at?.name))) {
      continue;
    }
    return y;
  }
  return null;
}

function areaBounds(origin, planSize, padding) {
  return {
    minX: origin.x - padding,
    minZ: origin.z - padding,
    maxX: origin.x + planSize.width - 1 + padding,
    maxZ: origin.z + planSize.length - 1 + padding,
  };
}

function evaluateCandidate(bot, candidateXZ, planSize, config) {
  const padding = Math.max(0, Number(config.buildPadding) || 0);
  const requiredFlatness = Math.max(0, Number(config.requiredFlatness) || 0);
  const clearanceHeight = Math.max(1, Number(config.clearanceHeight) || planSize.height);
  const probeY = bot.entity?.position?.y || 64;
  const originProbeY = findGroundY(bot, candidateXZ.x, candidateXZ.z, probeY, clearanceHeight);
  if (originProbeY === null) {
    return null;
  }
  const origin = { x: candidateXZ.x, y: originProbeY, z: candidateXZ.z };
  const bounds = areaBounds(origin, planSize, padding);
  let minGround = Number.POSITIVE_INFINITY;
  let maxGround = Number.NEGATIVE_INFINITY;
  let hazardBlocks = 0;
  let blockedColumns = 0;

  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      const columnGround = findGroundY(bot, x, z, originProbeY, clearanceHeight);
      if (columnGround === null) {
        return null;
      }
      minGround = Math.min(minGround, columnGround - 1);
      maxGround = Math.max(maxGround, columnGround - 1);

      const surface = bot.blockAt(new Vec3(x, columnGround, z));
      if (AVOID_SURFACE_BLOCKS.has(normalizeName(surface?.name))) {
        hazardBlocks += 1;
      }
      const maxBuildY = origin.y + Math.min(planSize.height, clearanceHeight) - 1;
      for (let y = origin.y; y <= maxBuildY; y += 1) {
        const block = bot.blockAt(new Vec3(x, y, z));
        if (!isPassable(block, config.replaceOccupiedBlocks)) {
          blockedColumns += 1;
          break;
        }
      }
    }
  }

  if (maxGround - minGround > requiredFlatness) {
    return null;
  }

  const shiftedOrigin = { x: origin.x, y: minGround + 1, z: origin.z };
  const flatnessScore = maxGround - minGround;
  const obstructionScore = blockedColumns + hazardBlocks * 3;

  return {
    origin: shiftedOrigin,
    flatnessScore,
    obstructionScore,
    reason: `độ phẳng=${flatnessScore}, cản trở=${blockedColumns}, hazard=${hazardBlocks}`,
  };
}

function generateCandidates(center, radius) {
  const candidates = [{ x: center.x, z: center.z }];
  const step = 4;
  for (let distance = step; distance <= radius; distance += step) {
    for (let offset = -distance; offset <= distance; offset += step) {
      candidates.push({ x: center.x + offset, z: center.z - distance });
      candidates.push({ x: center.x + offset, z: center.z + distance });
      if (Math.abs(offset) !== distance) {
        candidates.push({ x: center.x - distance, z: center.z + offset });
        candidates.push({ x: center.x + distance, z: center.z + offset });
      }
    }
  }
  return candidates;
}

function isAutoOriginEnabled(config) {
  if (config.autoFindOriginConfigured) {
    return config.autoFindOrigin === true;
  }
  return config.autoFindOrigin === true || config.origin === "auto";
}

async function findBuildOrigin(bot, config, planSize, logger) {
  const center = resolveSearchCenter(bot, config);
  const initialRadius = Math.max(4, Number(config.searchRadius) || 80);
  const maxRadius = Math.max(initialRadius, Number(config.maxSearchRadius) || initialRadius);
  const radiusStep = Math.max(8, Math.floor(initialRadius / 2));
  let best = null;

  for (let radius = initialRadius; radius <= maxRadius; radius += radiusStep) {
    const candidates = generateCandidates(center, radius);
    for (const candidate of candidates) {
      const evaluation = evaluateCandidate(bot, candidate, planSize, config);
      if (!evaluation) {
        continue;
      }
      if (
        !best ||
        evaluation.obstructionScore < best.obstructionScore ||
        (evaluation.obstructionScore === best.obstructionScore && evaluation.flatnessScore < best.flatnessScore)
      ) {
        best = evaluation;
      }
      if (evaluation.obstructionScore === 0 && evaluation.flatnessScore === 0) {
        break;
      }
    }
    if (best && best.obstructionScore <= 2) {
      break;
    }
  }

  if (!best) {
    throw new Error("Không tìm thấy khu vực phù hợp để đặt công trình tự động.");
  }

  if (logger) {
    logger.info(`Auto-origin đã chọn (${best.origin.x}, ${best.origin.y}, ${best.origin.z}) vì ${best.reason}.`);
  }
  return best.origin;
}

module.exports = {
  areaBounds,
  evaluateCandidate,
  findBuildOrigin,
  isAutoOriginEnabled,
  resolveSearchCenter,
};
