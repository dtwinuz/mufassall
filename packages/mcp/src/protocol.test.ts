import { describe, expect, it } from "vitest";
import { lessons, order } from "../../../content/index";
import { createMufassallServer } from "./main";
import { ERR, PROTOCOL_VERSION, createServer } from "./protocol";

type Msg = { jsonrpc: string; id: unknown; result?: any; error?: { code: number; message: string; data?: unknown } };

function session() {
  const server = createMufassallServer();
  let next = 1;
  const call = (method: string, params?: unknown): Msg => {
    const line = server.handleLine(JSON.stringify({ jsonrpc: "2.0", id: next++, method, ...(params === undefined ? {} : { params }) }));
    expect(line).not.toBeNull();
    expect(line).not.toContain("\n");
    return JSON.parse(line!) as Msg;
  };
  const tool = (name: string, args: unknown) => call("tools/call", { name, arguments: args });
  return { server, call, tool };
}

function initialized() {
  const s = session();
  s.call("initialize", { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "test", version: "1" } });
  expect(s.server.handleLine(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }))).toBeNull();
  return s;
}

describe("lifecycle", () => {
  it("initializes with the asked version, its capabilities and server info", () => {
    const { call } = session();
    const r = call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } });
    expect(r.result.protocolVersion).toBe("2025-06-18");
    expect(r.result.capabilities.tools).toEqual({ listChanged: false });
    expect(r.result.capabilities.resources).toBeDefined();
    expect(r.result.serverInfo).toMatchObject({ name: "mufassall", version: expect.any(String) });
    expect(r.result.instructions).toMatch(/list_lessons/);
  });

  it("keeps an older supported version and answers an unknown one with the newest", () => {
    expect(session().call("initialize", { protocolVersion: "2024-11-05" }).result.protocolVersion).toBe("2024-11-05");
    expect(session().call("initialize", { protocolVersion: "1999-01-01" }).result.protocolVersion).toBe(PROTOCOL_VERSION);
  });

  it("drops structuredContent and tool titles for a pre-2025-06-18 client", () => {
    const s = session();
    s.call("initialize", { protocolVersion: "2025-03-26" });
    expect(s.call("tools/list").result.tools[0].title).toBeUndefined();
    const r = s.tool("list_lessons", {});
    expect(r.result.structuredContent).toBeUndefined();
    expect(r.result.content[0].text).toMatch(/lessons/);
  });

  it("refuses work before initialize but answers ping", () => {
    const s = session();
    expect(s.call("ping").result).toEqual({});
    expect(s.call("tools/list").error?.code).toBe(ERR.invalidRequest);
  });

  it("requires a protocolVersion", () => {
    expect(session().call("initialize", {}).error?.code).toBe(ERR.invalidParams);
  });
});

describe("JSON-RPC errors", () => {
  const s = initialized();
  const raw = (line: string) => JSON.parse(s.server.handleLine(line)!) as Msg;

  it("parse error", () => {
    expect(raw("{not json")).toMatchObject({ id: null, error: { code: ERR.parse } });
  });
  it("invalid request: no jsonrpc, bad id, no method, batch", () => {
    expect(raw('{"id":1,"method":"ping"}').error?.code).toBe(ERR.invalidRequest);
    expect(raw('{"jsonrpc":"2.0","id":{},"method":"ping"}').error?.code).toBe(ERR.invalidRequest);
    expect(raw('{"jsonrpc":"2.0","id":7}')).toMatchObject({ id: 7, error: { code: ERR.invalidRequest } });
    expect(raw('[{"jsonrpc":"2.0","id":1,"method":"ping"}]').error?.code).toBe(ERR.invalidRequest);
  });
  it("method not found, including inherited object keys", () => {
    expect(s.call("lessons/everything").error?.code).toBe(ERR.methodNotFound);
    expect(s.call("toString").error?.code).toBe(ERR.methodNotFound);
  });
  it("invalid params: unknown tool, wrong types, missing and extra arguments", () => {
    expect(s.tool("no_such_tool", {}).error?.code).toBe(ERR.invalidParams);
    expect(s.tool("get_lesson", { lang: "en" }).error?.message).toMatch(/slug: required/);
    expect(s.tool("get_lesson", { slug: 5 }).error?.message).toMatch(/expected string/);
    expect(s.tool("get_lesson", { slug: "caching", lang: "de" }).error?.message).toMatch(/one of uz, ru, en/);
    expect(s.tool("export_diagram", { slug: "caching", format: "svg" }).error?.code).toBe(ERR.invalidParams);
    expect(s.tool("list_lessons", { extra: 1 }).error?.message).toMatch(/unknown property/);
    expect(s.call("tools/call", { name: "list_lessons", arguments: [] }).error?.code).toBe(ERR.invalidParams);
    expect(s.call("tools/call", "x").error?.code).toBe(ERR.invalidParams);
  });
  it("ignores notifications and responses", () => {
    expect(s.server.handleLine('{"jsonrpc":"2.0","method":"notifications/cancelled","params":{"requestId":1}}')).toBeNull();
    expect(s.server.handleLine('{"jsonrpc":"2.0","id":3,"result":{}}')).toBeNull();
    expect(s.server.handleLine("   ")).toBeNull();
  });
  it("a throwing tool becomes an isError result, not a crash", () => {
    const server = createServer({
      name: "t",
      version: "0",
      tools: [{ name: "boom", title: "Boom", description: "", inputSchema: { type: "object" }, run: () => { throw new Error("kaput"); } }],
    });
    server.handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: PROTOCOL_VERSION } });
    const r = server.handle({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "boom" } }) as Msg;
    expect(r.result).toMatchObject({ isError: true, content: [{ type: "text", text: expect.stringMatching(/kaput/) }] });
  });
});

describe("tools", () => {
  const s = initialized();

  it("lists five tools with object input schemas", () => {
    const tools = s.call("tools/list").result.tools as { name: string; title: string; inputSchema: { type: string } }[];
    expect(tools.map((t) => t.name)).toEqual(["list_lessons", "get_lesson", "validate_lesson", "export_diagram", "practice_rubric"]);
    for (const t of tools) {
      expect(t.inputSchema.type).toBe("object");
      expect(t.title).toBeTruthy();
    }
  });

  it("list_lessons: every lesson in order, and a section filter", () => {
    const all = s.tool("list_lessons", {}).result;
    expect(all.structuredContent.count).toBe(order.length);
    expect(all.structuredContent.lessons[0]).toMatchObject({ slug: order[0], steps: expect.any(Number), section: expect.any(String) });
    const scaling = s.tool("list_lessons", { section: "scaling", lang: "uz" }).result.structuredContent;
    expect(scaling.lessons.every((l: { section: string }) => l.section === "scaling")).toBe(true);
    expect(scaling.lessons.map((l: { slug: string }) => l.slug)).toContain("caching");
    expect(s.tool("list_lessons", { section: "nope" }).result.isError).toBe(true);
  });

  it("get_lesson: steps with plain text, the design scene and the checks", () => {
    const r = s.tool("get_lesson", { slug: "caching", lang: "ru" }).result;
    const v = r.structuredContent;
    expect(v.title).toBe(lessons.caching!.text.ru.title);
    expect(v.steps).toHaveLength(lessons.caching!.lesson.steps.length);
    expect(v.steps[0]).toMatchObject({ index: 1, id: expect.any(String), title: expect.any(String), text: expect.any(String) });
    for (const st of v.steps) expect(st.text).not.toMatch(/\*\*|`/);
    expect(v.scene.design.nodes.length).toBeGreaterThan(2);
    expect(v.scene.design.nodes[0]).toMatchObject({ label: expect.any(String), kind: expect.any(String) });
    expect(Array.isArray(v.checks)).toBe(true);
    expect(r.content[0].text).toMatch(/^# /);
    expect(s.tool("get_lesson", { slug: "nope" }).result.isError).toBe(true);
    expect(s.tool("get_lesson", { slug: "__proto__" }).result.isError).toBe(true);
  });

  it("get_lesson: the checks of a lesson that has some carry their answer", () => {
    const withCheck = order.find((slug) => Object.values(lessons[slug]!.text.en.steps).some((t) => (t as { check?: unknown }).check));
    expect(withCheck).toBeDefined();
    const v = s.tool("get_lesson", { slug: withCheck }).result.structuredContent;
    expect(v.checks[0]).toMatchObject({ q: expect.any(String), options: expect.any(Array), answer: expect.any(Number) });
  });

  it("validate_lesson: a course lesson is valid, with its texts", () => {
    const { lesson, text } = lessons.caching!;
    const r = s.tool("validate_lesson", { lesson, text }).result.structuredContent;
    expect(r.findings.filter((f: { level: string }) => f.level === "error")).toEqual([]);
    expect(r.valid).toBe(true);
    expect(r.notes.join(" ")).toMatch(/already a course lesson/);
  });

  it("validate_lesson: a bundle and source text are read too", () => {
    const { lesson, text } = lessons.apis!;
    expect(s.tool("validate_lesson", { lesson: { lesson, text } }).result.structuredContent.valid).toBe(true);
    const src = `import { defineLesson } from "@mufassall/scene-schema";\nexport default defineLesson(${JSON.stringify(lesson)});\n`;
    const r = s.tool("validate_lesson", { lesson: src }).result.structuredContent;
    expect(r.valid).toBe(true);
    expect(r.notes.join(" ")).toMatch(/No texts given/);
  });

  it("validate_lesson: schema and author errors with readable messages", () => {
    const bad = { ...lessons.caching!.lesson, minutes: 99, steps: lessons.caching!.lesson.steps.slice(0, 3), extra: true };
    const r = s.tool("validate_lesson", { lesson: bad }).result;
    expect(r.isError).toBeUndefined();
    expect(r.structuredContent.valid).toBe(false);
    expect(r.structuredContent.findings.some((f: { source: string }) => f.source === "schema")).toBe(true);

    const short = { ...lessons.caching!.lesson, steps: lessons.caching!.lesson.steps.slice(0, 3) };
    const codes = s.tool("validate_lesson", { lesson: short }).result.structuredContent.findings.map((f: { code: string }) => f.code);
    expect(codes).toContain("fewSteps");
    expect(codes).toContain("recapLast");

    const broken = s.tool("validate_lesson", { lesson: "export default defineLesson({ slug: 'x', steps: [ }" }).result.structuredContent;
    expect(broken.valid).toBe(false);
    expect(broken.findings[0]).toMatchObject({ source: "input", code: "parse", message: expect.stringMatching(/line 1/) });
  });

  it("validate_lesson: Cyrillic in an English text is an error", () => {
    const { lesson, text } = lessons.caching!;
    const en = { ...text.en, title: "Кэш" };
    const r = s.tool("validate_lesson", { lesson, text: { ...text, en } }).result.structuredContent;
    expect(r.findings.some((f: { code: string; lang?: string }) => f.code === "cyrillic" && f.lang === "en")).toBe(true);
  });

  it("export_diagram: every format", () => {
    const withMessages = "apis";
    const out = (format: string) => s.tool("export_diagram", { slug: withMessages, lang: "en", format }).result;
    expect(out("mermaid-flowchart").content[0].text).toMatch(/^flowchart LR/);
    expect(out("mermaid-sequence").content[0].text).toMatch(/^sequenceDiagram/);
    expect(out("d2").content[0].text).toMatch(/^direction: right/);
    expect(out("plantuml").content[0].text).toMatch(/^@startuml/);
    expect(out("plantuml-components").content[0].text).toMatch(/^@startuml/);
    expect(out("d2").structuredContent).toMatchObject({ slug: withMessages, format: "d2", diagram: expect.any(String) });
  });

  it("export_diagram: a lesson without messages has no sequence", () => {
    const silent = order.find((slug) => !lessons[slug]!.lesson.steps.some((st) => st.exchange));
    if (!silent) return; // every lesson shows messages today
    expect(s.tool("export_diagram", { slug: silent, format: "mermaid-sequence" }).result.isError).toBe(true);
  });

  it("practice_rubric: rules with text and three hint levels", () => {
    const r = s.tool("practice_rubric", { slug: "caching", lang: "en" }).result;
    const v = r.structuredContent;
    expect(v.available).toBe(true);
    expect(v.rules.length).toBeGreaterThanOrEqual(3);
    expect(v.rules.some((x: { kind: string }) => x.kind === "path")).toBe(true);
    for (const x of v.rules) expect(x.text).toBeTruthy();
    expect(Object.keys(v.hints)).toEqual(["kinds", "links", "paths"]);
    expect(r.content[0].text).toMatch(/Hint 3/);
  });

  it("practice_rubric answers for every lesson without throwing", () => {
    for (const slug of order) {
      const r = s.tool("practice_rubric", { slug }).result;
      expect(r.content[0].text, slug).toBeTruthy();
    }
  });
});

describe("resources", () => {
  const s = initialized();
  it("lists one resource per lesson and a template", () => {
    expect(s.call("resources/list").result.resources).toHaveLength(order.length);
    expect(s.call("resources/templates/list").result.resourceTemplates[0].uriTemplate).toBe("mufassall://lessons/{slug}/{lang}");
  });
  it("reads a lesson in a language, and rejects unknown URIs", () => {
    const r = s.call("resources/read", { uri: "mufassall://lessons/caching/uz" }).result;
    expect(JSON.parse(r.contents[0].text)).toMatchObject({ slug: "caching", lang: "uz" });
    expect(JSON.parse(s.call("resources/read", { uri: "mufassall://lessons/caching" }).result.contents[0].text).lang).toBe("en");
    for (const uri of ["mufassall://lessons/nope", "mufassall://lessons/caching/de", "mufassall://lessons/caching/en/x", "file:///etc/passwd"]) {
      expect(s.call("resources/read", { uri }).error?.code, uri).toBe(ERR.resourceNotFound);
    }
    expect(s.call("resources/read", {}).error?.code).toBe(ERR.invalidParams);
  });
});
