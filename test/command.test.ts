import test from "node:test";
import assert from "node:assert/strict";
import { runStatusLineCommand } from "../src/command.ts";

test("runStatusLineCommand 返回外部命令输出行", async () => {
  const command = `${process.execPath} -e 'let input="";process.stdin.setEncoding("utf8");process.stdin.on("data",(chunk)=>{input+=chunk;});process.stdin.on("end",()=>{const payload=JSON.parse(input);console.log(payload.message);console.log("done");});'`;

  const lines = await runStatusLineCommand(command, { message: "hello" }, process.cwd());
  assert.deepEqual(lines, ["hello", "done"]);
});

test("runStatusLineCommand 超时后返回空数组", async () => {
  const command = `${process.execPath} -e "setTimeout(() => console.log('late'), 200);"`;
  const lines = await runStatusLineCommand(command, {}, process.cwd(), undefined, 50);
  assert.deepEqual(lines, []);
});
