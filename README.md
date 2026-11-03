# pi-statusline

A command-driven statusline extension for pi with a Claude Code-compatible input payload.

**Reuse your existing Claude Code statusline scripts in pi.**

English | [简体中文](./README.zh-CN.md)

> Compatible with Claude Code statusline scripts. You can usually reuse existing Claude Code statusline commands in pi with little or no modification.

## Goals

- Reuse existing Claude Code statusline scripts where practical
- Feed a Claude-like JSON payload to an external command over stdin
- Render the command output in pi using a footer or a widget
- Refresh on session and turn boundaries with debounce and cancellation

## Compatibility

This extension is designed to be compatible with the Claude Code statusline workflow:

- accepts a Claude Code-compatible statusline command
- sends a Claude-like JSON payload to the command via stdin
- makes it easier to migrate existing Claude Code statusline scripts to pi

If you already have a Claude Code statusline script such as `~/.claude/statusline.sh`, you can usually point pi to the same script directly.

## Installation

### Install from npm in pi

```bash
pi install npm:pi-statusline
```

### Install locally for development

#### Option 1: project-local extension

Copy or symlink this project into:

```text
.pi/extensions/pi-statusline/
```

#### Option 2: package-based install

This package exposes its extension entry via:

```json
{
  "pi": {
    "extensions": ["./src/index.ts"]
  }
}
```

## Example pi settings

Add a `statusLine` block to your pi settings:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh"
  }
}
```

Defaults:

- `placement`: `footer`
- `padding`: `0`
- `widgetPlacement`: `belowEditor`
- `debounceMs`: `300`
- `timeoutMs`: optional, disabled by default
- `wrap`: `true`

## Long output and narrow terminals

When the statusline output is wider than the terminal (for example after splitting panes, or in a
small window), the footer **wraps** it onto extra rows instead of silently truncating it:

- breaks happen at spaces first, so fields stay intact as long as possible;
- continuation rows are indented by two spaces and keep the active colours;
- at most four rows are produced, so a very narrow terminal cannot push the footer off the screen;
- rows are still clamped to the terminal width, so the TUI never sees an over-wide line.

Wrapping uses the width reported at render time, so resizing the terminal or dragging a split takes
effect immediately without re-running the statusline command.

Set `wrap: false` to get the old single-row behaviour (truncate at the terminal width).

## Refresh model

The extension refreshes on:

- `session_start`
- `turn_end`
- `model_select`
- `session_compact`
- `session_tree`

## UI integration

The extension uses `ctx.ui.setFooter()` or `ctx.ui.setWidget()` depending on configuration.

## Current payload support

Implemented now:

- `cwd`
- `session_id`
- `model`
- `workspace`
- `context_window`
- `exceeds_200k_tokens`

Stubbed as `null` for now:

- `transcript_path`
- `version`
- `cost`
- `rate_limits`
- `vim`
- `agent`
- `worktree`

## Development notes

This project is intentionally source-first. pi loads TypeScript extensions directly, so there is no build step in the initial scaffold.
