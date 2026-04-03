import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { cleanupDir, createTempWorkspace, writeJson } from "./helpers.ts";

async function importFreshConfig() {
  return await import(`../src/config.ts?case=${Date.now()}-${Math.random()}`);
}

test("readStatusLineConfig 合并全局与项目配置，并规范化数值字段", async () => {
  const originalHome = process.env.HOME;
  const originalCwd = process.cwd();
  const tempRoot = await createTempWorkspace("pi-statusline-config");
  const homeDir = join(tempRoot, "home");
  const projectDir = join(tempRoot, "project");

  try {
    await mkdir(homeDir, { recursive: true });
    await mkdir(projectDir, { recursive: true });
    process.env.HOME = homeDir;
    process.chdir(projectDir);

    await writeJson(join(homeDir, ".pi", "agent", "settings.json"), {
      statusLine: {
        type: "command",
        command: "global-statusline",
        padding: -3,
        debounceMs: 120,
      },
    });

    await writeJson(join(projectDir, ".pi", "settings.json"), {
      statusLine: {
        type: "command",
        command: "project-statusline",
        placement: "widget",
        widgetPlacement: "aboveEditor",
        timeoutMs: 5000.2,
      },
    });

    const { readStatusLineConfig, clearConfigCache } = await importFreshConfig();
    const config = readStatusLineConfig(projectDir);

    assert.deepEqual(config, {
      type: "command",
      command: "project-statusline",
      placement: "widget",
      padding: 0,
      widgetPlacement: "aboveEditor",
      debounceMs: 120,
      timeoutMs: 5000,
    });

    clearConfigCache(projectDir);
  } finally {
    process.chdir(originalCwd);
    process.env.HOME = originalHome;
    await cleanupDir(tempRoot);
  }
});
