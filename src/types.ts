export type StatusLinePlacement = "footer" | "widget";

export interface StatusLineCommandConfig {
  type: "command";
  command: string;
  placement?: StatusLinePlacement;
  padding?: number;
  widgetPlacement?: "aboveEditor" | "belowEditor";
  debounceMs?: number;
  timeoutMs?: number;
  /** Wrap long output onto extra footer rows instead of truncating it. Defaults to `true`. */
  wrap?: boolean;
}

export interface StatusLineSettings {
  statusLine?: Partial<StatusLineCommandConfig>;
}

export interface ClaudeLikeStatusLineInput {
  cwd: string;
  session_id: string | null;
  transcript_path: string;
  model: {
    id: string | null;
    display_name: string | null;
  };
  workspace: {
    current_dir: string;
    project_dir: string;
  };
  version: string | null;
  output_style: {
    name: string | null;
  };
  cost: {
    total_cost_usd: number | null;
    total_duration_ms: number | null;
    total_api_duration_ms: number | null;
    total_lines_added: number | null;
    total_lines_removed: number | null;
  };
  context_window: {
    total_input_tokens: number | null;
    total_output_tokens: number | null;
    context_window_size: number | null;
    used_percentage: number | null;
    remaining_percentage: number | null;
    current_usage: {
      input_tokens: number | null;
      output_tokens: number | null;
      cache_creation_input_tokens: number | null;
      cache_read_input_tokens: number | null;
    } | null;
  };
  exceeds_200k_tokens: boolean;
  rate_limits: unknown | null;
  vim: { mode: string | null } | null;
  agent: { name: string | null } | null;
  worktree: {
    name: string | null;
    path: string | null;
    branch: string | null;
    original_cwd: string | null;
    original_branch: string | null;
  } | null;
  pi: {
    session_file: string | null;
    refreshed_at_ms: number;
  };
}
