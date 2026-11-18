import { describe, expect, it } from "vitest";
import { type LessonInput, NODE_KINDS, type SceneState, defineLesson, resolve } from "@mufassall/scene-schema";
import { lessons } from "../../../content/index";
import {
  d2String,
  designState,
  hasExchanges,
  mermaidText,
  plantUmlString,
  plantUmlText,
  safeIds,
  toD2,
  toMermaidFlowchart,
  toMermaidSequence,
  toPlantUmlComponents,
  toPlantUmlSequence,
} from "./textexport";

const NASTY = [
  `Say "hi" #1; [x] {y} (z) | a<b> & c`,
  "So'rov ʻoʻzbek’ → Ответ",
  "`code` and **bold** %% not a comment",
  "${HOME} back\\slash\nnew line",
  "end",
];

/** Mermaid quoted labels and message texts: nothing that ends a label, a statement or starts markup. */
function assertMermaidSafe(text: string) {
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("classDef ") || line.startsWith("class ")) continue;
    expect((line.match(/"/g) ?? []).length % 2, line).toBe(0);
    const quoted = [...line.matchAll(/"([^"]*)"/g)].map((m) => m[1]!);
    const tail = /^(participant|actor) \S+ as (.*)$/.exec(line)?.[2] ?? (/^[^"]*?: (.*)$/.exec(line)?.[1] ?? "");
    for (const t of [...quoted, tail]) {
      const bare = t.replace(/#\d+;/g, "");
      expect(bare, line).not.toMatch(/[;|<>`"&#]/);
      expect(t, line).not.toContain("%%");
    }
  }
}

function assertD2Safe(text: string) {
  for (const line of text.split("\n")) {
    const rest = line.replace(/"(?:[^"\\$]|\\.)*"/g, "");
    expect(rest, line).not.toMatch(/["$]/);
  }
}

/**
 * PlantUML: one @startuml ... @enduml block, every line a known statement, quoted names balanced,
 * and no raw character that starts Creole markup, a tag, an escape or a preprocessor call.
 */
function assertPlantUmlSafe(text: string) {
  const lines = text.trimEnd().split("\n");
  expect(lines[0]).toBe("@startuml");
  expect(lines[lines.length - 1]).toBe("@enduml");
  expect(lines.filter((l) => l.startsWith("@")).length).toBe(2);
  for (const line of lines.slice(1, -1)) {
    expect(line, line).toMatch(
      /^(left to right direction|top to bottom direction|note over n_\w+(, n_\w+)? : .*|n_\w+ \S+ n_\w+( : .*)?|[a-z]+ "[^"]*" as n_\w+( #\S+)?)$/,
    );
    expect((line.match(/"/g) ?? []).length % 2, line).toBe(0);
    const texts = [...line.matchAll(/"([^"]*)"/g)].map((m) => m[1]!);
    const tail = line.includes('"') ? undefined : / : (.*)$/.exec(line)?.[1];
    if (tail !== undefined) texts.push(tail);
    for (const t of texts) {
      const bare = t.replace(/&#\d+;/g, "");
      expect(bare, line).not.toMatch(/[\\<>~%&"]/);
      expect(t, line).not.toMatch(/([*/_^=-])\1/);
    }
  }
}

const allKinds = (): SceneState => {
  const s: SceneState = { nodes: {}, edges: {}, metrics: {}, focus: [] };
  NODE_KINDS.forEach((kind, i) => {
    s.nodes[kind] = { id: kind, kind, at: [i, 0], state: i % 3 === 1 ? "slow" : i % 3 === 2 ? "down" : "ok" };
  });
  const flows = [
    ["request", false],
    ["ack", false],
    ["fail", false],
    ["retry", false],
    ["dup", false],
    ["request", true],
  ] as const;
  flows.forEach(([flow, cut], i) => {
    const id = `e${i}`;
    s.edges[id] = { id, from: NODE_KINDS[i]!, to: NODE_KINDS[i + 1]!, flow, rate: 1, cut };
  });
  return s;
};

describe("escaping", () => {
  it("writes dangerous Mermaid characters as entities and keeps Uzbek apostrophes", () => {
    expect(mermaidText(`a "b" #c; d|e <f> & g`)).toBe("a #34;b#34; #35;c#59; d#124;e #60;f#62; #38; g");
    expect(mermaidText("so'rov ʻoʻ → Привет")).toBe("so'rov ʻoʻ → Привет");
    expect(mermaidText("`x` **y**")).toBe("x y");
    expect(mermaidText("100%% sure")).toBe("100%#37; sure");
  });

  it("quotes D2 strings with backslash escapes", () => {
    expect(d2String(`a "b" \\ $x`)).toBe(`"a \\"b\\" \\\\ \\$x"`);
    expect(d2String("one\ntwo")).toBe('"one two"');
  });

  it("derives safe, unique ids", () => {
    const ids = safeIds(["end", "a-b", "a_b", "o", "Привет"]);
    expect([...ids.values()]).toEqual(["n_end", "n_a_b", "n_a_b_2", "n_o", "n_______"]);
    for (const v of ids.values()) expect(v).toMatch(/^n_[A-Za-z0-9_]+$/);
  });
});

describe("flowchart and D2", () => {
  const s = allKinds();
  const labels = Object.fromEntries(NODE_KINDS.map((k, i) => [k, NASTY[i % NASTY.length]!]));

  it("gives every kind its shape and every flow its arrow", () => {
    const out = toMermaidFlowchart(s, Object.fromEntries(NODE_KINDS.map((k) => [k, k.toUpperCase()])));
    expect(out).toContain('n_db[("DB")]');
    expect(out).toContain('n_storage[("STORAGE")]');
    expect(out).toContain('n_queue[["QUEUE"]]');
    expect(out).toContain('n_cache{{"CACHE"}}');
    expect(out).toContain('n_lb{"LB"}');
    expect(out).toContain('n_cdn[/"CDN"\\]');
    expect(out).toContain('n_external>"EXTERNAL"]');
    expect(out).toContain('n_actor(("ACTOR"))');
    expect(out).toContain('n_client(["CLIENT"])');
    expect(out).toContain('n_service["SERVICE"]');
    expect(out).toContain('n_worker("WORKER")');
    expect(out).toContain("n_actor --> n_client");
    expect(out).toContain("n_client -.-> n_service");
    expect(out).toContain("n_service --x n_lb");
    expect(out).toContain('n_lb -.->|"retry"| n_cache');
    expect(out).toContain('n_cache ==>|"duplicate"| n_cdn');
    expect(out).toContain('n_cdn --x|"lost"| n_queue');
    expect(out).toMatch(/class n_client,.*slow/);
    expect(out).toMatch(/class n_service,.*down/);
    expect(toMermaidFlowchart(s, {}, { states: false })).not.toContain("classDef");
  });

  it("writes D2 shapes, styles and labels", () => {
    const out = toD2(s, {});
    for (const shape of ["person", "cylinder", "queue", "hexagon", "diamond", "cloud", "stored_data", "oval"]) {
      expect(out).toContain(`shape: ${shape}`);
    }
    expect(out).toContain("style.multiple: true");
    expect(out).toContain('n_lb -> n_cache: "retry" {');
    expect(out).toContain("target-arrowhead.shape: cross");
    expect(out).toContain("style.stroke-width: 4");
  });

  it("escapes nasty labels and custom words", () => {
    const words = { retry: `re"try;|`, dup: "dup#", lost: "y'qoldi", call: "c", async: "a" };
    assertMermaidSafe(toMermaidFlowchart(s, labels, { words }));
    assertD2Safe(toD2(s, labels, { words }));
  });

  it("renders an optional edge mode and ignores unknown fields", () => {
    const t: SceneState = structuredClone(allKinds());
    Object.assign(t.edges.e0!, { mode: "call", colour: "red" });
    Object.assign(t.edges.e1!, { mode: "weird" });
    const out = toMermaidFlowchart(t, {});
    expect(out).toContain('n_actor -->|"call"| n_client');
    expect(out).toContain("n_client -.-> n_service");
  });

  it("is deterministic", () => {
    expect(toMermaidFlowchart(s, labels)).toBe(toMermaidFlowchart(structuredClone(s), { ...labels }));
    expect(toD2(s, labels)).toBe(toD2(structuredClone(s), { ...labels }));
  });
});

describe("sequence", () => {
  const lesson = defineLesson({
    slug: "t",
    level: "beginner",
    minutes: 1,
    tier: "public",
    metrics: [],
    steps: [
      {
        id: "a",
        kind: "case",
        nodes: { u: { kind: "actor", at: [0, 0] }, api: { kind: "service", at: [2, 0] } },
        edges: { go: { from: "u", to: "api" } },
        exchange: {
          edge: "go",
          request: { format: "http", head: `POST /x?a=1;b=2 "q" #frag`, headers: [["Authorization", "***"]], body: "SECRET_BODY" },
          response: { format: "http", head: "HTTP/1.1 200 OK", body: "RESPONSE_BODY" },
          masked: ["Authorization"],
        },
      },
      { id: "b", kind: "problem", edges: { go: { cut: true } }, exchange: { edge: "go", request: { format: "text", head: "PING" }, response: { format: "text", head: "PONG" } } },
      { id: "c", kind: "recap" },
    ],
  });
  const text = { nodes: { u: "Foydalanuvchi", api: "API <v2>" }, steps: { a: { title: "**Send** it; now" }, b: { title: "Lost" } } };

  it("lists participants, requests and responses in step order, never bodies", () => {
    const out = toMermaidSequence(lesson, text);
    expect(out).toBe(
      [
        "sequenceDiagram",
        "  actor n_u as Foydalanuvchi",
        "  participant n_api as API #60;v2#62;",
        "  Note over n_u,n_api: Send it#59; now",
        "  n_u->>n_api: POST /x?a=1#59;b=2 #34;q#34; #35;frag",
        "  n_api-->>n_u: HTTP/1.1 200 OK",
        "  Note over n_u,n_api: Lost",
        "  n_u-xn_api: PING",
        "",
      ].join("\n"),
    );
    expect(out).not.toMatch(/SECRET|RESPONSE_BODY|\*\*\*|Authorization/);
    expect(hasExchanges(lesson)).toBe(true);
    expect(toMermaidSequence(lesson, text, { notes: false })).not.toContain("Note");
  });

  it("uses the last non-recap state as the design", () => {
    expect(designState(lesson)).toEqual(resolve(lesson)[1]);
  });
});

describe("PlantUML", () => {
  it("escapes markup, tags, quotes, escapes and preprocessor calls but keeps uz/ru text", () => {
    expect(plantUmlText(`a "b" <c> \\n ~d %date() & e`)).toBe("a &#34;b&#34; &#60;c&#62; &#92;n &#126;d &#37;date() &#38; e");
    expect(plantUmlText("https://x.uz/**a**__b__--c")).toBe("https:/&#47;x.uz/a_&#95;b_&#95;-&#45;c");
    expect(plantUmlText("So'rov ʻoʻzbek’ → Ответ")).toBe("So'rov ʻoʻzbek’ → Ответ");
    expect(plantUmlString("one\ntwo `x`")).toBe('"one two x"');
  });

  const lesson = defineLesson({
    slug: "p",
    level: "beginner",
    minutes: 1,
    tier: "public",
    metrics: [],
    steps: [
      {
        id: "a",
        kind: "case",
        nodes: { u: { kind: "actor", at: [0, 0] }, api: { kind: "service", at: [2, 0] }, q: { kind: "queue", at: [4, 0] }, db: { kind: "db", at: [6, 0] } },
        edges: { go: { from: "u", to: "api", mode: "call" }, put: { from: "api", to: "q", mode: "async" }, save: { from: "q", to: "db" } },
        exchange: {
          edge: "go",
          request: { format: "http", head: "POST /pay", headers: [["Authorization", "***"]], body: "SECRET_BODY" },
          response: { format: "http", head: "HTTP/1.1 200 OK" },
          masked: ["Authorization"],
        },
      },
      { id: "b", kind: "fix", exchange: { edge: "put", request: { format: "text", head: "PUBLISH pay" }, response: { format: "text", head: "ACK" } } },
      { id: "c", kind: "problem", edges: { put: { flow: "retry" } }, exchange: { edge: "put", request: { format: "text", head: "PUBLISH pay again" } } },
      { id: "d", kind: "problem", edges: { put: { flow: "request" }, go: { flow: "dup" } }, exchange: { edge: "go", request: { format: "http", head: "POST /pay" } } },
      { id: "e", kind: "problem", edges: { save: { cut: true } }, exchange: { edge: "save", request: { format: "sql", head: "INSERT" }, response: { format: "text", head: "OK" } } },
      { id: "f", kind: "recap" },
    ],
  });
  const text = {
    nodes: { u: 'Mijoz "VIP"', api: "To'lov API", q: "Очередь", db: "DB" },
    steps: { a: { title: "**Pay**" }, b: { title: "Queue" }, c: { title: "Retry" }, d: { title: "Twice" }, e: { title: "Lost" } },
  };

  it("writes a call with its reply, async with an open head, retry/dup/lost words, never bodies", () => {
    const out = toPlantUmlSequence(lesson, text, { words: { lost: "yo'qoldi" } });
    expect(out).toBe(
      [
        "@startuml",
        'actor "Mijoz &#34;VIP&#34;" as n_u',
        `participant "To'lov API" as n_api`,
        'queue "Очередь" as n_q',
        'database "DB" as n_db',
        "note over n_u, n_api : Pay",
        "n_u -> n_api : POST /pay",
        "n_api --> n_u : HTTP/1.1 200 OK",
        "note over n_api, n_q : Queue",
        "n_api ->> n_q : PUBLISH pay",
        "n_q -->> n_api : ACK",
        "note over n_api, n_q : Retry",
        "n_api ->> n_q : [retry] PUBLISH pay again",
        "note over n_u, n_api : Twice",
        "n_u -> n_api : [duplicate] POST /pay",
        "note over n_q, n_db : Lost",
        "n_q ->x n_db : [yo'qoldi] INSERT",
        "@enduml",
        "",
      ].join("\n"),
    );
    expect(out).not.toMatch(/SECRET|\*\*\*|Authorization/);
    expect(toPlantUmlSequence(lesson, text, { notes: false })).not.toContain("note");
    assertPlantUmlSafe(out);
  });

  it("writes the component diagram with kinds, flows, words and states", () => {
    const out = toPlantUmlComponents(allKinds(), {});
    for (const el of ["actor", "agent", "component", "node", "collections", "stack", "frame", "queue", "database", "storage", "cloud"]) {
      expect(out).toMatch(new RegExp(`^${el} "`, "m"));
    }
    expect(out).toContain("left to right direction");
    expect(out).toContain("n_actor --> n_client");
    expect(out).toContain("n_client ..> n_service");
    expect(out).toContain("n_service -[#c62828]-> n_lb");
    expect(out).toContain("n_lb ..> n_cache : retry");
    expect(out).toContain("n_cache -[bold]-> n_cdn : duplicate");
    expect(out).toContain("n_cdn -[#c62828,dashed]-> n_queue : lost");
    expect(out).toContain('agent "client" as n_client #fff4d6;line:b26a00');
    expect(out).toContain('component "service" as n_service #fde2e2;line:c62828;line.dashed');
    expect(toPlantUmlComponents(allKinds(), {}, { states: false, direction: "TB" })).not.toMatch(/#fff|#fde|left to right/);
    assertPlantUmlSafe(out);
    const labels = Object.fromEntries(NODE_KINDS.map((k, i) => [k, NASTY[i % NASTY.length]!]));
    assertPlantUmlSafe(toPlantUmlComponents(allKinds(), labels, { words: { retry: `re"try<b>`, dup: "dup~~", lost: "%x()" } }));
  });

  it("is deterministic on real lessons with call and async edges", () => {
    for (const slug of ["callbacks", "payments", "webhooks"]) {
      const entry = lessons[slug]!;
      const lesson = entry.lesson as LessonInput;
      const nodes = entry.text.en.nodes as Record<string, string>;
      expect(toPlantUmlSequence(lesson, entry.text.en as never)).toBe(toPlantUmlSequence(structuredClone(lesson), structuredClone(entry.text.en) as never));
      expect(toPlantUmlComponents(designState(lesson), nodes)).toBe(toPlantUmlComponents(structuredClone(designState(lesson)), { ...nodes }));
    }
    const cbLesson = lessons.callbacks!.lesson as LessonInput;
    const cb = toPlantUmlSequence(cbLesson, lessons.callbacks!.text.en as never);
    expect(cb).toContain("n_provider -> n_api : POST /callbacks HTTP/1.1\nn_api --> n_provider : HTTP/1.1 200 OK");
    expect(cb).toContain("n_api ->> n_queue : PUBLISH callbacks.work");
    expect(cb).toMatch(/n_api ->x n_store : \[lost\] /);
    expect(cb).toMatch(/n_queue ->> n_worker : \[retry\] /);
    expect(cb).toMatch(/n_worker -->> n_queue : /);
    const comp = toPlantUmlComponents(designState(cbLesson), lessons.callbacks!.text.uz.nodes as Record<string, string>);
    expect(comp).toContain("n_api --> n_queue : async");
    expect(comp).toContain("n_provider --> n_api : call");
    const wh = toPlantUmlSequence(lessons.webhooks!.lesson as LessonInput, lessons.webhooks!.text.en as never);
    expect(wh).toContain("https:/&#47;");
  });
});

describe("every lesson in the registry", () => {
  for (const [slug, entry] of Object.entries(lessons)) {
    it(slug, () => {
      const lesson = entry.lesson as LessonInput;
      const state = designState(lesson);
      for (const lang of ["uz", "ru", "en"] as const) {
        const t = entry.text[lang];
        const labels = t.nodes as Record<string, string>;
        const flow = toMermaidFlowchart(state, labels);
        expect(flow.startsWith("flowchart LR\n")).toBe(true);
        expect(flow.split("\n").filter((l) => /^ {2}n_\S+[[({>]/.test(l))).toHaveLength(Object.keys(state.nodes).length);
        assertMermaidSafe(flow);
        assertD2Safe(toD2(state, labels));
        const comp = toPlantUmlComponents(state, labels);
        expect(comp.split("\n").filter((l) => / as n_\w+( #\S+)?$/.test(l))).toHaveLength(Object.keys(state.nodes).length);
        assertPlantUmlSafe(comp);
        if (hasExchanges(lesson)) {
          const seq = toMermaidSequence(lesson, t as never);
          expect(seq).toMatch(/->>|-x/);
          assertMermaidSafe(seq);
          const puml = toPlantUmlSequence(lesson, t as never);
          expect(puml).toMatch(/ (->|->>|->x) /);
          assertPlantUmlSafe(puml);
        }
      }
      const nasty = Object.fromEntries(Object.keys(state.nodes).map((id, i) => [id, NASTY[i % NASTY.length]!]));
      assertMermaidSafe(toMermaidFlowchart(state, nasty));
      assertD2Safe(toD2(state, nasty));
      assertPlantUmlSafe(toPlantUmlComponents(state, nasty));
    });
  }
});
