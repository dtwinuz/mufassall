import { describe, expect, it } from "vitest";
import type { LessonInput, LessonText } from "@mufassall/scene-schema";
import { lessons } from "../../../../content/index";
import { designState, toMermaidFlowchart, toMermaidSequence } from "../textexport";
import { COURSE_LIMITS, assertPlayable } from "./fixtures/playable";
import { IMPORT_MAX_NODES } from "./importkit";
import { type MermaidErrorCode, type MermaidImport, importMermaid, mermaidLabel, parseMermaid, wireOf } from "./mermaid";
import { type Draft, ID_RE, sanitizeDraft } from "./model";
import { checkDraft, hasCyrillic } from "./validation";

const ok = (text: string): MermaidImport => {
  const r = importMermaid(text, "en");
  if (!r.ok) throw new Error(`import failed: ${r.error.code}`);
  return r.result;
};
const errorOf = (text: string): MermaidErrorCode | undefined => {
  const r = importMermaid(text, "en");
  return r.ok ? undefined : r.error.code;
};
const nodesOf = (d: Draft) => Object.values(d.steps[0]!.nodes);
const kindOf = (d: Draft, label: string) => nodesOf(d).find((n) => d.labels.en[n.id] === label)?.kind;

const FLOW = `---
title: Checkout
---
flowchart LR
  %% the user side
  U([Customer]) -->|POST /orders| API[Order API]
  API --> DB[(Orders DB)]
  API -.-> Q[[order-events]]
  Q -- consume --> W(Mailer worker) --> SMTP>Mail provider]
  API --> R{{Redis}}
  subgraph storage
    S3[Invoice bucket]
  end
  W --x S3
  classDef hot fill:#f00
  class API hot
`;

const FLOW_CASES = `flowchart LR
  U([Customer]) --> P[Pay]
  P --> D{Card ok?}
  D -->|yes| C[Charge card] --> R[Receipt]
  D -->|declined| E[Show error]
  D -->|3-D Secure| B[Ask the bank]
  B -->|ok| C
  B -->|no| X[Bank says no]
`;

const SEQ_CASES = `sequenceDiagram
  participant W as Web
  participant P as Payments
  participant DB as Orders DB
  W->>P: POST /pay
  alt card ok
    P->>W: charge 10 USD
    W->>P: Paid
  else card declined
    P->>W: Declined
    W->>W: log
    W->>P: Payment failed
  end
  W->>DB: save order
  opt with a coupon
    W->>DB: apply coupon
  end
  break
    DB->>W: rollback
  end
  critical fraud check
    P->>DB: check
  option fraud check fails
    P->>DB: block order
  end
`;

describe("flowchart", () => {
  it("reads shapes, labels, chains, text and pipe labels", () => {
    const p = parseMermaid(FLOW);
    if (!p.ok) throw new Error(p.error.code);
    const m = p.model;
    expect(m.title).toBe("Checkout");
    expect(m.direction).toBe("LR");
    expect(m.nodes.map((n) => [n.id, n.kind])).toEqual([
      ["U", "client"],
      ["API", "service"],
      ["DB", "db"],
      ["Q", "queue"],
      ["W", "worker"],
      ["SMTP", "external"],
      ["R", "cache"],
      ["S3", "storage"],
    ]);
    expect(m.edges).toEqual([
      { from: "U", to: "API", label: "POST /orders", style: "solid" },
      { from: "API", to: "DB", label: "", style: "solid" },
      { from: "API", to: "Q", label: "", style: "dotted" },
      { from: "Q", to: "W", label: "consume", style: "solid" },
      { from: "W", to: "SMTP", label: "", style: "solid" },
      { from: "API", to: "R", label: "", style: "solid" },
      { from: "W", to: "S3", label: "", style: "cross" },
    ]);
    expect(m.warnings.map((w) => w.code)).toEqual(["subgraph"]);
  });
  it("walks the flow in order and passes the author checks", () => {
    const { draft, kind } = ok(FLOW);
    expect(kind).toBe("mermaid-flowchart");
    expect(draft.title.en).toBe("Checkout");
    expect(draft.steps[0]!.focus).toEqual(["customer"]);
    expect(draft.steps[0]!.exchange?.request).toMatchObject({ format: "http", head: "POST /orders" });
    expect(draft.steps[1]!.text.en.body).toBe("Order API receives from Customer (POST /orders). It passes on to Orders DB, order-events, Redis.");
    expect(draft.steps.at(-1)!.kind).toBe("recap");
    // left to right: the customer is left of the API, the mailer further right
    const x = (label: string) => nodesOf(draft).find((n) => draft.labels.en[n.id] === label)!.at[0];
    expect(x("Customer")).toBeLessThan(x("Order API"));
    expect(x("Order API")).toBeLessThan(x("Mailer worker"));
    expect(Object.values(draft.steps[0]!.edges).find((e) => e.mode === "async")).toBeDefined();
    assertPlayable(draft);
  });
  it("graph TD, & groups, reverse and bidirectional arrows, @{} shapes, quoted labels with entities", () => {
    const { draft } = ok(`graph TD;
  A["Say #quot;hi#quot; #35;1"] & B --> C;
  D <-- C
  E <--> C
  F@{ shape: cyl, label: "Ledger" } --- C
  click A callback`);
    expect(kindOf(draft, 'Say "hi" #1')).toBe("service");
    expect(kindOf(draft, "Ledger")).toBe("db");
    const e = Object.values(draft.steps[0]!.edges).map((x) => `${x.from}>${x.to}`);
    expect(e).toEqual(expect.arrayContaining(["say-hi-1>c", "b>c", "c>d", "e>c", "ledger>c"]));
    assertPlayable(draft);
  });
  it("maps names to kinds when the shape says nothing", () => {
    const { draft } = ok("flowchart LR\n a[Web client] --> b[Postgres] \n a --> c[Kafka topic] \n a --> d[S3 bucket] \n a --> e[Redis cache] \n a --> f((Admin))");
    expect([kindOf(draft, "Web client"), kindOf(draft, "Postgres"), kindOf(draft, "Kafka topic"), kindOf(draft, "S3 bucket"), kindOf(draft, "Redis cache"), kindOf(draft, "Admin")]).toEqual([
      "client",
      "db",
      "queue",
      "storage",
      "cache",
      "actor",
    ]);
  });
  it("a two-block diagram is padded to a full lesson", () => {
    const { draft } = ok("flowchart LR\n A --> B");
    expect(draft.steps.length).toBeGreaterThanOrEqual(7);
    expect(draft.steps.some((s) => s.kind === "problem")).toBe(true);
    assertPlayable(draft);
  });
  it("caps blocks and steps, reports cycles, self loops and unknown lines", () => {
    const chain = Array.from({ length: 50 }, (_, k) => `n${k} --> n${k + 1}`).join("\n");
    const { draft, warnings } = ok(`flowchart LR\n${chain}\n n3 --> n1\n n2 --> n2\n ??? what`);
    const codes = warnings.map((w) => w.code);
    expect(codes).toEqual(expect.arrayContaining(["maxNodes", "cycle", "selfLoop", "unsupported"]));
    // a full workflow: every kept block gets its step, nothing is cut at 16
    expect(codes).not.toContain("maxSteps");
    expect(nodesOf(draft)).toHaveLength(IMPORT_MAX_NODES);
    expect(draft.steps).toHaveLength(IMPORT_MAX_NODES + 1);
    assertPlayable(draft);
  });
  it("Cyrillic names stay Russian in ru and become Latin in uz/en", () => {
    const { draft } = ok("flowchart LR\n a[Клиент] --> b[(База заказов)] --> c[Отчёт]");
    expect(draft.labels.ru.a ?? Object.values(draft.labels.ru)[0]).toBe("Клиент");
    expect(Object.values(draft.labels.uz)).toContain("Klient");
    expect(kindOf(draft, "Baza zakazov")).toBe("db");
    assertPlayable(draft);
  });
});

describe("sequenceDiagram", () => {
  const SEQ = `sequenceDiagram
  autonumber
  actor U as Customer
  participant W as Web app
  participant P as Payments API
  participant DB as Ledger database
  U->>W: Pay for the order
  W->>+P: POST /payments
  P->>DB: INSERT payment
  DB-->>P: OK
  P-->>-W: 201 Created
  Note over P,DB: in one transaction
  loop every 5 s
    W-)P: GET /payments/42
  end
  P-xW: webhook (lost)
  W->>W: render
`;
  it("reads participants, arrows, replies and notes", () => {
    const p = parseMermaid(SEQ);
    if (!p.ok) throw new Error(p.error.code);
    const m = p.model;
    expect(m.nodes.map((n) => [n.id, n.label, n.kind])).toEqual([
      ["U", "Customer", "actor"],
      ["W", "Web app", "service"],
      ["P", "Payments API", "service"],
      ["DB", "Ledger database", "db"],
    ]);
    expect(m.messages).toHaveLength(7);
    expect(m.messages[3]).toMatchObject({ from: "DB", to: "P", dashed: true });
    expect(m.messages[5]).toMatchObject({ async: true, text: "GET /payments/42" });
    expect(m.messages[6]).toMatchObject({ lost: true });
    expect(m.warnings.map((w) => w.code)).toEqual(["notes", "blocks", "selfLoop"]);
  });
  it("one step per message, answers merged, HTTP turns into a request", () => {
    const { draft, kind } = ok(SEQ);
    expect(kind).toBe("mermaid-sequence");
    const work = draft.steps.filter((s) => s.kind !== "recap");
    expect(work.slice(0, 5).map((s) => s.exchange?.request.head)).toEqual(["Pay for the order", "POST /payments", "INSERT payment", "GET /payments/42", "webhook (lost)"]);
    expect(work[1]!.exchange).toMatchObject({ request: { format: "http" }, response: { format: "http", head: "201 Created" } });
    expect(work[2]!.exchange?.response?.head).toBe("OK");
    expect(work[1]!.focus).toEqual(["web-app", "payments-api"]);
    expect(work[4]!.kind).toBe("problem");
    expect(work[4]!.edges[work[4]!.exchange!.edge]!.cut).toBe(true);
    expect(work[3]!.text.en.body).toContain("does not wait");
    assertPlayable(draft);
  });
});

describe("cases", () => {
  it("flowchart: a decision keeps its first way in the story, the other ways are cases", () => {
    const { draft } = ok(FLOW_CASES);
    // five blocks on the main path, then the usual padding up to the course minimum
    expect(draft.steps.map((s) => s.id)).toEqual(["customer", "pay", "card-ok", "charge-card", "receipt", "overview", "recap"]);
    expect(draft.cases.map((c) => [c.id, c.from, c.steps.map((s) => s.focus[0])])).toEqual([
      ["declined", "card-ok", ["show-error"]],
      ["d-secure", "card-ok", ["ask-the-bank", "bank-says-no"]],
    ]);
    expect(draft.cases[0]!.label).toEqual({ uz: "declined", ru: "declined", en: "declined" });
    // the branch that comes back joins the base story: "Charge card" is not repeated in the case
    expect(draft.cases[1]!.steps.some((s) => s.focus[0] === "charge-card")).toBe(false);
    assertPlayable(draft);
  });
  it("flowchart: a loop back from a decision stays a loop, an unlabelled split is not a decision", () => {
    const { draft } = ok("flowchart LR\n a[Edit] --> b{Review}\n b -->|approve| c[Publish]\n b -->|changes| a\n c --> d{{Cache}}\n c --> e[(Store)]");
    expect(draft.cases).toEqual([]);
    const plain = ok("flowchart LR\n a{Balancer} --> b[App 1]\n a --> c[App 2]");
    expect(plain.draft.cases).toEqual([]);
  });
  it("sequence: alt/else, critical/option and break become cases from the right message", () => {
    const { draft, warnings } = ok(SEQ_CASES);
    const heads = (steps: Draft["steps"]) => steps.map((s) => s.exchange?.request.head);
    expect(heads(draft.steps.filter((s) => s.kind !== "recap")).slice(0, 4)).toEqual(["POST /pay", "charge 10 USD", "Paid", "save order"]);
    expect(draft.cases.map((c) => [c.label.en, c.from, heads(c.steps)])).toEqual([
      ["card declined", draft.steps[0]!.id, ["Declined", "Payment failed"]],
      ["Break 2", draft.steps[4]!.id, ["rollback"]],
      ["fraud check fails", draft.steps[4]!.id, ["block order"]],
    ]);
    expect(draft.cases[1]!.label).toEqual({ en: "Break 2", ru: "Прерывание 2", uz: "To'xtatish 2" });
    expect(warnings.find((w) => w.code === "blocks")?.x).toBe("opt");
    assertPlayable(draft);
  });
});

describe("round trip: our own Mermaid export", () => {
  const entries = Object.entries(lessons).slice(0, 5);
  it("has five built-in lessons to try", () => expect(entries).toHaveLength(5));
  for (const [slug, entry] of entries) {
    it(`${slug}: flowchart and sequence import without errors`, () => {
      const lesson = entry.lesson as LessonInput;
      const text = entry.text.en as LessonText<LessonInput>;
      const state = designState(lesson);
      const flow = toMermaidFlowchart(state, text.nodes as Record<string, string>);
      const f = ok(flow);
      expect(nodesOf(f.draft)).toHaveLength(Math.min(Object.keys(state.nodes).length, IMPORT_MAX_NODES));
      // the export writes our kinds as shapes and they come back; a plain box (service, worker) may be
      // renamed by its words, and storage shares the db cylinder
      for (const n of Object.values(state.nodes)) {
        const back = nodesOf(f.draft).find((x) => f.draft.labels.en[x.id] === (text.nodes as Record<string, string>)[n.id]);
        if (back && !["storage", "service", "worker"].includes(n.kind)) expect(back.kind, n.id).toBe(n.kind);
      }
      expect(checkDraft(f.draft).filter((i) => i.level === "error" && !COURSE_LIMITS.has(i.code))).toEqual([]);
      const seq = toMermaidSequence(lesson, text as never);
      const s = ok(seq);
      expect(s.warnings.map((w) => w.code)).not.toContain("unsupported");
      expect(checkDraft(s.draft).filter((i) => i.level === "error" && !COURSE_LIMITS.has(i.code))).toEqual([]);
    });
  }
});

describe("errors and hostile input", () => {
  it("refuses with a code, fast", () => {
    const cases: [string, MermaidErrorCode][] = [
      ["", "empty"],
      [" \n ", "empty"],
      [`flowchart LR\n${"A-->B\n".repeat(200_000)}`, "tooLarge"],
      ["pie title Pets\n \"Dogs\" : 3", "notMermaid"],
      ["just some text", "notMermaid"],
      ["\u0000\u0001binary", "notMermaid"],
      ["flowchart LR\n%% nothing", "noNodes"],
      ["sequenceDiagram\nNote over A: hi", "noNodes"],
    ];
    for (const [text, code] of cases) {
      const t0 = performance.now();
      expect(errorOf(text), text.slice(0, 30)).toBe(code);
      expect(performance.now() - t0).toBeLessThan(50);
    }
  });
  it("stays linear on pathological lines", () => {
    const t0 = performance.now();
    const r = importMermaid(`flowchart LR\n${"A[".repeat(50_000)}\n${"-".repeat(100_000)}\nB -- ${"x ".repeat(50_000)}\n${"a & ".repeat(20_000)}b`, "en");
    expect(r.ok).toBe(true);
    expect(performance.now() - t0).toBeLessThan(2000);
  });
});

describe("helpers", () => {
  it("decodes Mermaid entities and line breaks", () => {
    expect(mermaidLabel('"a #59; b #quot;c#quot; <br/> d #x; #99999999;"')).toBe('a ; b "c" d #x; #99999999;');
  });
  it("spots HTTP requests and answers", () => {
    expect(wireOf("POST /orders", "x").format).toBe("http");
    expect(wireOf("HTTP/1.1 200 OK", "x").format).toBe("http");
    expect(wireOf("404 Not Found", "x").format).toBe("http");
    expect(wireOf("POSTPONE all", "x").format).toBe("text");
    expect(wireOf("", "A -> B")).toEqual({ format: "text", head: "A -> B" });
  });
});
