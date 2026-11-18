// End to end over the real transport: `node bin/server.mjs` with no build step and no flags.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const BIN = fileURLToPath(new URL("../bin/server.mjs", import.meta.url));

function start() {
  const child = spawn(process.execPath, [BIN], { stdio: ["pipe", "pipe", "pipe"] });
  let out = "";
  let err = "";
  const waiting = [];
  child.stderr.setEncoding("utf8").on("data", (d) => (err += d));
  child.stdout.setEncoding("utf8").on("data", (d) => {
    out += d;
    let nl;
    while ((nl = out.indexOf("\n")) >= 0) {
      const line = out.slice(0, nl);
      out = out.slice(nl + 1);
      waiting.shift()?.(JSON.parse(line));
    }
  });
  let id = 0;
  const send = (msg) => child.stdin.write(`${JSON.stringify(msg)}\n`);
  const request = (method, params) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no answer to ${method}; stderr: ${err}`)), 20_000);
      waiting.push((m) => {
        clearTimeout(timer);
        resolve(m);
      });
      send({ jsonrpc: "2.0", id: ++id, method, ...(params ? { params } : {}) });
    });
  const raw = (line) =>
    new Promise((resolve) => {
      waiting.push(resolve);
      child.stdin.write(`${line}\n`);
    });
  return { child, send, request, raw, stderr: () => err };
}

describe("stdio session", () => {
  const s = start();
  afterAll(() => s.child.kill());

  it("runs initialize, tools/list, every tool and the error paths", async () => {
    const init = await s.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
    expect(init.result.protocolVersion).toBe("2025-06-18");
    s.send({ jsonrpc: "2.0", method: "notifications/initialized" });

    const list = await s.request("tools/list");
    expect(list.result.tools).toHaveLength(5);

    const call = (name, args) => s.request("tools/call", { name, arguments: args });
    const lessons = (await call("list_lessons", { lang: "uz" })).result.structuredContent;
    expect(lessons.count).toBeGreaterThan(10);
    const slug = lessons.lessons[0].slug;

    const lesson = (await call("get_lesson", { slug, lang: "uz" })).result;
    expect(lesson.structuredContent.steps.length).toBeGreaterThan(5);
    expect(lesson.content[0].text).not.toMatch(/[Ѐ-ӿ]/);

    const valid = (await call("validate_lesson", { lesson: { lesson: { slug: "x" } } })).result.structuredContent;
    expect(valid.valid).toBe(false);

    const d2 = (await call("export_diagram", { slug, lang: "en", format: "d2" })).result;
    expect(d2.content[0].text).toMatch(/->/);

    const rubric = (await call("practice_rubric", { slug, lang: "ru" })).result.structuredContent;
    expect(Array.isArray(rubric.rules)).toBe(true);

    expect((await s.request("no/such/method")).error.code).toBe(-32601);
    expect((await call("get_lesson", { slug: 1 })).error.code).toBe(-32602);
    expect((await s.raw("{oops")).error.code).toBe(-32700);
    expect((await s.request("ping")).result).toEqual({});

    // stdout carried JSON only; the server's own notes went to stderr
    expect(s.stderr()).toMatch(/ready on stdio/);
  }, 60_000);
});
