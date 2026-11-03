import test from "node:test";
import assert from "node:assert/strict";
import { applyStatusLineUi, wrapLine } from "../src/ui.ts";
import type { StatusLineCommandConfig } from "../src/types.ts";

const SAMPLE =
  "\u001b[38;5;117m\u001b[1m~/dev/project\u001b[0m \u001b[38;5;238m│\u001b[0m " +
  "\u001b[38;5;176m⎇ main*\u001b[0m \u001b[38;5;238m│\u001b[0m " +
  "\u001b[48;5;236m \u001b[38;5;146mdemo-model\u001b[0m\u001b[48;5;236m \u001b[0m " +
  "\u001b[38;5;238m│\u001b[0m \u001b[38;5;114m████░░░░\u001b[0m 12% 15k/128k " +
  "\u001b[38;5;238m│\u001b[0m \u001b[38;5;221m↯42 t/s\u001b[0m " +
  "\u001b[38;5;238m│\u001b[0m \u001b[38;5;243m◷ 12m\u001b[0m " +
  "\u001b[38;5;238m│\u001b[0m \u001b[38;5;108m$0.0123\u001b[0m";

const MODEL_CHIP =
  "\u001b[48;5;236m \u001b[38;5;146mdemo model name\u001b[0m\u001b[48;5;236m \u001b[0m";

function stripAnsi(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; ) {
    if (value[i] === "\u001b") {
      let j = i + 2;
      if (value[i + 1] === "[") {
        while (j < value.length) {
          const code = value.charCodeAt(j);
          j++;
          if (code >= 0x40 && code <= 0x7e) break;
        }
      }
      i = j;
      continue;
    }
    out += value[i];
    i++;
  }
  return out;
}

function width(value: string): number {
  return [...stripAnsi(value)].length;
}

test("wrapLine 在宽度足够时保持单行原样输出", () => {
  const rows = wrapLine(SAMPLE, 200);
  assert.equal(rows.length, 1);
  assert.equal(rows[0], SAMPLE);
});

test("wrapLine 在窄终端下换行，且宽度够时不会丢字段", () => {
  for (const maxWidth of [80, 60, 48, 40, 30, 20, 10]) {
    const rows = wrapLine(SAMPLE, maxWidth);
    assert.ok(rows.length > 1, `宽度 ${maxWidth} 应当换行`);
    // 行数未到上限时，每一行都必须装得下
    if (rows.length < 4) {
      for (const row of rows) {
        assert.ok(width(row) <= maxWidth, `宽度 ${maxWidth} 下出现超宽行: ${width(row)}`);
      }
    }
    // 宽度还装得下单个字段时，所有字段都必须完整出现
    if (maxWidth >= 48) {
      const joined = rows.map((row) => stripAnsi(row)).join(" ").replace(/\s+/g, " ");
      for (const field of [
        "~/dev/project",
        "⎇ main*",
        "demo-model",
        "15k/128k",
        "↯42 t/s",
        "◷ 12m",
        "$0.0123",
      ]) {
        assert.ok(joined.includes(field), `宽度 ${maxWidth} 下丢失字段 ${field}`);
      }
    }
  }
});

test("wrapLine 优先在空格处断行，续行以两空格缩进", () => {
  for (const maxWidth of [100, 60, 40]) {
    const rows = wrapLine(SAMPLE, maxWidth);
    for (const row of rows.slice(1)) {
      const visible = stripAnsi(row);
      if (visible.replace(/\s/g, "") === "") continue;
      assert.ok(visible.startsWith("  "), `续行应以两空格缩进: ${JSON.stringify(visible)}`);
      assert.ok(!visible.startsWith("   "), `续行不应吃掉断点处的空格: ${JSON.stringify(visible)}`);
    }
  }
});

test("wrapLine 在断行处保留颜色状态", () => {
  const rows = wrapLine(MODEL_CHIP, 12);
  assert.equal(rows.length, 2);
  assert.ok(rows[1].startsWith("  \u001b["), "续行应以缩进 + 颜色序列开头");
  assert.ok(rows[1].includes("\u001b[38;5;146m"), "续行应恢复被断开的字段的前景色");
  assert.equal(stripAnsi(rows[1]).trimStart().split(" ")[0], "name");
});

test("wrapLine 限制最大行数，剩余内容折叠进最后一行", () => {
  const rows = wrapLine(SAMPLE, 10, "  ", 4);
  assert.equal(rows.length, 4);
  assert.equal(wrapLine(SAMPLE, 10, "  ", 2).length, 2);
  const joined = rows.map((row) => stripAnsi(row)).join(" ").replace(/\s+/g, " ");
  assert.ok(joined.includes("$0.0123"), "折叠后的最后一行仍应包含尾部信息，由调用方裁剪");
});

test("wrapLine 对空行与超窄宽度保持安全", () => {
  assert.deepEqual(wrapLine("", 10), [""]);
  assert.deepEqual(wrapLine(SAMPLE, 0), [""]);
  const rows = wrapLine(SAMPLE, 1);
  assert.equal(rows.length, 4);
  assert.ok(rows.every((row) => typeof row === "string"));
});

function renderFooter(config: Partial<StatusLineCommandConfig>, lines: string[], maxWidth: number): string[] {
  let factory: any;
  const ctx = {
    ui: {
      setWidget() {},
      setFooter(next: any) {
        factory = next;
      },
    },
  };

  applyStatusLineUi(
    ctx,
    {
      type: "command",
      command: "statusline.sh",
      placement: "footer",
      padding: 0,
      ...config,
    } as StatusLineCommandConfig,
    lines,
  );

  return factory().render(maxWidth);
}

test("footer 默认换行，窄终端下不会丢字段", () => {
  const wrapped = renderFooter({}, [SAMPLE], 60);
  assert.ok(wrapped.length >= 2, "窄终端下应当换行");
  for (const row of wrapped) assert.ok(width(row) <= 60);
  assert.ok(wrapped.some((row) => stripAnsi(row).includes("$0.0123")), "换行后必须保留最后的字段");
});

test("footer 在 wrap:false 时退回单行截断", () => {
  const truncated = renderFooter({ wrap: false }, [SAMPLE], 60);
  assert.equal(truncated.length, 1);
  assert.ok(width(truncated[0]) <= 60);
  assert.ok(!stripAnsi(truncated[0]).includes("$0.0123"), "截断模式下尾部字段会丢失");
});

test("footer 任何宽度下都不输出超过终端宽度的行", () => {
  for (const maxWidth of [120, 80, 60, 48, 40, 30, 20, 10, 5, 1]) {
    for (const row of renderFooter({}, [SAMPLE], maxWidth)) {
      assert.ok(width(row) <= maxWidth, `宽度 ${maxWidth} 下出现超宽行: ${width(row)}`);
    }
  }
});

test("footer 支持多行命令输出（换行只影响超宽行）", () => {
  const rows = renderFooter({}, ["first line", SAMPLE], 200);
  assert.equal(rows.length, 2);
  assert.equal(stripAnsi(rows[0]), "first line");
});
