import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { buildStatusLinePayload } from "../src/payload.ts";
import { clearTranscriptCache, ensureClaudeTranscriptAdapter } from "../src/transcript.ts";
import {
  cleanupDir,
  createLargeBranchEntries,
  createSessionManager,
  createTempWorkspace,
} from "./helpers.ts";

function measureMs(startNs: bigint): number {
  return Number(process.hrtime.bigint() - startNs) / 1_000_000;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

async function benchmarkMedianMs(
  sample: () => Promise<number>,
  options: { warmup?: number; repeats?: number } = {},
): Promise<number> {
  const warmup = options.warmup ?? 1;
  const repeats = options.repeats ?? 5;

  for (let i = 0; i < warmup; i++) {
    await sample();
  }

  const values: number[] = [];
  for (let i = 0; i < repeats; i++) {
    values.push(await sample());
  }

  return median(values);
}

function formatMs(value: number): string {
  return `${value.toFixed(2)}ms`;
}

test("性能：transcript 增量追加与缓存命中明显快于全量重建", async (t) => {
  const originalHome = process.env.HOME;
  const tempRoot = await createTempWorkspace("pi-statusline-perf-transcript");
  const homeDir = join(tempRoot, "home");
  const sessionId = "perf-transcript";
  const transcriptPath = join(homeDir, ".pi", "agent", "statusline-transcripts", `${sessionId}.jsonl`);
  const baseEntries = createLargeBranchEntries(1500);
  const appendedEntries = createLargeBranchEntries(1501);

  try {
    await mkdir(homeDir, { recursive: true });
    process.env.HOME = homeDir;

    const fullRebuildMs = await benchmarkMedianMs(async () => {
      clearTranscriptCache();
      await rm(transcriptPath, { force: true });
      const start = process.hrtime.bigint();
      await ensureClaudeTranscriptAdapter(
        { cwd: tempRoot, sessionManager: createSessionManager(baseEntries, sessionId) },
        baseEntries,
      );
      return measureMs(start);
    });

    const appendMs = await benchmarkMedianMs(async () => {
      clearTranscriptCache();
      await rm(transcriptPath, { force: true });
      await ensureClaudeTranscriptAdapter(
        { cwd: tempRoot, sessionManager: createSessionManager(baseEntries, sessionId) },
        baseEntries,
      );

      const start = process.hrtime.bigint();
      await ensureClaudeTranscriptAdapter(
        { cwd: tempRoot, sessionManager: createSessionManager(appendedEntries, sessionId) },
        appendedEntries,
      );
      return measureMs(start);
    });

    const cachedMs = await benchmarkMedianMs(async () => {
      clearTranscriptCache();
      await rm(transcriptPath, { force: true });
      await ensureClaudeTranscriptAdapter(
        { cwd: tempRoot, sessionManager: createSessionManager(appendedEntries, sessionId) },
        appendedEntries,
      );

      const start = process.hrtime.bigint();
      await ensureClaudeTranscriptAdapter(
        { cwd: tempRoot, sessionManager: createSessionManager(appendedEntries, sessionId) },
        appendedEntries,
      );
      return measureMs(start);
    });

    t.diagnostic(
      `全量重建=${formatMs(fullRebuildMs)}, 增量追加=${formatMs(appendMs)}, 缓存命中=${formatMs(cachedMs)}`,
    );

    assert.ok(
      appendMs < fullRebuildMs * 0.5,
      `期望增量追加明显快于全量重建，实际 full=${formatMs(fullRebuildMs)} append=${formatMs(appendMs)}`,
    );
    assert.ok(
      cachedMs < appendMs * 0.5,
      `期望缓存命中明显快于增量追加，实际 append=${formatMs(appendMs)} cached=${formatMs(cachedMs)}`,
    );
  } finally {
    process.env.HOME = originalHome;
    clearTranscriptCache();
    await cleanupDir(tempRoot);
  }
});

test("性能：payload 热路径命中缓存后明显快于首次构建", async (t) => {
  const originalHome = process.env.HOME;
  const tempRoot = await createTempWorkspace("pi-statusline-perf-payload");
  const homeDir = join(tempRoot, "home");
  const sessionId = "perf-payload";
  const entries = createLargeBranchEntries(1500);
  const ctx = {
    cwd: tempRoot,
    model: {
      id: "perf-model",
      displayName: "Perf Model",
      contextWindow: 200_000,
    },
    getContextUsage: () => ({
      tokens: 10_000,
      percent: 50,
      contextWindow: 200_000,
    }),
    sessionManager: createSessionManager(entries, sessionId),
  };
  const transcriptPath = join(homeDir, ".pi", "agent", "statusline-transcripts", `${sessionId}.jsonl`);

  try {
    await mkdir(homeDir, { recursive: true });
    process.env.HOME = homeDir;

    const firstBuildMs = await benchmarkMedianMs(async () => {
      clearTranscriptCache();
      await rm(transcriptPath, { force: true });
      const start = process.hrtime.bigint();
      await buildStatusLinePayload(ctx);
      return measureMs(start);
    });

    const cachedBuildMs = await benchmarkMedianMs(async () => {
      clearTranscriptCache();
      await rm(transcriptPath, { force: true });
      await buildStatusLinePayload(ctx);

      const start = process.hrtime.bigint();
      await buildStatusLinePayload(ctx);
      return measureMs(start);
    });

    t.diagnostic(`首次构建=${formatMs(firstBuildMs)}, 热路径=${formatMs(cachedBuildMs)}`);

    assert.ok(
      cachedBuildMs < firstBuildMs * 0.5,
      `期望 payload 热路径明显快于首次构建，实际 first=${formatMs(firstBuildMs)} cached=${formatMs(cachedBuildMs)}`,
    );
  } finally {
    process.env.HOME = originalHome;
    clearTranscriptCache();
    await cleanupDir(tempRoot);
  }
});
