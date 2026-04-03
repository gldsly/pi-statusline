import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cleanupDir, createBranchEntries, createSessionManager, createTempWorkspace } from "./helpers.ts";

async function importFreshTranscript() {
  return await import(`../src/transcript.ts?case=${Date.now()}-${Math.random()}`);
}

test("ensureClaudeTranscriptAdapter 追加新消息时复用已有 transcript 并累加统计", async () => {
  const originalHome = process.env.HOME;
  const tempRoot = await createTempWorkspace("pi-statusline-transcript");
  const homeDir = join(tempRoot, "home");

  try {
    process.env.HOME = homeDir;
    const transcript = await importFreshTranscript();
    const initialEntries = createBranchEntries();
    const ctx = {
      cwd: tempRoot,
      sessionManager: createSessionManager(initialEntries),
    };

    const first = await transcript.ensureClaudeTranscriptAdapter(ctx, initialEntries);
    const transcriptPath = join(homeDir, ".pi", "agent", "statusline-transcripts", "session-1.jsonl");
    const firstContent = await readFile(transcriptPath, "utf8");

    assert.equal(first.transcriptPath, transcriptPath);
    assert.equal(first.analysis.totalInputTokens, 10);
    assert.equal(first.analysis.totalOutputTokens, 4);
    assert.equal(first.analysis.totalCostUsd, 0.5);
    assert.equal(first.analysis.totalDurationMs, 1000);
    assert.equal(firstContent.trim().split("\n").length, 2);

    const nextEntries = [
      ...initialEntries,
      {
        id: "assistant-2",
        parentId: "assistant-1",
        type: "message",
        timestamp: 3000,
        message: {
          role: "assistant",
          timestamp: 3000,
          usage: {
            input: 5,
            output: 2,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 7,
            cost: { total: 0.25 },
          },
        },
      },
    ];

    const second = await transcript.ensureClaudeTranscriptAdapter(
      { cwd: tempRoot, sessionManager: createSessionManager(nextEntries) },
      nextEntries,
    );
    const secondContent = await readFile(transcriptPath, "utf8");

    assert.equal(second.transcriptPath, transcriptPath);
    assert.equal(second.analysis.totalInputTokens, 15);
    assert.equal(second.analysis.totalOutputTokens, 6);
    assert.equal(second.analysis.totalCostUsd, 0.75);
    assert.equal(second.analysis.totalDurationMs, 2000);
    assert.ok(secondContent.startsWith(firstContent));
    assert.equal(secondContent.trim().split("\n").length, 3);

    transcript.clearTranscriptCache();
  } finally {
    process.env.HOME = originalHome;
    await cleanupDir(tempRoot);
  }
});
