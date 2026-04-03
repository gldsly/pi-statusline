import { spawn } from "node:child_process";

function stopChild(child: ReturnType<typeof spawn>): void {
  try {
    child.kill("SIGTERM");
  } catch {
    // ignore
  }
}

export async function runStatusLineCommand(
  command: string,
  payload: unknown,
  cwd: string,
  signal?: AbortSignal,
  timeoutMs?: number,
): Promise<string[]> {
  return await new Promise((resolve) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const finish = (lines: string[]) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      if (signal) signal.removeEventListener("abort", abortHandler);
      resolve(lines);
    };

    const abortHandler = () => {
      stopChild(child);
      finish([]);
    };

    if (signal) {
      if (signal.aborted) {
        abortHandler();
        return;
      }
      signal.addEventListener("abort", abortHandler, { once: true });
    }

    if (typeof timeoutMs === "number" && timeoutMs > 0) {
      // 防止外部状态栏脚本长期挂起，阻塞后续刷新。
      timeout = setTimeout(() => {
        stopChild(child);
        finish([]);
      }, timeoutMs);
    }

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.on("error", () => {
      finish([]);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        finish([]);
        return;
      }

      const text = stdout.trim().replace(/\r\n/g, "\n");
      finish(text ? text.split("\n") : []);
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
