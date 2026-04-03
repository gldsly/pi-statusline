import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { runStatusLineCommand } from "./command";
import { readStatusLineConfig, clearConfigCache } from "./config";
import { buildStatusLinePayload } from "./payload";
import { clearTranscriptCache } from "./transcript";
import { applyStatusLineUi, clearStatusLineUi } from "./ui";

interface RenderState {
  command: string;
  placement: "footer" | "widget";
  padding: number;
  widgetPlacement: "aboveEditor" | "belowEditor";
  lines: string[];
}

function isSameRenderState(previous: RenderState | null, next: RenderState): boolean {
  if (!previous) return false;
  if (previous.command !== next.command) return false;
  if (previous.placement !== next.placement) return false;
  if (previous.padding !== next.padding) return false;
  if (previous.widgetPlacement !== next.widgetPlacement) return false;
  if (previous.lines.length !== next.lines.length) return false;

  for (let i = 0; i < previous.lines.length; i++) {
    if (previous.lines[i] !== next.lines[i]) return false;
  }

  return true;
}

export default function (pi: ExtensionAPI) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let lastRenderState: RenderState | null = null;
  let refreshToken = 0;

  async function refresh(ctx: any): Promise<void> {
    if (!ctx.hasUI) return;

    const refreshId = ++refreshToken;
    const config = readStatusLineConfig(ctx.cwd);

    if (!config) {
      controller?.abort();
      controller = null;
      if (lastRenderState !== null) {
        clearStatusLineUi(ctx);
        lastRenderState = null;
      }
      return;
    }

    const payload = await buildStatusLinePayload(ctx);
    if (refreshId !== refreshToken) return;

    controller?.abort();
    const currentController = new AbortController();
    controller = currentController;

    const lines = await runStatusLineCommand(
      config.command,
      payload,
      ctx.cwd,
      currentController.signal,
      config.timeoutMs,
    );

    if (refreshId !== refreshToken || controller !== currentController || currentController.signal.aborted) {
      return;
    }

    const nextRenderState: RenderState = {
      command: config.command,
      placement: config.placement ?? "footer",
      padding: config.padding ?? 0,
      widgetPlacement: config.widgetPlacement ?? "belowEditor",
      lines,
    };

    if (isSameRenderState(lastRenderState, nextRenderState)) return;
    lastRenderState = nextRenderState;
    applyStatusLineUi(ctx, config, lines);
  }

  function scheduleRefresh(ctx: any): void {
    if (timer) clearTimeout(timer);
    const debounceMs = readStatusLineConfig(ctx.cwd)?.debounceMs ?? 300;
    timer = setTimeout(() => {
      timer = null;
      void refresh(ctx);
    }, debounceMs);
  }

  function invalidateBranchCaches(): void {
    clearTranscriptCache();
  }

  pi.on("session_start", async (_event, ctx) => {
    scheduleRefresh(ctx);
  });

  pi.on("turn_end", async (_event, ctx) => {
    scheduleRefresh(ctx);
  });

  pi.on("model_select", async (_event, ctx) => {
    scheduleRefresh(ctx);
  });

  pi.on("session_compact", async (_event, ctx) => {
    invalidateBranchCaches();
    scheduleRefresh(ctx);
  });

  pi.on("session_tree", async (_event, ctx) => {
    invalidateBranchCaches();
    scheduleRefresh(ctx);
  });

  pi.on("session_switch", async (_event, ctx) => {
    invalidateBranchCaches();
    scheduleRefresh(ctx);
  });

  pi.on("session_fork", async (_event, ctx) => {
    invalidateBranchCaches();
    scheduleRefresh(ctx);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    if (timer) clearTimeout(timer);
    controller?.abort();
    controller = null;
    lastRenderState = null;
    clearStatusLineUi(ctx);
    clearConfigCache(ctx.cwd);
    clearTranscriptCache();
  });

  pi.registerCommand("statusline-refresh", {
    description: "Refresh the statusline now",
    handler: async (_args, ctx) => {
      if (timer) clearTimeout(timer);
      await refresh(ctx);
      ctx.ui.notify("Statusline refreshed", "info");
    },
  });
}
