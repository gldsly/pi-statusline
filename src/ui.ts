import type { StatusLineCommandConfig } from "./types";

const UI_KEY = "pi-statusline";

function padLines(lines: string[], padding: number): string[] {
  const pad = " ".repeat(Math.max(0, padding));
  return lines.length === 0 ? [""] : lines.map((line) => `${pad}${line}`);
}

function skipAnsiSequence(line: string, start: number): number {
  const next = line[start + 1];

  if (next === "[") {
    let i = start + 2;
    while (i < line.length) {
      const ch = line.charCodeAt(i);
      if (ch >= 0x40 && ch <= 0x7e) {
        return i + 1;
      }
      i++;
    }
    return line.length;
  }

  if (next === "]") {
    let i = start + 2;
    while (i < line.length) {
      if (line[i] === "\u0007") {
        return i + 1;
      }
      if (line[i] === "\u001b" && line[i + 1] === "\\") {
        return i + 2;
      }
      i++;
    }
    return line.length;
  }

  return Math.min(line.length, start + 2);
}

function truncateLine(line: string, maxWidth: number): string {
  if (maxWidth <= 0) return "";

  let output = "";
  let width = 0;

  for (let i = 0; i < line.length; ) {
    if (line[i] === "\u001b") {
      const end = skipAnsiSequence(line, i);
      output += line.slice(i, end);
      i = end;
      continue;
    }

    if (width >= maxWidth) {
      return output;
    }

    output += line[i];
    width++;
    i++;
  }

  return output;
}

const SGR_RESET = "\u001b[0m";

/** Symbols that most terminals render two cells wide. Over-reporting is safe (it shortens lines). */
function isWideCodePoint(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    cp === 0x231a ||
    cp === 0x231b ||
    (cp >= 0x23e9 && cp <= 0x23ec) ||
    cp === 0x23f0 ||
    (cp >= 0x23f1 && cp <= 0x23f3) ||
    (cp >= 0x25fd && cp <= 0x25fe) ||
    (cp >= 0x2614 && cp <= 0x2615) ||
    (cp >= 0x2648 && cp <= 0x2653) ||
    (cp >= 0x267f && cp <= 0x267f) ||
    (cp >= 0x2693 && cp <= 0x2693) ||
    (cp >= 0x26a1 && cp <= 0x26a1) ||
    (cp >= 0x26aa && cp <= 0x26ab) ||
    (cp >= 0x26bd && cp <= 0x26be) ||
    (cp >= 0x2705 && cp <= 0x2705) ||
    (cp >= 0x270a && cp <= 0x270b) ||
    (cp >= 0x2728 && cp <= 0x2728) ||
    (cp >= 0x274c && cp <= 0x274c) ||
    (cp >= 0x2753 && cp <= 0x2755) ||
    (cp >= 0x2795 && cp <= 0x2797) ||
    (cp >= 0x27b0 && cp <= 0x27b0) ||
    (cp >= 0x27bf && cp <= 0x27bf) ||
    (cp >= 0x2b1b && cp <= 0x2b1c) ||
    (cp >= 0x2b50 && cp <= 0x2b50) ||
    (cp >= 0x2b55 && cp <= 0x2b55) ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xa960 && cp <= 0xa97f) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe10 && cp <= 0xfe19) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f004 && cp <= 0x1f004) ||
    (cp >= 0x1f0cf && cp <= 0x1f0cf) ||
    (cp >= 0x1f18e && cp <= 0x1f18e) ||
    (cp >= 0x1f191 && cp <= 0x1f19a) ||
    (cp >= 0x1f200 && cp <= 0x1f320) ||
    (cp >= 0x1f32d && cp <= 0x1f335) ||
    (cp >= 0x1f337 && cp <= 0x1f37c) ||
    (cp >= 0x1f37e && cp <= 0x1f393) ||
    (cp >= 0x1f3a0 && cp <= 0x1f3ca) ||
    (cp >= 0x1f3cf && cp <= 0x1f3d3) ||
    (cp >= 0x1f3e0 && cp <= 0x1f3f0) ||
    (cp >= 0x1f3f4 && cp <= 0x1f3f4) ||
    (cp >= 0x1f3f8 && cp <= 0x1f43e) ||
    (cp >= 0x1f440 && cp <= 0x1f440) ||
    (cp >= 0x1f442 && cp <= 0x1f4fc) ||
    (cp >= 0x1f4ff && cp <= 0x1f53d) ||
    (cp >= 0x1f54b && cp <= 0x1f54e) ||
    (cp >= 0x1f550 && cp <= 0x1f567) ||
    (cp >= 0x1f57a && cp <= 0x1f57a) ||
    (cp >= 0x1f595 && cp <= 0x1f596) ||
    (cp >= 0x1f5a4 && cp <= 0x1f5a4) ||
    (cp >= 0x1f5fb && cp <= 0x1f5ff) ||
    (cp >= 0x1f601 && cp <= 0x1f64f) ||
    (cp >= 0x1f680 && cp <= 0x1f6c5) ||
    (cp >= 0x1f6cc && cp <= 0x1f6cc) ||
    (cp >= 0x1f6d0 && cp <= 0x1f6d2) ||
    (cp >= 0x1f6eb && cp <= 0x1f6ec) ||
    (cp >= 0x1f6f4 && cp <= 0x1f6fc) ||
    (cp >= 0x1f7e0 && cp <= 0x1f7eb) ||
    (cp >= 0x1f90c && cp <= 0x1f93a) ||
    (cp >= 0x1f93c && cp <= 0x1f945) ||
    (cp >= 0x1f947 && cp <= 0x1f9ff) ||
    (cp >= 0x1fa70 && cp <= 0x1faff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  );
}

function charWidth(cp: number): number {
  if (cp < 32) return 0;
  if (cp >= 0x7f && cp < 0xa0) return 0;
  if (cp >= 0x0300 && cp <= 0x036f) return 0; // combining marks
  if (cp >= 0xfe00 && cp <= 0xfe0f) return 0; // variation selectors
  if (cp === 0x200d) return 0; // zero width joiner
  return isWideCodePoint(cp) ? 2 : 1;
}

interface Chunk {
  text: string;
  width: number;
  space: boolean;
  sgr: string | null;
}

/** Split a line into printable chunks (one per visible character) and ANSI chunks. */
function analyzeLine(line: string): Chunk[] {
  const chunks: Chunk[] = [];

  for (let i = 0; i < line.length; ) {
    if (line[i] === "\u001b") {
      const end = skipAnsiSequence(line, i);
      const seq = line.slice(i, end);
      chunks.push({
        text: seq,
        width: 0,
        space: false,
        sgr: seq.endsWith("m") ? seq : null,
      });
      i = end;
      continue;
    }

    const cp = line.codePointAt(i) ?? 0;
    const text = String.fromCodePoint(cp);
    chunks.push({ text, width: charWidth(cp), space: text === " " });
    i += text.length;
  }

  return chunks;
}

function measureLine(line: string): number {
  let width = 0;
  for (const chunk of analyzeLine(line)) width += chunk.width;
  return width;
}

/** Reproduce the SGR state that is active right before `index`, so a wrapped line keeps its colours. */
function styleAt(chunks: Chunk[], index: number): string {
  let style = "";

  for (let i = 0; i < index; i++) {
    const sgr = chunks[i].sgr;
    if (!sgr) continue;

    const params = sgr.slice(2, -1);
    if (params === "" || params.split(";").some((part) => part === "" || part === "0")) {
      style = "";
    } else {
      style += sgr;
    }
  }

  return style;
}

/**
 * Wrap one statusline row into several rows that each fit `maxWidth` cells.
 *
 * Breaks happen at spaces when possible (statusline scripts separate fields with spaces), styles are
 * re-opened on the continuation rows, and at most `maxLines` rows are produced so a very long line
 * can never eat the whole screen. The caller still truncates every row, so a single unbreakable
 * field wider than the terminal is handled the same way it was before.
 */
export function wrapLine(line: string, maxWidth: number, indent = "  ", maxLines = 4): string[] {
  if (maxWidth <= 0) return [""];
  if (measureLine(line) <= maxWidth) return [line];

  const chunks = analyzeLine(line);
  const rows: string[] = [];
  let start = 0;
  let prefix = "";

  while (start < chunks.length) {
    if (rows.length >= maxLines) {
      // Out of rows: fold the rest into the last row, the caller clamps it to the terminal width.
      const rest = chunks.slice(start);
      const last = rows[rows.length - 1];
      const needsSpace = rest.length > 0 && !rest[0].space && !last.endsWith(" ");
      rows[rows.length - 1] =
        last + (needsSpace ? " " : "") + rest.map((chunk) => chunk.text).join("");
      break;
    }

    const pieces: string[] = prefix ? [prefix] : [];
    let width = prefix ? measureLine(prefix) : 0;
    let lastSpaceChunk = -1;
    let lastSpacePieces = -1;
    let next = start;

    for (; next < chunks.length; next++) {
      const chunk = chunks[next];
      if (width + chunk.width > maxWidth) break;
      pieces.push(chunk.text);
      width += chunk.width;
      if (chunk.space) {
        lastSpaceChunk = next;
        lastSpacePieces = pieces.length - 1;
      }
    }

    if (next >= chunks.length) {
      rows.push(pieces.join(""));
      break;
    }

    // A single character that does not even fit on its own row: emit it anyway, the caller truncates.
    if (next === start) {
      pieces.push(chunks[next].text);
      rows.push(pieces.join(""));
      start = next + 1;
      prefix = indent + styleAt(chunks, start);
      continue;
    }

    if (lastSpaceChunk >= start) {
      rows.push(pieces.slice(0, lastSpacePieces).join("") + (styleAt(chunks, lastSpaceChunk) ? SGR_RESET : ""));
      start = lastSpaceChunk + 1;
    } else {
      rows.push(pieces.join("") + (styleAt(chunks, next) ? SGR_RESET : ""));
      start = next;
    }

    prefix = indent + styleAt(chunks, start);
  }

  return rows.length > 0 ? rows : [line];
}

export function clearStatusLineUi(ctx: any): void {
  ctx.ui.setWidget(UI_KEY, undefined);
  ctx.ui.setFooter(undefined);
}

export function applyStatusLineUi(ctx: any, config: StatusLineCommandConfig, lines: string[]): void {
  const padded = padLines(lines, config.padding ?? 0);

  if (config.placement === "widget") {
    ctx.ui.setWidget(UI_KEY, padded, {
      placement: config.widgetPlacement ?? "belowEditor",
    });
    ctx.ui.setFooter(undefined);
    return;
  }

  ctx.ui.setWidget(UI_KEY, undefined);
  ctx.ui.setFooter(() => ({
    render(width: number) {
      if (config.wrap === false) {
        return padded.map((line) => truncateLine(line, width));
      }
      // Wrap instead of dropping fields when the terminal (or a split pane) is narrower than the line.
      return padded.flatMap((line) =>
        wrapLine(line, width).map((row) => truncateLine(row, width)),
      );
    },
    invalidate() {
      // static until next refresh
    },
  }));
}
