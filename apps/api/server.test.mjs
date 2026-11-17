// node --test apps/api
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import {
  cli,
  createBot,
  createHandler,
  createStore,
  nextDailyRun,
  rateLimiter,
  sameSecret,
  toTelegramHtml,
  validateFeedback,
  validateGallery,
} from "./server.mjs";

const quiet = { log() {}, error() {} };

async function startApi(env = {}, bot = null) {
  const dir = await mkdtemp(join(tmpdir(), "mufassall-api-"));
  const store = createStore(dir);
  await store.init();
  const server = createServer(createHandler({ store, env, bot, log: quiet }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, headers = {}) =>
    fetch(base + path, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  return {
    dir,
    store,
    base,
    post,
    async close() {
      server.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}

const goodFeedback = { lesson: "callbacks", step: "retry-1", lang: "uz", kind: "unclear", text: "Bu qadam tushunarsiz" };
const goodGallery = { title: "Mening keshim", author: "Ali", lang: "en", link: "/en/lab/#d=eyJuIjpbXSwiZSI6W119" };

describe("validation", () => {
  test("feedback: accepts a clean record and drops empty text", () => {
    assert.deepEqual(validateFeedback(goodFeedback).value, goodFeedback);
    assert.deepEqual(validateFeedback({ ...goodFeedback, text: "   " }).value, { lesson: "callbacks", step: "retry-1", lang: "uz", kind: "unclear" });
  });
  test("feedback: rejects bad ids, langs, kinds, text and extra fields", () => {
    const cases = [
      [{ ...goodFeedback, lesson: "Callbacks" }, "bad_lesson"],
      [{ ...goodFeedback, lesson: "a".repeat(61) }, "bad_lesson"],
      [{ ...goodFeedback, lesson: "../etc" }, "bad_lesson"],
      [{ ...goodFeedback, step: "" }, "bad_step"],
      [{ ...goodFeedback, step: 3 }, "bad_step"],
      [{ ...goodFeedback, lang: "de" }, "bad_lang"],
      [{ ...goodFeedback, kind: "spam" }, "bad_kind"],
      [{ ...goodFeedback, text: "x".repeat(501) }, "bad_text"],
      [{ ...goodFeedback, text: "bell\u0007" }, "bad_text"],
      [{ ...goodFeedback, text: 5 }, "bad_text"],
      [{ ...goodFeedback, ip: "1.2.3.4" }, "unknown_field"],
      [[goodFeedback], "bad_json"],
      [null, "bad_json"],
    ];
    for (const [body, code] of cases) assert.equal(validateFeedback(body).error, code, JSON.stringify(body)?.slice(0, 80));
    assert.ok(validateFeedback({ ...goodFeedback, text: "😀".repeat(500) }).value, "500 emoji are 500 characters");
  });
  test("gallery: link must be a Lab link of the same language", () => {
    assert.deepEqual(validateGallery(goodGallery).value, goodGallery);
    const cases = [
      [{ ...goodGallery, link: "/uz/lab/#d=abc" }, "bad_link"],
      [{ ...goodGallery, link: "https://evil.example/en/lab/#d=abc" }, "bad_link"],
      [{ ...goodGallery, link: "/en/lab/#d=" }, "bad_link"],
      [{ ...goodGallery, link: "/en/lab/#d=abc\"><script>" }, "bad_link"],
      [{ ...goodGallery, link: `/en/lab/#d=${"a".repeat(8000)}` }, "bad_link"],
      [{ ...goodGallery, title: "" }, "bad_title"],
      [{ ...goodGallery, title: "t".repeat(81) }, "bad_title"],
      [{ ...goodGallery, author: "a".repeat(41) }, "bad_author"],
      [{ ...goodGallery, status: "approved" }, "unknown_field"],
    ];
    for (const [body, code] of cases) assert.equal(validateGallery(body).error, code, JSON.stringify(body).slice(0, 80));
    assert.ok(validateGallery({ ...goodGallery, author: undefined }).value);
  });
  test("admin token compare", () => {
    assert.equal(sameSecret("s3cret", "s3cret"), true);
    assert.equal(sameSecret("s3cre", "s3cret"), false);
    assert.equal(sameSecret("", ""), false);
    assert.equal(sameSecret(undefined, "x"), false);
  });
});

describe("rate limit", () => {
  test("20 per 10 minutes per client, then the window slides", () => {
    let t = Date.UTC(2026, 10, 18, 10, 0, 0);
    const rl = rateLimiter({ limit: 20, windowMs: 600_000, now: () => t });
    for (let i = 0; i < 20; i++) assert.equal(rl.allow("10.0.0.1"), true);
    assert.equal(rl.allow("10.0.0.1"), false);
    assert.equal(rl.allow("10.0.0.2"), true, "another client is not affected");
    t += 600_001;
    assert.equal(rl.allow("10.0.0.1"), true);
  });
});

describe("http", () => {
  let api;
  const sent = [];
  const bot = { notifyFeedback: async (r) => sent.push(["feedback", r]), notifyGallery: async (i) => sent.push(["gallery", i]) };
  before(async () => {
    api = await startApi({ ADMIN_TOKEN: "admin-token-1" }, bot);
  });
  after(() => api.close());

  test("health", async () => {
    const r = await fetch(`${api.base}/api/health`);
    assert.equal(r.status, 200);
    assert.equal(await r.text(), "ok");
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.equal(r.headers.get("cache-control"), "no-store");
  });

  test("feedback is stored without the IP, errors are forwarded", async () => {
    const r = await api.post("/api/feedback", goodFeedback, { "x-forwarded-for": "203.0.113.7, 172.18.0.2" });
    assert.equal(r.status, 204);
    const r2 = await api.post("/api/feedback", { ...goodFeedback, kind: "error", text: "typo" }, { "x-forwarded-for": "203.0.113.7" });
    assert.equal(r2.status, 204);
    const lines = (await readFile(join(api.dir, "feedback.jsonl"), "utf8")).trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(lines.length, 2);
    assert.match(lines[0].time, /^\d{4}-\d\d-\d\dT/);
    assert.ok(!JSON.stringify(lines).includes("203.0.113.7"));
    assert.deepEqual(
      sent.filter((s) => s[0] === "feedback").map((s) => s[1].text),
      ["typo"],
    );
  });

  test("bad input: 400 / 413 with an error code", async () => {
    let r = await api.post("/api/feedback", "{not json", { "x-forwarded-for": "198.51.100.1" });
    assert.equal(r.status, 400);
    assert.deepEqual(await r.json(), { error: "bad_json" });
    r = await api.post("/api/feedback", { ...goodFeedback, kind: "x" }, { "x-forwarded-for": "198.51.100.1" });
    assert.deepEqual([r.status, (await r.json()).error], [400, "bad_kind"]);
    r = await api.post("/api/feedback", { ...goodFeedback, text: "x".repeat(3000) }, { "x-forwarded-for": "198.51.100.1" });
    assert.deepEqual([r.status, (await r.json()).error], [413, "too_large"]);
    r = await fetch(`${api.base}/api/feedback`, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
    assert.deepEqual([r.status, (await r.json()).error], [400, "content_type"]);
    r = await fetch(`${api.base}/api/feedback`);
    assert.equal(r.status, 405);
    r = await fetch(`${api.base}/api/nothing`);
    assert.equal(r.status, 404);
  });

  test("feedback rate limit: the 21st request in 10 minutes is 429", async () => {
    const ip = { "x-forwarded-for": "192.0.2.50" };
    for (let i = 0; i < 20; i++) assert.equal((await api.post("/api/feedback", { ...goodFeedback, kind: "good" }, ip)).status, 204);
    const r = await api.post("/api/feedback", goodFeedback, ip);
    assert.equal(r.status, 429);
    assert.deepEqual(await r.json(), { error: "rate_limited" });
  });

  test("summary needs the admin token", async () => {
    assert.equal((await fetch(`${api.base}/api/feedback/summary`)).status, 403);
    assert.equal((await fetch(`${api.base}/api/feedback/summary?token=wrong`)).status, 403);
    const r = await fetch(`${api.base}/api/feedback/summary?token=admin-token-1`);
    assert.equal(r.status, 200);
    const s = await r.json();
    assert.equal(s.lessons.callbacks["retry-1"].error, 1);
    assert.equal(s.lessons.callbacks["retry-1"].good, 20);
    const h = await fetch(`${api.base}/api/feedback/summary`, { headers: { authorization: "Bearer admin-token-1" } });
    assert.equal(h.status, 200);
  });

  test("gallery: pending until approved, then listed newest first", async () => {
    const ip = { "x-forwarded-for": "192.0.2.80" };
    let r = await api.post("/api/gallery", goodGallery, ip);
    assert.equal(r.status, 201);
    const { id } = await r.json();
    assert.match(id, /^[0-9a-f]{10}$/);
    assert.deepEqual(sent.at(-1)[1].id, id, "moderator was notified");
    const stored = JSON.parse(await readFile(join(api.dir, "gallery.json"), "utf8"));
    assert.equal(stored.items[0].status, "pending");

    r = await fetch(`${api.base}/api/gallery?lang=en`);
    assert.deepEqual(await r.json(), [], "pending items are not public");

    r = await api.post("/api/gallery", { ...goodGallery, title: "Second" }, ip);
    const second = (await r.json()).id;
    const out = [];
    assert.equal(await cli(["approve", id], api.store, { log: (s) => out.push(s), error: (s) => out.push(s) }), 0);
    assert.equal(await cli(["approve", second], api.store, quiet), 0);
    assert.equal(await cli(["reject", "0000000000"], api.store, quiet), 1);
    assert.equal(await cli(["list"], api.store, { log: (s) => out.push(s), error() {} }), 0);
    assert.ok(out.some((l) => l.includes(id) && l.includes("approved")));

    r = await fetch(`${api.base}/api/gallery?lang=en`);
    const list = await r.json();
    assert.deepEqual(
      list.map((i) => i.title),
      ["Second", "Mening keshim"],
    );
    assert.deepEqual(Object.keys(list[0]).sort(), ["author", "created", "id", "link", "title"]);
    assert.deepEqual(await (await fetch(`${api.base}/api/gallery?lang=uz`)).json(), []);
    assert.equal((await fetch(`${api.base}/api/gallery?lang=xx`)).status, 400);

    assert.equal(await cli(["reject", second], api.store, quiet), 0);
    assert.deepEqual(
      (await (await fetch(`${api.base}/api/gallery?lang=en`)).json()).map((i) => i.id),
      [id],
    );
  });

  test("gallery link longer than 8000 characters is refused", async () => {
    const r = await api.post("/api/gallery", { ...goodGallery, link: `/en/lab/#d=${"A".repeat(8000)}` }, { "x-forwarded-for": "192.0.2.81" });
    assert.equal(r.status, 400);
    assert.equal((await r.json()).error, "bad_link");
  });
});

describe("telegram markup", () => {
  test("bold and code become tags, everything else is escaped", () => {
    assert.equal(toTelegramHtml("a **b** `c<d>` & e"), "a <b>b</b> <code>c&lt;d&gt;</code> &amp; e");
    assert.equal(toTelegramHtml("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
    assert.equal(toTelegramHtml("**<i>x</i>**"), "<b>&lt;i&gt;x&lt;/i&gt;</b>");
    assert.equal(toTelegramHtml("2 * 3 ** 4"), "2 * 3 ** 4");
  });
  test("daily run is 09:00 Tashkent = 04:00 UTC", () => {
    assert.equal(new Date(nextDailyRun(Date.UTC(2026, 10, 18, 3, 59))).toISOString(), "2026-11-18T04:00:00.000Z");
    assert.equal(new Date(nextDailyRun(Date.UTC(2026, 10, 18, 4, 0))).toISOString(), "2026-11-19T04:00:00.000Z");
  });
});

describe("telegram bot", () => {
  let dir;
  let store;
  const card = ["callbacks/retry", "Callbacks", "/en/l/callbacks/?step=3", "What does the **server** do with `x<y`?", ["Retries", "Gives up"], 0, "It **retries** & waits."];

  /** Fake Telegram: records calls, answers ok. */
  function fakeFetch(responder = () => ({ ok: true, result: true })) {
    const calls = [];
    const fn = async (url, init) => {
      const method = url.split("/").pop();
      const body = JSON.parse(init.body);
      calls.push({ method, body, url });
      const r = responder(method, body);
      return { ok: r.ok, status: r.status ?? (r.ok ? 200 : 400), json: async () => r };
    };
    fn.calls = calls;
    return fn;
  }

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "mufassall-bot-"));
    store = createStore(join(dir, "data"));
    await store.init();
    await mkdir(join(dir, "site", "en"), { recursive: true });
    await writeFile(join(dir, "site", "en", "review.json"), JSON.stringify([card, ["broken"]]));
  });
  after(() => rm(dir, { recursive: true, force: true }));

  const makeBot = (fetch, extra = {}) =>
    createBot({ token: "123:SECRET", adminChatId: "42", store, siteDir: join(dir, "site"), fetch, log: quiet, random: () => 0, broadcastGapMs: 0, ...extra });

  test("/card sends the question with numbered buttons", async () => {
    const f = fakeFetch();
    await makeBot(f).handleUpdate({ update_id: 1, message: { chat: { id: 7, type: "private" }, from: { language_code: "en-US" }, text: "/card" } });
    assert.equal(f.calls.length, 1);
    const { method, body } = f.calls[0];
    assert.equal(method, "sendMessage");
    assert.equal(body.parse_mode, "HTML");
    assert.match(body.text, /<b>server<\/b>/);
    assert.match(body.text, /<code>x&lt;y<\/code>/);
    assert.deepEqual(
      body.reply_markup.inline_keyboard[0].map((b) => b.text),
      ["1", "2"],
    );
    assert.match(body.reply_markup.inline_keyboard[0][0].callback_data, /^a:en:[0-9a-f]{10}:0$/);
  });

  test("answering edits the message with right/wrong, why and the lesson link", async () => {
    const f = fakeFetch();
    const bot = makeBot(f);
    await bot.handleUpdate({ update_id: 1, message: { chat: { id: 7, type: "private" }, from: { language_code: "en" }, text: "/card" } });
    const cb = f.calls[0].body.reply_markup.inline_keyboard[0];

    await bot.handleUpdate({ update_id: 2, callback_query: { id: "q1", data: cb[1].callback_data, message: { message_id: 99, chat: { id: 7 } } } });
    const edit = f.calls.find((c) => c.method === "editMessageText");
    assert.equal(edit.body.message_id, 99);
    assert.match(edit.body.text, /Not quite/);
    assert.match(edit.body.text, /Right answer: Retries/);
    assert.match(edit.body.text, /It <b>retries<\/b> &amp; waits\./);
    assert.match(edit.body.text, /<a href="https:\/\/mufassall\.dtwin\.uz\/en\/l\/callbacks\/\?step=3">/);
    assert.equal(f.calls.find((c) => c.method === "answerCallbackQuery").body.text, "❌ Not quite.");

    const f2 = fakeFetch();
    await makeBot(f2).handleUpdate({ update_id: 3, callback_query: { id: "q2", data: cb[0].callback_data, message: { message_id: 99, chat: { id: 7 } } } });
    assert.match(f2.calls.find((c) => c.method === "editMessageText").body.text, /✅ Right\./);
  });

  test("an unknown or tampered card answer does not crash", async () => {
    const f = fakeFetch();
    await makeBot(f).handleUpdate({ update_id: 4, callback_query: { id: "q3", data: "a:en:ffffffffff:0", message: { message_id: 1, chat: { id: 7 } } } });
    assert.deepEqual(
      f.calls.map((c) => c.method),
      ["answerCallbackQuery"],
    );
    await makeBot(f).handleUpdate({ update_id: 5, callback_query: { id: "q4", data: "<b>", message: { message_id: 1, chat: { id: 7 } } } });
  });

  test("/start picks the language from language_code; /obuna and /stop persist", async () => {
    const f = fakeFetch();
    const bot = makeBot(f);
    await bot.handleUpdate({ update_id: 6, message: { chat: { id: 8, type: "private" }, from: { language_code: "ru" }, text: "/start" } });
    assert.match(f.calls[0].body.text, /Здравствуйте/);
    assert.equal(f.calls[0].body.reply_markup.inline_keyboard[0].length, 3);
    await bot.handleUpdate({ update_id: 7, message: { chat: { id: 9, type: "private" }, from: { language_code: "uz" }, text: "/obuna" } });
    assert.match(f.calls[1].body.text, /Obuna yoqildi/);
    assert.deepEqual(JSON.parse(await readFile(join(dir, "data", "subscribers.json"), "utf8")), [{ id: 9, lang: "uz" }]);
    await bot.handleUpdate({ update_id: 8, callback_query: { id: "q5", data: "l:en", message: { message_id: 3, chat: { id: 9 } } } });
    assert.deepEqual(JSON.parse(await readFile(join(dir, "data", "subscribers.json"), "utf8")), [{ id: 9, lang: "en" }]);
    await bot.handleUpdate({ update_id: 9, message: { chat: { id: 9, type: "private" }, from: {}, text: "/stop@mufassall_bot" } });
    assert.match(f.calls.at(-1).body.text, /Unsubscribed/);
    assert.deepEqual(JSON.parse(await readFile(join(dir, "data", "subscribers.json"), "utf8")), []);
  });

  test("gallery moderation buttons work only in the admin chat", async () => {
    const r = await store.addGallery({ title: "<Diagram>", lang: "en", link: "/en/lab/#d=abc" });
    const id = r.item.id;
    const f = fakeFetch();
    const bot = makeBot(f);
    await bot.notifyGallery(r.item);
    assert.equal(f.calls[0].body.chat_id, 42);
    assert.match(f.calls[0].body.text, /&lt;Diagram&gt;/);
    await bot.handleUpdate({ update_id: 10, callback_query: { id: "q6", data: `g:a:${id}`, message: { message_id: 5, chat: { id: 1000 } } } });
    assert.equal((await store.listGallery()).find((i) => i.id === id).status, "pending", "a stranger cannot approve");
    await bot.handleUpdate({ update_id: 11, callback_query: { id: "q7", data: `g:a:${id}`, message: { message_id: 5, chat: { id: 42 } } } });
    assert.equal((await store.listGallery()).find((i) => i.id === id).status, "approved");
  });

  test("daily broadcast: paced, drops chats that blocked the bot, token never in logs", async () => {
    await store.saveSubscribers([
      { id: 1, lang: "en" },
      { id: 2, lang: "en" },
    ]);
    const logs = [];
    const f = fakeFetch((method, body) => (body.chat_id === 2 ? { ok: false, status: 403, description: "Forbidden: bot was blocked by the user" } : { ok: true, result: {} }));
    const bot = makeBot(f, { log: { log: (s) => logs.push(s), error: (s) => logs.push(s) } });
    assert.deepEqual(await bot.broadcast(), { sent: 1, removed: 1 });
    assert.match(f.calls[0].body.text, /Card of the day/);
    assert.deepEqual(await store.loadSubscribers(), [{ id: 1, lang: "en" }]);
    assert.ok(logs.every((l) => !l.includes("SECRET")));
  });
});
