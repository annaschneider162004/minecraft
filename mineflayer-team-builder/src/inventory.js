const createItem = require("prismarine-item");

function normalizeBlockName(name) {
  const raw = String(name || "").trim();
  const withoutNamespace = raw.startsWith("minecraft:") ? raw.slice("minecraft:".length) : raw;
  const stateIndex = withoutNamespace.indexOf("[");
  return stateIndex >= 0 ? withoutNamespace.slice(0, stateIndex) : withoutNamespace;
}

function getInventoryItemByBlock(bot, blockName) {
  const normalized = normalizeBlockName(blockName);
  return bot.inventory.items().find((item) => normalizeBlockName(item.name) === normalized) || null;
}

async function ensureCreativeItem(bot, mcData, blockName) {
  const creative = bot.creative;
  if (!creative || typeof creative.setInventorySlot !== "function") {
    return false;
  }

  const itemName = normalizeBlockName(blockName);
  const item = mcData.itemsByName[itemName];
  if (!item) {
    return false;
  }

  const Item = createItem(bot.registry);
  await creative.setInventorySlot(36, new Item(item.id, 64));
  bot.setQuickBarSlot(0);
  return true;
}

async function equipBlockItem(bot, mcData, blockName, creativeMode) {
  if (creativeMode) {
    const creativeReady = await ensureCreativeItem(bot, mcData, blockName);
    if (creativeReady) {
      return true;
    }
  }

  const item = getInventoryItemByBlock(bot, blockName);
  if (!item) {
    return false;
  }
  await bot.equip(item, "hand");
  return true;
}

module.exports = {
  equipBlockItem,
  getInventoryItemByBlock,
  normalizeBlockName,
};
