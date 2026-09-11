const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

test("dry-run with auto origin does not require world access", () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "mf-index-"));
  try {
    const planPath = path.join(tempdir, "plan.json");
    const configPath = path.join(tempdir, "config.json");
    fs.writeFileSync(
      planPath,
      JSON.stringify({
        name: "Dry run test",
        size: { width: 2, height: 3, length: 2 },
        origin: { x: 0, y: 0, z: 0 },
        blocks: [{ x: 0, y: 0, z: 0, block: "stone", role: "foundation" }],
      }),
      "utf8"
    );
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        host: "localhost",
        port: 25565,
        autoFindOrigin: true,
        origin: "auto",
        bots: [{ username: "Builder_01", role: "foundation" }],
        planFile: "./plan.json",
      }),
      "utf8"
    );

    const result = spawnSync(process.execPath, ["src/index.js", "--config", configPath, "--dry-run"], {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Auto-origin đang bật/);
    assert.match(result.stdout, /Dry run hoàn tất/);
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});
