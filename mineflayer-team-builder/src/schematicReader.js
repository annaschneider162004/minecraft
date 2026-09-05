const fs = require("fs");

function validatePlan(plan) {
  if (!plan || typeof plan !== "object") {
    throw new Error("Build plan không hợp lệ.");
  }
  if (!plan.size || typeof plan.size.width !== "number" || typeof plan.size.height !== "number" || typeof plan.size.length !== "number") {
    throw new Error("Build plan cần size.width, size.height, size.length.");
  }
  if (!Array.isArray(plan.blocks) || plan.blocks.length === 0) {
    throw new Error("Build plan cần blocks không rỗng.");
  }
  for (const block of plan.blocks) {
    if (typeof block.x !== "number" || typeof block.y !== "number" || typeof block.z !== "number" || typeof block.block !== "string") {
      throw new Error("Mỗi block trong plan phải có x, y, z và block.");
    }
  }
  return plan;
}

function loadBuildPlan(planFile) {
  const raw = fs.readFileSync(planFile, "utf8");
  return validatePlan(JSON.parse(raw));
}

module.exports = {
  loadBuildPlan,
  validatePlan,
};
