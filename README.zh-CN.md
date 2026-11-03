# pi-statusline

适用于 pi 的命令驱动状态栏扩展，输入 payload 与 Claude Code 的 statusline 方案兼容。

**可在 pi 中直接复用现有的 Claude Code statusline 脚本。**

For English, see [`README.md`](./README.md).

> 兼容 Claude Code 的 statusline 脚本。已有的 Claude Code statusline 命令，通常可以直接复用到 pi 中，或者只需极少修改。

## 目标

- 尽可能复用现有的 Claude Code statusline 脚本
- 通过 stdin 向外部命令传递类 Claude 的 JSON payload
- 在 pi 中通过 footer 或 widget 渲染命令输出
- 在 session 和 turn 边界触发刷新，并支持 debounce 与取消

## 兼容性说明

这个扩展的设计目标就是兼容 Claude Code statusline 的使用方式：

- 支持使用 Claude Code 风格的 statusline 命令
- 通过 stdin 向命令发送类 Claude 的 JSON payload
- 方便将已有的 Claude Code statusline 脚本迁移到 pi

如果你已经有 Claude Code 的状态栏脚本，例如 `~/.claude/statusline.sh`，通常可以直接在 pi 中复用。

## 安装方式

### 在 pi 中通过 npm 安装

```bash
pi install npm:pi-statusline
```

### 本地开发安装

#### 方式 1：项目本地扩展

将本项目复制或软链接到：

```text
.pi/extensions/pi-statusline/
```

#### 方式 2：作为包安装

这个包通过以下配置暴露扩展入口：

```json
{
  "pi": {
    "extensions": ["./src/index.ts"]
  }
}
```

## pi 配置示例

在 pi 设置中加入 `statusLine` 配置：

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh"
  }
}
```

默认值如下：

- `placement`：`footer`
- `padding`：`0`
- `widgetPlacement`：`belowEditor`
- `debounceMs`：`300`
- `timeoutMs`：可选，默认不启用
- `wrap`：`true`

## 超长输出与窄终端

当状态栏输出宽度超过终端（比如分屏、窗口变窄）时，footer 会**换行**显示，而不是悄悄截断：

- 优先在空格处断行，尽量保证字段完整；
- 续行缩进两格，并保留当前颜色；
- 最多输出四行，避免极窄终端把 footer 撑满屏幕；
- 每行仍会裁剪到终端宽度，不会让 TUI 收到超宽行。

换行宽度取自渲染时的宽度，所以改变窗口/分屏大小会立即生效，不需要重新执行状态栏命令。

把 `wrap` 设为 `false` 可以退回旧的单行截断行为。

## 刷新时机

扩展会在以下事件触发时刷新：

- `session_start`
- `turn_end`
- `model_select`
- `session_compact`
- `session_tree`

## UI 集成

扩展会根据配置调用 `ctx.ui.setFooter()` 或 `ctx.ui.setWidget()`。

## 当前 payload 支持情况

目前已实现：

- `cwd`
- `session_id`
- `model`
- `workspace`
- `context_window`
- `exceeds_200k_tokens`

当前暂时以 `null` 占位：

- `transcript_path`
- `version`
- `cost`
- `rate_limits`
- `vim`
- `agent`
- `worktree`

## 开发说明

当前项目采用 source-first 方式。pi 可以直接加载 TypeScript 扩展，因此这个初始脚手架不需要额外构建步骤。
