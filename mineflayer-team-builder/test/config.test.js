const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { loadConfig } = require("../src/config");

test("loadConfig applies large-team batching defaults", () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "mf-config-"));
  const configPath = path.join(tempdir, "team-config.json");
  const planPath = path.join(tempdir, "team-plan.json");
  fs.writeFileSync(planPath, JSON.stringify({ blocks: [] }), "utf8");
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      host: "localhost",
      bots: [{ username: "Builder_01", role: "foundation" }],
      planFile: "./team-plan.json",
    }),
    "utf8"
  );

  const loaded = loadConfig(configPath);
  assert.equal(loaded.joinBatchSize, 5);
  assert.equal(loaded.joinBatchDelayMs, 3000);
  assert.equal(loaded.placementDelayMs, 700);
  assert.equal(loaded.planFile, planPath);
});
