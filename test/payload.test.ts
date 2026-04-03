import test from "node:test";
import assert from "node:assert/strict";
import { cleanupDir, createBranchEntries, createSessionManager, createTempWorkspace } from "./helpers.ts";
import { join } from "node:path";

async function importFreshPayload() {
  return await import(`../src/payload.ts?case=${Date.now()}-${Math.random()}`);
}

test("buildStatusLinePayload 复用 transcript 分析结果并生成上下文窗口统计", async () => {
  const originalHome = process.env.HOME;
  const tempRoot = await createTempWorkspace("pi-statusline-payload");
  const homeDir = join(tempRoot, "home");

  try {
    process.env.HOME = homeDir;
    const { buildStatusLinePayload } = await importFreshPayload();
    const entries = createBranchEntries();
    const ctx = {
      cwd: tempRoot,
      model: {
        id: "gpt-test",
        displayName: "GPT Test",
        contextWindow: 1000,
      },
      getContextUsage: () => ({
        tokens: 100,
        percent: 42,
        contextWindow: 1000,
      }),
      sessionManager: createSessionManager(entries),
    };

    const payload = await buildStatusLinePayload(ctx);

    assert.equal(payload.session_id, "session-1");
    assert.equal(payload.model.display_name, "GPT Test");
    assert.equal(payload.context_window.total_input_tokens, 10);
    assert.equal(payload.context_window.total_output_tokens, 4);
    assert.equal(payload.context_window.used_percentage, 1);
    assert.equal(payload.context_window.remaining_percentage, 99);
    assert.deepEqual(payload.context_window.current_usage, {
      input_tokens: 10,
      output_tokens: 4,
      cache_creation_input_tokens: 1,
      cache_read_input_tokens: 2,
    });
    assert.equal(payload.cost.total_cost_usd, 0.5);
    assert.equal(payload.cost.total_duration_ms, 1000);
    assert.equal(payload.exceeds_200k_tokens, false);
    assert.match(payload.transcript_path, /session-1\.jsonl$/);
  } finally {
    process.env.HOME = originalHome;
    await cleanupDir(tempRoot);
  }
});
