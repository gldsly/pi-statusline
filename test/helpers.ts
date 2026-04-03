import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function createTempWorkspace(prefix: string): Promise<string> {
  return await mkdtemp(join(tmpdir(), `${prefix}-`));
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

export async function cleanupDir(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}

export function createSessionManager(entries: any[], sessionId = "session-1") {
  return {
    getSessionId: () => sessionId,
    getSessionFile: () => join(process.env.HOME ?? "", `${sessionId}.jsonl`),
    getBranch: () => entries,
  };
}

export function createBranchEntries() {
  return [
    {
      id: "user-1",
      parentId: null,
      type: "message",
      timestamp: 1000,
      message: { role: "user", timestamp: 1000 },
    },
    {
      id: "assistant-1",
      parentId: "user-1",
      type: "message",
      timestamp: 2000,
      message: {
        role: "assistant",
        timestamp: 2000,
        usage: {
          input: 10,
          output: 4,
          cacheRead: 2,
          cacheWrite: 1,
          totalTokens: 17,
          cost: { total: 0.5 },
        },
      },
    },
  ];
}

export function createLargeBranchEntries(turns: number): any[] {
  const entries: any[] = [];

  for (let i = 1; i <= turns; i++) {
    const userId = `user-${i}`;
    const assistantId = `assistant-${i}`;
    const parentId = i === 1 ? null : `assistant-${i - 1}`;
    const userTimestamp = i * 2000 - 1000;
    const assistantTimestamp = i * 2000;

    entries.push({
      id: userId,
      parentId,
      type: "message",
      timestamp: userTimestamp,
      message: {
        role: "user",
        timestamp: userTimestamp,
      },
    });

    entries.push({
      id: assistantId,
      parentId: userId,
      type: "message",
      timestamp: assistantTimestamp,
      message: {
        role: "assistant",
        timestamp: assistantTimestamp,
        usage: {
          input: 100 + (i % 7),
          output: 30 + (i % 5),
          cacheRead: i % 3,
          cacheWrite: i % 2,
          totalTokens: 130 + (i % 7) + (i % 5) + (i % 3) + (i % 2),
          cost: {
            total: 0.01 * i,
          },
        },
      },
    });
  }

  return entries;
}
