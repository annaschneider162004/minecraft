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

  for (const assignment of assignments) {
    const role = assignment.bot.role || "";
    if (!roleToAssignments.has(role)) {
      roleToAssignments.set(role, []);
    }
    roleToAssignments.get(role).push(assignment);
  }

  for (const block of plan.blocks) {
    const matchingAssignments = block.role ? roleToAssignments.get(block.role) : null;
    if (matchingAssignments && matchingAssignments.length > 0) {
      const target = matchingAssignments.reduce((best, current) => (current.blocks.length < best.blocks.length ? current : best));
      target.blocks.push(block);
      continue;
    }
    unmatched.push(block);
  }

  if (unmatched.length > 0) {
    const fallback = assignRoundRobin(unmatched, bots, origin);
    fallback.forEach((entry, index) => {
      assignments[index].blocks.push(...entry.blocks);
    });
  }

  assignments.forEach((assignment) => {
    assignment.blocks = sortBlocks(assignment.blocks, origin);
  });
  return assignments;
}

function buildAssignments(plan, bots, origin) {
  const hasRoleHints = plan.blocks.some((block) => Boolean(block.role));
  if (!hasRoleHints) {
    return assignRoundRobin(plan.blocks, bots, origin);
  }
  return assignByRole(plan, bots, origin);
}

module.exports = {
  assignByRole,
  assignRoundRobin,
  buildAssignments,
  sortBlocks,
};
