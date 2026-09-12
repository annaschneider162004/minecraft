#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

function addBlockFactory() {
  const blockMap = new Map();
  let duplicateCoordinates = 0;
  return {
    add(x, y, z, block, stage) {
      const xi = Math.round(x);
      const yi = Math.round(y);
      const zi = Math.round(z);
      const key = `${xi},${yi},${zi}`;
      if (blockMap.has(key)) duplicateCoordinates += 1;
      blockMap.set(key, { x: xi, y: yi, z: zi, block, stage, role: stage });
    },
    values() {
      return [...blockMap.values()];
    },
    duplicateCoordinates() {
      return duplicateCoordinates;
    },
  };
}

function pick(palette, seed) {
  return palette[Math.abs(seed) % palette.length];
}

function buildAuralisV2Plan() {
  const size = { width: 120, height: 80, length: 160 };
  const { add, values, duplicateCoordinates } = addBlockFactory();
  const cx = 60;

  const dragonPalette = [
    "minecraft:stone_bricks",
    "minecraft:cobbled_deepslate",
    "minecraft:polished_deepslate",
    "minecraft:andesite",
    "minecraft:tuff",
  ];

  for (let z = 18; z <= 132; z += 1) {
    const t = (z - 18) / 114;
    const radiusX = Math.max(6, Math.round(13 - Math.abs(z - 80) / 8));
    const radiusY = Math.max(4, Math.round(6 - Math.abs(z - 80) / 22));
    const yCenter = 20 + Math.round(Math.sin(t * Math.PI) * 10);
    for (let x = cx - radiusX; x <= cx + radiusX; x += 1) {
      for (let y = yCenter - radiusY; y <= yCenter + radiusY; y += 1) {
        const eq = ((x - cx) ** 2) / (radiusX ** 2) + ((y - yCenter) ** 2) / (radiusY ** 2);
        if (eq <= 1) {
          add(x, y, z, pick(dragonPalette, x + y + z), "dragon_body");
        }
      }
    }
    if (z % 2 === 0) {
      add(cx, yCenter + radiusY + 1, z, "minecraft:amethyst_block", "decorations");
    }
  }

  for (let z = 6; z <= 26; z += 1) {
    const headFactor = 1 - (z - 6) / 20;
    const radiusX = 17 - Math.floor((1 - headFactor) * 6);
    const yCenter = 24 + Math.floor((1 - headFactor) * 2);
    for (let x = cx - radiusX; x <= cx + radiusX; x += 1) {
      for (let y = 12; y <= 34; y += 1) {
        const nx = (x - cx) / radiusX;
        const ny = (y - yCenter) / 12;
        if (nx * nx + ny * ny <= 1) {
          const mouthOpen = z <= 18 && x >= cx - 6 && x <= cx + 6 && y >= 16 && y <= 23;
          if (!mouthOpen) {
            add(x, y, z, pick(dragonPalette, x * 3 + y + z), "dragon_head");
          }
        }
      }
    }
    add(cx - 9, 25, z, "minecraft:deepslate_tile_stairs[facing=east,half=top,shape=straight]", "dragon_head");
    add(cx + 9, 25, z, "minecraft:deepslate_tile_stairs[facing=west,half=top,shape=straight]", "dragon_head");
  }

  for (let y = 14; y <= 30; y += 1) {
    for (let x = cx - 12; x <= cx + 12; x += 1) {
      const edge = Math.abs(x - cx);
      if (edge === 12 || y === 14 || y === 30 || (edge >= 8 && y >= 20)) {
        add(x, y, 4, "minecraft:quartz_pillar[axis=y]", "heavenly_gate");
      }
      if (edge === 10 && y >= 16 && y <= 28) {
        add(x, y, 3, "minecraft:chiseled_quartz_block", "heavenly_gate");
      }
    }
  }
  for (let x = cx - 8; x <= cx + 8; x += 1) {
    add(x, 22, 2, "minecraft:purple_stained_glass", "heavenly_gate");
    add(x, 15, 5, "minecraft:gold_block", "heavenly_gate");
  }

  for (let x = 18; x <= 102; x += 1) {
    for (let z = 56; z <= 132; z += 1) {
      const inBounds = Math.abs(x - cx) + Math.abs(z - 94) <= 78;
      if (!inBounds) continue;
      add(x, 36, z, "minecraft:polished_andesite", "city_platform");
      if ((x + z) % 3 === 0) {
        add(x, 37, z, "minecraft:smooth_stone", "city_platform");
      }
      if (x === 18 || x === 102 || z === 56 || z === 132) {
        add(x, 38, z, "minecraft:stone_brick_wall", "city_platform");
      }
    }
  }

  for (let y = 38; y <= 72; y += 1) {
    for (let x = cx - 8; x <= cx + 8; x += 1) {
      for (let z = 84; z <= 100; z += 1) {
        const dx = x - cx;
        const dz = z - 92;
        const ring = (dx * dx + dz * dz <= 64) && (dx * dx + dz * dz >= 36);
        if (ring) {
          add(x, y, z, "minecraft:purpur_block", "central_tower");
        }
      }
    }
  }
  for (let y = 40; y <= 76; y += 1) {
    add(cx, y, 92, "minecraft:amethyst_block", "central_tower");
    if (y % 2 === 0) {
      add(cx + 1, y, 92, "minecraft:purple_stained_glass", "central_tower");
      add(cx - 1, y, 92, "minecraft:purple_stained_glass", "central_tower");
    }
  }

  const temples = [
    {
      center: { x: 34, z: 70 },
      base: "minecraft:nether_bricks",
      trim: "minecraft:blackstone",
      accent: "minecraft:magma_block",
      fluid: "minecraft:lava",
    },
    {
      center: { x: 86, z: 70 },
      base: "minecraft:prismarine_bricks",
      trim: "minecraft:dark_prismarine",
      accent: "minecraft:sea_lantern",
      fluid: "minecraft:blue_stained_glass",
    },
    {
      center: { x: 34, z: 118 },
      base: "minecraft:quartz_block",
      trim: "minecraft:smooth_quartz",
      accent: "minecraft:end_rod",
      fluid: "minecraft:white_stained_glass",
    },
    {
      center: { x: 86, z: 118 },
      base: "minecraft:mossy_stone_bricks",
      trim: "minecraft:cobbled_deepslate",
      accent: "minecraft:rooted_dirt",
      fluid: "minecraft:moss_block",
    },
  ];

  for (const temple of temples) {
    for (let x = temple.center.x - 9; x <= temple.center.x + 9; x += 1) {
      for (let z = temple.center.z - 9; z <= temple.center.z + 9; z += 1) {
        const border = x === temple.center.x - 9 || x === temple.center.x + 9 || z === temple.center.z - 9 || z === temple.center.z + 9;
        add(x, 39, z, temple.base, "elemental_temples");
        if (border) {
          add(x, 40, z, temple.trim, "elemental_temples");
        }
      }
    }
    for (let y = 40; y <= 52; y += 1) {
      add(temple.center.x - 7, y, temple.center.z - 7, temple.trim, "elemental_temples");
      add(temple.center.x + 7, y, temple.center.z - 7, temple.trim, "elemental_temples");
      add(temple.center.x - 7, y, temple.center.z + 7, temple.trim, "elemental_temples");
      add(temple.center.x + 7, y, temple.center.z + 7, temple.trim, "elemental_temples");
      if (y % 3 === 0) {
        add(temple.center.x, y, temple.center.z, temple.accent, "elemental_temples");
      }
    }
    for (let x = temple.center.x - 2; x <= temple.center.x + 2; x += 1) {
      for (let z = temple.center.z - 2; z <= temple.center.z + 2; z += 1) {
        add(x, 41, z, temple.fluid, "elemental_temples");
      }
    }
  }

  for (let x = 8; x <= 112; x += 1) {
    for (let z = 10; z <= 154; z += 1) {
      const edgeNoise = (x * 13 + z * 7) % 17;
      if (edgeNoise < 11) {
        add(x, 4, z, "minecraft:black_concrete", "void_abyss");
      }
      if ((x + z) % 19 === 0) {
        add(x, 5, z, "minecraft:crying_obsidian", "void_abyss");
      }
      if ((x * z) % 97 === 0) {
        add(x, 6, z, "minecraft:lava", "void_abyss");
      }
      if ((x + 2 * z) % 29 === 0) {
        add(x, 7, z, "minecraft:purple_stained_glass", "void_abyss");
      }
    }
  }

  for (let x = 90; x <= 116; x += 1) {
    for (let z = 136; z <= 158; z += 1) {
      add(x, 26, z, "minecraft:obsidian", "demon_fortress");
      if (x === 90 || x === 116 || z === 136 || z === 158) {
        add(x, 27, z, "minecraft:polished_blackstone_bricks", "demon_fortress");
      }
    }
  }
  for (let y = 27; y <= 52; y += 1) {
    add(92, y, 138, "minecraft:nether_bricks", "demon_fortress");
    add(114, y, 138, "minecraft:nether_bricks", "demon_fortress");
    add(92, y, 156, "minecraft:nether_bricks", "demon_fortress");
    add(114, y, 156, "minecraft:nether_bricks", "demon_fortress");
    if (y % 4 === 0) {
      add(103, y, 147, "minecraft:magma_block", "demon_fortress");
    }
  }

  for (let x = 22; x <= 98; x += 1) {
    const z = 54 + Math.floor((x - 22) / 5);
    add(x, 39, z, "minecraft:stone_bricks", "decorations");
    if (x % 4 === 0) {
      add(x, 40, z, "minecraft:purple_banner[rotation=8]", "decorations");
    }
  }
  for (let z = 58; z <= 130; z += 1) {
    if (z % 6 === 0) {
      add(60, 38, z, "minecraft:gold_block", "decorations");
    }
  }

  for (let x = 22; x <= 98; x += 8) {
    for (let z = 60; z <= 128; z += 8) {
      add(x, 41, z, "minecraft:sea_lantern", "lighting");
      add(x, 42, z, "minecraft:end_rod", "lighting");
    }
  }
  for (let y = 40; y <= 72; y += 4) {
    add(cx + 10, y, 92, "minecraft:glowstone", "lighting");
    add(cx - 10, y, 92, "minecraft:glowstone", "lighting");
  }
  for (const point of [
    [34, 53, 70],
    [86, 53, 70],
    [34, 53, 118],
    [86, 53, 118],
    [103, 53, 147],
  ]) {
    add(point[0], point[1], point[2], "minecraft:soul_lantern", "lighting");
  }

  const blocks = values().sort(
    (a, b) =>
      a.y - b.y ||
      a.z - b.z ||
      a.x - b.x ||
      a.block.localeCompare(b.block) ||
      a.stage.localeCompare(b.stage) ||
      a.role.localeCompare(b.role)
  );

  return {
    name: "Thien Thanh Auralis - Thanh Pho Tren Lung Rong (v2)",
    buildType: "auralis_v2_team",
    size,
    origin: { x: 0, y: 100, z: 0 },
    recommendedBotCount: 10,
    blocks,
    generationStats: {
      duplicateCoordinates: duplicateCoordinates(),
    },
  };
}

function writePlan(outputPath) {
  const plan = buildAuralisV2Plan();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");

  const stageCounts = plan.blocks.reduce((acc, block) => {
    acc[block.stage] = (acc[block.stage] || 0) + 1;
    return acc;
  }, {});
  process.stdout.write(`Wrote ${outputPath}\n`);
  process.stdout.write(`Total blocks: ${plan.blocks.length}\n`);
  process.stdout.write(`Duplicate coordinates overwritten: ${plan.generationStats.duplicateCoordinates}\n`);
  process.stdout.write(`Stages: ${Object.keys(stageCounts).sort().join(", ")}\n`);
}

const explicitOutput = process.argv[2];
const defaultOutput = path.resolve(__dirname, "auralis_v2_team_plan.json");
writePlan(explicitOutput ? path.resolve(process.cwd(), explicitOutput) : defaultOutput);
