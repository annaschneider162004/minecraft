function sortBlocks(blocks, origin) {
  return [...blocks].sort((left, right) => {
    if (left.y !== right.y) {
      return left.y - right.y;
    }
    const leftDistance = Math.abs(left.x - origin.x) + Math.abs(left.z - origin.z);
    const rightDistance = Math.abs(right.x - origin.x) + Math.abs(right.z - origin.z);
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }
    if (left.x !== right.x) {
      return left.x - right.x;
    }
    if (left.z !== right.z) {
      return left.z - right.z;
    }
    return left.block.localeCompare(right.block);
  });
}

function assignRoundRobin(blocks, bots, origin) {
  const sorted = sortBlocks(blocks, origin);
  const assignments = bots.map((bot) => ({ bot, blocks: [] }));
  sorted.forEach((block, index) => {
    assignments[index % assignments.length].blocks.push(block);
  });
  return assignments;
}

function assignByRole(plan, bots, origin) {
  const assignments = bots.map((bot) => ({ bot, blocks: [] }));
  const unmatched = [];
  const roleToAssignments = new Map();
  const stageToAssignments = new Map();

  for (const assignment of assignments) {
    const roles = Array.isArray(assignment.bot.roles)
      ? assignment.bot.roles
      : [assignment.bot.role || ""];
    roles.filter(Boolean).forEach((role) => {
      if (!roleToAssignments.has(role)) {
        roleToAssignments.set(role, []);
      }
      roleToAssignments.get(role).push(assignment);
    });
    const stages = Array.isArray(assignment.bot.assignedStages) ? assignment.bot.assignedStages : [];
    stages.filter(Boolean).forEach((stage) => {
      if (!stageToAssignments.has(stage)) {
        stageToAssignments.set(stage, []);
      }
      stageToAssignments.get(stage).push(assignment);
    });
  }

  function selectLeastLoaded(candidates) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new Error("Cần ít nhất một bot để chia build plan.");
    }
    return candidates.reduce((best, current) => (current.blocks.length < best.blocks.length ? current : best));
  }

  for (const block of plan.blocks) {
    const matchingAssignments = block.role ? roleToAssignments.get(block.role) : null;
    if (matchingAssignments && matchingAssignments.length > 0) {
      selectLeastLoaded(matchingAssignments).blocks.push(block);
      continue;
    }
    const stageAssignments = block.stage ? stageToAssignments.get(block.stage) : null;
    if (stageAssignments && stageAssignments.length > 0) {
      selectLeastLoaded(stageAssignments).blocks.push(block);
      continue;
    }
    unmatched.push(block);
  }

  if (unmatched.length > 0) {
    const sortedUnmatched = sortBlocks(unmatched, origin);
    for (const block of sortedUnmatched) {
      selectLeastLoaded(assignments).blocks.push(block);
    }
  }

  assignments.forEach((assignment) => {
    assignment.blocks = sortBlocks(assignment.blocks, origin);
  });
  return assignments;
}

function buildAssignments(plan, bots, origin) {
  if (!Array.isArray(bots) || bots.length === 0) {
    throw new Error("Cần ít nhất một bot để chia build plan.");
  }
  const hasRoleHints = plan.blocks.some((block) => Boolean(block.role));
  if (!hasRoleHints) {
    return assignRoundRobin(plan.blocks, bots, origin);
  }
  return assignByRole(plan, bots, origin);
}

function listPlanStages(plan) {
  const stages = [];
  const seen = new Set();
  for (const block of plan.blocks) {
    if (!block.stage || seen.has(block.stage)) {
      continue;
    }
    seen.add(block.stage);
    stages.push(block.stage);
  }
  return stages;
}

function resolveStageOrder(plan, requestedOrder = []) {
  const planStages = listPlanStages(plan);
  const availableStages = new Set(planStages);
  const ordered = [];
  const seen = new Set();
  for (const stage of requestedOrder) {
    if (typeof stage !== "string" || !stage.trim() || seen.has(stage) || !availableStages.has(stage)) {
      continue;
    }
    seen.add(stage);
    ordered.push(stage);
  }
  for (const stage of planStages) {
    if (seen.has(stage)) {
      continue;
    }
    seen.add(stage);
    ordered.push(stage);
  }
  return ordered;
}

function filterAssignmentsByStage(assignments, stage) {
  return assignments
    .map((assignment) => ({
      bot: assignment.bot,
      blocks: assignment.blocks.filter((block) => block.stage === stage),
    }))
    .filter((assignment) => assignment.blocks.length > 0);
}

module.exports = {
  assignByRole,
  assignRoundRobin,
  buildAssignments,
  filterAssignmentsByStage,
  listPlanStages,
  resolveStageOrder,
  sortBlocks,
};
