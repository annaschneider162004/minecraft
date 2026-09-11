const test = require("node:test");
const assert = require("node:assert/strict");

const { evaluateCandidate, findBuildOrigin, isAutoOriginEnabled, resolveSearchCenter } = require("../src/siteFinder");

function createMockBot({ groundY = 64, blockedPositions = new Set(), waterPositions = new Set(), groundByXZ = new Map() } = {}) {
  return {
    entity: {
      position: { x: 10.2, y: groundY, z: -2.8 },
    },
    blockAt(position) {
      const key = `${position.x},${position.y},${position.z}`;
      const xz = `${position.x},${position.z}`;
      const columnGroundY = groundByXZ.get(xz) ?? groundY;
      if (blockedPositions.has(key)) {
        return { name: "minecraft:oak_log", boundingBox: "block" };
      }
      if (position.y === columnGroundY) {
        if (waterPositions.has(xz)) {
          return { name: "minecraft:water", boundingBox: "empty" };
        }
        return { name: "minecraft:air", boundingBox: "empty" };
      }
      if (position.y === columnGroundY - 1) {
        if (waterPositions.has(xz)) {
          return { name: "minecraft:water", boundingBox: "empty" };
        }
        return { name: "minecraft:grass_block", boundingBox: "block" };
      }
      if (position.y < columnGroundY - 1) {
        return { name: "minecraft:stone", boundingBox: "block" };
      }
      return { name: "minecraft:air", boundingBox: "empty" };
    },
  };
}

test("isAutoOriginEnabled supports both toggles", () => {
  assert.equal(isAutoOriginEnabled({ autoFindOrigin: true, origin: { x: 0, y: 64, z: 0 } }), true);
  assert.equal(isAutoOriginEnabled({ autoFindOrigin: false, origin: "auto" }), true);
  assert.equal(isAutoOriginEnabled({ autoFindOrigin: false, origin: { x: 0, y: 64, z: 0 } }), false);
});

test("resolveSearchCenter prefers current bot area by default", () => {
  const bot = createMockBot();
  const center = resolveSearchCenter(bot, { searchCenter: { x: 0, y: 70, z: 0 } });
  assert.equal(center.x, 10);
  assert.equal(center.y, 64);
  assert.equal(center.z, -3);
});

test("evaluateCandidate rejects uneven terrain over flatness limit", () => {
  const groundByXZ = new Map([["11,-3", 67]]);
  const bot = createMockBot({ groundByXZ });
  const result = evaluateCandidate(
    bot,
    { x: 10, z: -3 },
    { width: 2, height: 6, length: 1 },
    { buildPadding: 0, requiredFlatness: 1, clearanceHeight: 6, replaceOccupiedBlocks: false }
  );
  assert.equal(result, null);
});

test("findBuildOrigin returns usable coordinate near center", async () => {
  const water = new Set(["10,-3"]);
  const bot = createMockBot({ waterPositions: water });
  const origin = await findBuildOrigin(
    bot,
    {
      autoFindOrigin: true,
      origin: "auto",
      searchRadius: 8,
      maxSearchRadius: 16,
      requiredFlatness: 1,
      clearanceHeight: 8,
      buildPadding: 0,
      replaceOccupiedBlocks: false,
      preferCurrentPlayerArea: true,
    },
    { width: 2, height: 6, length: 2 }
  );
  assert.equal(typeof origin.x, "number");
  assert.equal(typeof origin.y, "number");
  assert.equal(typeof origin.z, "number");
});
