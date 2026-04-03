import {
  ensureClaudeTranscriptAdapter,
  getPiBranchEntries,
  getPiSessionFile,
  getPiSessionId,
} from "./transcript";
import type { ClaudeLikeStatusLineInput } from "./types";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function buildCurrentUsage(
  latestUsage: Record<string, unknown> | null,
  contextUsage: Record<string, unknown>,
) {
  if (asNumber(contextUsage.tokens) === null) {
    return null;
  }

  if (!latestUsage) {
    return null;
  }

  return {
    input_tokens: asNumber(latestUsage.input),
    output_tokens: asNumber(latestUsage.output),
    cache_creation_input_tokens: asNumber(latestUsage.cacheWrite),
    cache_read_input_tokens: asNumber(latestUsage.cacheRead),
  };
}

function computeUsedPercentage(
  currentUsage: ClaudeLikeStatusLineInput["context_window"]["current_usage"],
  contextWindowSize: number | null,
  fallbackPercent: number | null,
): number | null {
  if (currentUsage && contextWindowSize && contextWindowSize > 0) {
    const usedInputTokens =
      (currentUsage.input_tokens ?? 0) +
      (currentUsage.cache_creation_input_tokens ?? 0) +
      (currentUsage.cache_read_input_tokens ?? 0);
    return Math.round((usedInputTokens / contextWindowSize) * 100);
  }

  return fallbackPercent !== null ? Math.round(fallbackPercent) : null;
}

export async function buildStatusLinePayload(ctx: any): Promise<ClaudeLikeStatusLineInput> {
  const contextUsage = asRecord(ctx.getContextUsage?.() ?? null);
  const model = asRecord(ctx.model ?? null);
  const sessionId = getPiSessionId(ctx);
  const sessionFile = getPiSessionFile(ctx);
  const branchEntries = getPiBranchEntries(ctx);
  const { transcriptPath, analysis } = await ensureClaudeTranscriptAdapter(ctx, branchEntries);
  const latestUsage = analysis.latestUsage;

  const contextWindowSize =
    asNumber(contextUsage.contextWindow) ??
    asNumber(model.contextWindow) ??
    asNumber(model.contextWindowSize);

  const currentUsage = buildCurrentUsage(latestUsage, contextUsage);
  const usedPercentage = computeUsedPercentage(
    currentUsage,
    contextWindowSize,
    asNumber(contextUsage.percent),
  );
  const remainingPercentage =
    typeof usedPercentage === "number" ? Math.max(0, 100 - usedPercentage) : null;

  const latestUsageTotalTokens =
    asNumber(latestUsage?.totalTokens) ??
    (() => {
      if (!latestUsage) return null;
      const input = asNumber(latestUsage.input) ?? 0;
      const output = asNumber(latestUsage.output) ?? 0;
      const cacheRead = asNumber(latestUsage.cacheRead) ?? 0;
      const cacheWrite = asNumber(latestUsage.cacheWrite) ?? 0;
      return input + output + cacheRead + cacheWrite;
    })();

  return {
    cwd: ctx.cwd,
    session_id: sessionId ?? sessionFile ?? transcriptPath,
    transcript_path: transcriptPath,
    model: {
      id: asString(model.id),
      display_name:
        asString(model.displayName) ??
        asString(model.name) ??
        asString(model.id),
    },
    workspace: {
      current_dir: ctx.cwd,
      project_dir: ctx.cwd,
    },
    version: null,
    output_style: {
      name: "default",
    },
    cost: {
      total_cost_usd: analysis.totalCostUsd,
      total_duration_ms: analysis.totalDurationMs,
      total_api_duration_ms: null,
      total_lines_added: null,
      total_lines_removed: null,
    },
    context_window: {
      total_input_tokens: analysis.totalInputTokens,
      total_output_tokens: analysis.totalOutputTokens,
      context_window_size: contextWindowSize,
      used_percentage: usedPercentage,
      remaining_percentage: remainingPercentage,
      current_usage: currentUsage,
    },
    exceeds_200k_tokens: latestUsageTotalTokens !== null ? latestUsageTotalTokens > 200000 : false,
    rate_limits: null,
    vim: null,
    agent: null,
    worktree: null,
    pi: {
      session_file: sessionFile,
      refreshed_at_ms: Date.now(),
    },
  };
}
