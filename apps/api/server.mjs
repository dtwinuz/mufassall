// SPDX-FileCopyrightText: 2026 dtwin
// SPDX-License-Identifier: MIT
//
// mufassall API: lesson feedback, the Lab gallery and the Telegram bot, in one Node 22 process with
// no npm dependencies. Runs as container `mufassall-api` (deploy/docker-compose.yml); the site Caddy
// proxies /api/* to it, the edge Caddy sets X-Forwarded-For.
//
//   POST /api/feedback            {lesson, step, lang, kind, text?}            -> 204
//   GET  /api/feedback/summary    ?token=… or Authorization: Bearer …          -> counts
//   POST /api/gallery             {title, author?, lang, link}                 -> 201 {id}
//   GET  /api/gallery?lang=uz     approved items, newest first (max 100)
//   GET  /api/health              -> "ok"
//   Errors: {"error":"<code>"} with 400 / 404 / 405 / 413 / 429.
//
// Moderation CLI (same data file):  node server.mjs list | approve <id> | reject <id>
// Environment (all optional): PORT=8080, DATA_DIR=/data, SITE_DIR=/releases/current,
//   ADMIN_TOKEN, TG_BOT_TOKEN, ADMIN_CHAT_ID, SITE_URL=https://mufassall.dtwin.uz
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { appendFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

export const LANGS = ["uz", "ru", "en"];
const ID = /^[a-z0-9-]{1,60}$/;
const KINDS = ["unclear", "error", "good"];
// C0/C1 control characters except tab and newline
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/;
const FEEDBACK_MAX = 2 * 1024;
const GALLERY_MAX = 10 * 1024;
const LINK_MAX = 8000;
const PENDING_MAX = 200;
const LIST_MAX = 100;

// ---------- small helpers ----------

/** Code-point length, so one emoji counts as one character. */
const len = (s) => [...s].length;

const isText = (v, max, { optional = false, min = 1 } = {}) => {
  if (v === undefined || v === null) return optional;
  if (typeof v !== "string") return false;
  const t = v.trim();
  if (optional && t === "") return true;
  return len(t) >= min && len(t) <= max && !CONTROL.test(t);
};

/** Constant-time comparison of two secrets of any length. */
export function sameSecret(given, expected) {
  if (typeof given !== "string" || typeof expected !== "string" || expected === "") return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Telegram HTML from the lesson markup: **bold** and `code`, everything else escaped. */
export function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export function toTelegramHtml(text) {
  return String(text)
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .map((part) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) return `<b>${escapeHtml(part.slice(2, -2))}</b>`;
      if (/^`[^`]+`$/.test(part)) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      return escapeHtml(part);
    })
    .join("");
}

/** Writes JSON through a temp file and a rename, so a reader never sees half a file. */
async function writeJsonAtomic(file, value) {
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify(value), { mode: 0o640 });
  await rename(tmp, file);
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return fallback;
    throw e;
  }
}

/** Runs async jobs one after another (read-modify-write on a file). */
function serial() {
  let tail = Promise.resolve();
  return (job) => {
    const run = tail.then(job, job);
    tail = run.catch(() => undefined);
    return run;
  };
}

// ---------- validation ----------

const only = (body, keys) => Object.keys(body).every((k) => keys.includes(k));

/** Returns the clean feedback record, or an error code. */
export function validateFeedback(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "bad_json" };
  if (!only(body, ["lesson", "step", "lang", "kind", "text"])) return { error: "unknown_field" };
  const { lesson, step, lang, kind, text } = body;
  if (typeof lesson !== "string" || !ID.test(lesson)) return { error: "bad_lesson" };
  if (typeof step !== "string" || !ID.test(step)) return { error: "bad_step" };
  if (!LANGS.includes(lang)) return { error: "bad_lang" };
  if (!KINDS.includes(kind)) return { error: "bad_kind" };
  if (!isText(text, 500, { optional: true })) return { error: "bad_text" };
  const t = typeof text === "string" ? text.trim() : "";
  return { value: { lesson, step, lang, kind, ...(t ? { text: t } : {}) } };
}

/** Returns the clean gallery submission, or an error code. */
export function validateGallery(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "bad_json" };
  if (!only(body, ["title", "author", "lang", "link"])) return { error: "unknown_field" };
  const { title, author, lang, link } = body;
  if (!LANGS.includes(lang)) return { error: "bad_lang" };
  if (!isText(title, 80)) return { error: "bad_title" };
  if (!isText(author, 40, { optional: true })) return { error: "bad_author" };
  if (typeof link !== "string" || link.length > LINK_MAX) return { error: "bad_link" };
  const prefix = `/${lang}/lab/#d=`;
  if (!link.startsWith(prefix) || !/^[A-Za-z0-9_-]+={0,2}$/.test(link.slice(prefix.length))) return { error: "bad_link" };
  const a = typeof author === "string" ? author.trim() : "";
  return { value: { title: title.trim(), ...(a ? { author: a } : {}), lang, link } };
}

// ---------- rate limit ----------

/**
 * Fixed number of hits per window per client. Clients are kept as a SHA-256 prefix of the IP with a
 * salt that changes every UTC day, only in memory; the IP itself is never stored.
 */
export function rateLimiter({ limit, windowMs, now = Date.now }) {
  let day = "";
  let salt = Buffer.alloc(0);
  const hits = new Map();
  const key = (ip) => {
    const today = new Date(now()).toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      salt = randomBytes(16);
      hits.clear();
    }
    return createHash("sha256").update(salt).update(String(ip)).digest("hex").slice(0, 16);
  };
  return {
    allow(ip) {
      const k = key(ip);
      const t = now();
      const list = (hits.get(k) ?? []).filter((x) => t - x < windowMs);
      if (list.length >= limit) {
        hits.set(k, list);
        return false;
      }
      list.push(t);
      hits.set(k, list);
      if (hits.size > 50_000) for (const [hk, v] of hits) if (!v.some((x) => t - x < windowMs)) hits.delete(hk);
      return true;
    },
  };
}

/** The client as the edge saw it: first X-Forwarded-For hop, else the socket peer. */
export function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  const first = typeof xff === "string" ? xff.split(",")[0].trim() : "";
  if (first && first.length <= 64 && /^[0-9a-fA-F:.]+$/.test(first)) return first;
  return req.socket?.remoteAddress ?? "unknown";
}

// ---------- storage ----------

export function createStore(dataDir) {
  const galleryFile = join(dataDir, "gallery.json");
  const feedbackFile = join(dataDir, "feedback.jsonl");
  const subscribersFile = join(dataDir, "subscribers.json");
  const queue = serial();
  let cache = { key: "", items: [] };

  const loadGallery = async () => {
    let key = "none";
    try {
      const s = await stat(galleryFile);
      key = `${s.mtimeMs}:${s.size}`;
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    if (key !== cache.key) {
      const data = await readJson(galleryFile, { items: [] });
      cache = { key, items: Array.isArray(data.items) ? data.items : [] };
    }
    return cache.items;
  };
  const saveGallery = async (items) => {
    await writeJsonAtomic(galleryFile, { items });
    cache.key = "";
  };

  return {
    async init() {
      await mkdir(dataDir, { recursive: true });
    },
    appendFeedback: (record) => queue(() => appendFile(feedbackFile, `${JSON.stringify(record)}\n`, { mode: 0o640 })),
    async feedbackSummary() {
      const counts = {};
      let total = 0;
      try {
        await stat(feedbackFile);
      } catch {
        return { total, lessons: counts };
      }
      const lines = createInterface({ input: createReadStream(feedbackFile, "utf8"), crlfDelay: Infinity });
      for await (const line of lines) {
        let r;
        try {
          r = JSON.parse(line);
        } catch {
          continue;
        }
        if (!r || typeof r.lesson !== "string" || typeof r.step !== "string" || !KINDS.includes(r.kind)) continue;
        const steps = (counts[r.lesson] ??= {});
        const kinds = (steps[r.step] ??= { unclear: 0, error: 0, good: 0 });
        kinds[r.kind] += 1;
        total += 1;
      }
      return { total, lessons: counts };
    },
    addGallery: (entry) =>
      queue(async () => {
        const items = await loadGallery();
        if (items.filter((i) => i.status === "pending").length >= PENDING_MAX) return { error: "queue_full" };
        const item = { id: randomBytes(5).toString("hex"), ...entry, status: "pending", created: new Date().toISOString() };
        await saveGallery([...items, item]);
        return { item };
      }),
    /** approve keeps the item as approved; reject removes it. */
    moderate: (id, action) =>
      queue(async () => {
        const items = await loadGallery();
        const item = items.find((i) => i.id === id);
        if (!item) return { error: "not_found" };
        if (action === "approve") {
          if (item.status !== "approved") await saveGallery(items.map((i) => (i.id === id ? { ...i, status: "approved" } : i)));
          return { item: { ...item, status: "approved" } };
        }
        await saveGallery(items.filter((i) => i.id !== id));
        return { item: { ...item, status: "rejected" } };
      }),
    async listGallery() {
      return [...(await loadGallery())];
    },
    async approved(lang) {
      // reversed first, so items created in the same millisecond still come newest first
      return [...(await loadGallery())]
        .reverse()
        .filter((i) => i.status === "approved" && i.lang === lang)
        .sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : 0))
        .slice(0, LIST_MAX)
        .map(({ id, title, author, link, created }) => ({ id, title, author: author ?? null, link, created }));
    },
    async loadSubscribers() {
      const data = await readJson(subscribersFile, []);
      return Array.isArray(data) ? data.filter((s) => Number.isSafeInteger(s?.id) && LANGS.includes(s?.lang)) : [];
    },
    saveSubscribers: (list) => queue(() => writeJsonAtomic(subscribersFile, list)),
  };
}

// ---------- HTTP ----------

const BASE_HEADERS = { "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" };

function send(res, status, body) {
  if (body === undefined) {
    res.writeHead(status, BASE_HEADERS);
    return res.end();
  }
  if (typeof body === "string") {
    res.writeHead(status, { ...BASE_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
    return res.end(body);
  }
  res.writeHead(status, { ...BASE_HEADERS, "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

/** Reads at most `max` bytes, then parses JSON. Oversized bodies are cut off before parsing. */
function readJsonBody(req, max) {
  return new Promise((resolve, reject) => {
    const type = String(req.headers["content-type"] ?? "").toLowerCase();
    if (!type.startsWith("application/json")) return reject(new HttpError(400, "content_type"));
    const declared = Number(req.headers["content-length"]);
    if (Number.isFinite(declared) && declared > max) return reject(new HttpError(413, "too_large"));
    const chunks = [];
    let size = 0;
    let done = false;
    req.on("data", (c) => {
      if (done) return;
      size += c.length;
      if (size > max) {
        done = true;
        req.resume();
        return reject(new HttpError(413, "too_large"));
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (done) return;
      done = true;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "bad_json"));
      }
    });
    req.on("error", () => {
      if (!done) {
        done = true;
        reject(new HttpError(400, "bad_request"));
      }
    });
  });
}

export function createHandler({ store, env = {}, bot = null, now = Date.now, log = console }) {
  const feedbackLimit = rateLimiter({ limit: 20, windowMs: 10 * 60_000, now });
  const galleryLimit = rateLimiter({ limit: 5, windowMs: 10 * 60_000, now });

  const routes = {
    "/api/health": { GET: async (req, res) => send(res, 200, "ok") },
    "/api/feedback": {
      POST: async (req, res) => {
        if (!feedbackLimit.allow(clientIp(req))) return send(res, 429, { error: "rate_limited" });
        const v = validateFeedback(await readJsonBody(req, FEEDBACK_MAX));
        if (v.error) return send(res, 400, { error: v.error });
        const record = { time: new Date(now()).toISOString(), ...v.value };
        await store.appendFeedback(record);
        if (record.kind === "error" && bot) bot.notifyFeedback(record).catch(() => undefined);
        send(res, 204);
      },
    },
    "/api/feedback/summary": {
      GET: async (req, res, url) => {
        if (!env.ADMIN_TOKEN) return send(res, 404, { error: "not_found" });
        const auth = String(req.headers.authorization ?? "");
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : (url.searchParams.get("token") ?? "");
        if (!sameSecret(token, env.ADMIN_TOKEN)) return send(res, 403, { error: "forbidden" });
        send(res, 200, await store.feedbackSummary());
      },
    },
    "/api/gallery": {
      GET: async (req, res, url) => {
        const lang = url.searchParams.get("lang");
        if (!LANGS.includes(lang)) return send(res, 400, { error: "bad_lang" });
        send(res, 200, await store.approved(lang));
      },
      POST: async (req, res) => {
        if (!galleryLimit.allow(clientIp(req))) return send(res, 429, { error: "rate_limited" });
        const v = validateGallery(await readJsonBody(req, GALLERY_MAX));
        if (v.error) return send(res, 400, { error: v.error });
        const r = await store.addGallery(v.value);
        if (r.error) return send(res, 429, { error: r.error });
        if (bot) bot.notifyGallery(r.item).catch(() => undefined);
        send(res, 201, { id: r.item.id });
      },
    },
  };

  return async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const route = routes[url.pathname.replace(/\/+$/, "") || "/"];
      if (!route) return send(res, 404, { error: "not_found" });
      const handler = route[req.method === "HEAD" ? "GET" : req.method];
      if (!handler) {
        res.setHeader("Allow", Object.keys(route).join(", "));
        return send(res, 405, { error: "method" });
      }
      await handler(req, res, url);
    } catch (e) {
      if (e instanceof HttpError) {
        if (e.status === 413) res.setHeader("Connection", "close");
        return send(res, e.status, { error: e.code });
      }
      log.error(`api: ${req.method} ${String(req.url).split("?")[0]} failed: ${e?.message ?? e}`);
      if (!res.headersSent) send(res, 500, { error: "internal" });
      else res.end();
    }
  };
}

// ---------- Telegram bot ----------

const T = {
  uz: {
    welcome:
      "Assalomu alaykum! Men <b>mufassall</b> botiman: darslardagi savollardan tasodifiy karta yuboraman.\n\n/karta — savol olish\n/obuna — har kuni 09:00 da bitta karta\n/stop — obunani to'xtatish\n/til — tilni almashtirish",
    pick: "Tilni tanlang:",
    langSet: "Til: O'zbekcha.",
    right: "✅ To'g'ri.",
    wrong: "❌ Unchalik emas.",
    answer: "To'g'ri javob",
    open: "Darsda ko'rish",
    next: "Yana karta",
    noCards: "Hozircha kartalar yo'q. Keyinroq urinib ko'ring.",
    gone: "Bu karta eskirgan. /karta bilan yangisini oling.",
    subscribed: "Obuna yoqildi: har kuni 09:00 da (Toshkent) bitta karta keladi. To'xtatish: /stop",
    already: "Siz allaqachon obunasiz. To'xtatish: /stop",
    stopped: "Obuna to'xtatildi. Qayta yoqish: /obuna",
    notSub: "Siz obuna emassiz. Yoqish: /obuna",
    daily: "Bugungi karta",
    unknown: "Buyruqlar: /karta, /obuna, /stop, /til",
  },
  ru: {
    welcome:
      "Здравствуйте! Я бот <b>mufassall</b>: присылаю случайную карточку с вопросом из уроков.\n\n/karta — получить вопрос\n/obuna — одна карточка каждый день в 09:00\n/stop — отписаться\n/til — сменить язык",
    pick: "Выберите язык:",
    langSet: "Язык: русский.",
    right: "✅ Верно.",
    wrong: "❌ Не совсем.",
    answer: "Верный ответ",
    open: "Открыть в уроке",
    next: "Ещё карточку",
    noCards: "Карточек пока нет. Попробуйте позже.",
    gone: "Эта карточка устарела. Новая: /karta",
    subscribed: "Подписка включена: каждый день в 09:00 (Ташкент) придёт карточка. Отписаться: /stop",
    already: "Вы уже подписаны. Отписаться: /stop",
    stopped: "Подписка отключена. Включить снова: /obuna",
    notSub: "Вы не подписаны. Подписаться: /obuna",
    daily: "Карточка дня",
    unknown: "Команды: /karta, /obuna, /stop, /til",
  },
  en: {
    welcome:
      "Hi! I am the <b>mufassall</b> bot: I send a random prediction-check card from the lessons.\n\n/card — get a question\n/subscribe — one card every day at 09:00\n/stop — unsubscribe\n/lang — change language",
    pick: "Choose a language:",
    langSet: "Language: English.",
    right: "✅ Right.",
    wrong: "❌ Not quite.",
    answer: "Right answer",
    open: "See it in the lesson",
    next: "Another card",
    noCards: "No cards yet. Try again later.",
    gone: "This card is out of date. Get a new one with /card",
    subscribed: "Subscribed: a card arrives every day at 09:00 (Tashkent). Unsubscribe: /stop",
    already: "You are already subscribed. Unsubscribe: /stop",
    stopped: "Unsubscribed. Subscribe again: /subscribe",
    notSub: "You are not subscribed. Subscribe: /subscribe",
    daily: "Card of the day",
    unknown: "Commands: /card, /subscribe, /stop, /lang",
  },
};
export const BOT_TEXT = T;

const LANG_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "O'zbekcha", callback_data: "l:uz" },
      { text: "Русский", callback_data: "l:ru" },
      { text: "English", callback_data: "l:en" },
    ],
  ],
};

const cardKey = (id) => createHash("sha256").update(id).digest("hex").slice(0, 10);
const HREF = /^\/(uz|ru|en)\/l\/[a-z0-9-]{1,60}\/(\?step=\d{1,3})?$/;

/** Rows of /<lang>/review.json that have the expected shape. */
export function parseCards(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (r) =>
      Array.isArray(r) &&
      r.length >= 7 &&
      typeof r[0] === "string" &&
      typeof r[1] === "string" &&
      typeof r[2] === "string" &&
      typeof r[3] === "string" &&
      Array.isArray(r[4]) &&
      r[4].length > 0 &&
      r[4].length <= 8 &&
      r[4].every((o) => typeof o === "string") &&
      Number.isInteger(r[5]) &&
      r[5] >= 0 &&
      r[5] < r[4].length &&
      typeof r[6] === "string",
  );
}

/** Next 09:00 in Asia/Tashkent (UTC+5, no daylight saving) = 04:00 UTC, strictly after `t`. */
export function nextDailyRun(t) {
  const d = new Date(t);
  const run = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 4, 0, 0);
  return run > t ? run : run + 864e5;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createBot({
  token,
  adminChatId,
  store,
  siteDir,
  siteUrl = "https://mufassall.dtwin.uz",
  fetch: fetchImpl = globalThis.fetch,
  now = Date.now,
  random = Math.random,
  log = console,
  broadcastGapMs = 40, // 25 messages a second, under Telegram's 30/s
}) {
  const admin = adminChatId ? Number(adminChatId) : null;
  const langs = new Map(); // chat id -> lang, for this process only
  let subscribers = null;
  let offset = 0;
  let running = false;
  let timer = null;
  const cardCache = new Map(); // lang -> {key, cards}

  class TgError extends Error {
    constructor(method, status, body) {
      super(`telegram ${method}: ${status} ${body?.description ?? ""}`.trim());
      this.status = status;
      this.retryAfter = body?.parameters?.retry_after;
    }
  }

  async function call(method, params = {}, timeoutMs = 15_000) {
    // The token is part of the URL: never log the URL, only the method name.
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(timeoutMs),
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok || !body?.ok) throw new TgError(method, res.status, body);
    return body.result;
  }

  const sendMessage = (chat_id, text, extra = {}) =>
    call("sendMessage", { chat_id, text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...extra });

  async function subs() {
    subscribers ??= await store.loadSubscribers();
    return subscribers;
  }
  async function langOf(chatId, languageCode) {
    if (langs.has(chatId)) return langs.get(chatId);
    const s = (await subs()).find((x) => x.id === chatId);
    if (s) return s.lang;
    const code = String(languageCode ?? "").toLowerCase();
    return code.startsWith("ru") ? "ru" : code.startsWith("uz") ? "uz" : "en";
  }

  async function cards(lang) {
    const file = join(siteDir, lang, "review.json");
    try {
      const s = await stat(file); // follows releases/current to the live release
      const key = `${s.ino}:${s.mtimeMs}:${s.size}`;
      const hit = cardCache.get(lang);
      if (hit && hit.key === key) return hit.cards;
      const list = parseCards(JSON.parse(await readFile(file, "utf8")));
      cardCache.set(lang, { key, cards: list });
      return list;
    } catch (e) {
      log.error(`bot: cannot read ${lang}/review.json: ${e?.code ?? e?.message ?? e}`);
      return [];
    }
  }

  function cardMessage(lang, card, prefix = "") {
    const [id, lessonTitle, , question, options] = card;
    const key = cardKey(id);
    // options go in the text (buttons cut long labels), the buttons carry only their numbers
    const list = options.map((o, i) => `${i + 1}. ${toTelegramHtml(o)}`).join("\n");
    const text = `${prefix}<b>${escapeHtml(lessonTitle)}</b>\n\n${toTelegramHtml(question)}\n\n${list}`;
    const inline_keyboard = [options.map((_, i) => ({ text: String(i + 1), callback_data: `a:${lang}:${key}:${i}` }))];
    return { text, reply_markup: { inline_keyboard } };
  }

  async function sendCard(chatId, lang, prefix = "") {
    const list = await cards(lang);
    const t = T[lang];
    if (!list.length) return sendMessage(chatId, t.noCards);
    const card = list[Math.floor(random() * list.length) % list.length];
    const m = cardMessage(lang, card, prefix);
    return sendMessage(chatId, m.text, { reply_markup: m.reply_markup });
  }

  /** The edited message after an answer: verdict, right answer, why, link to the lesson step. */
  function answerMessage(lang, card, picked) {
    const [, lessonTitle, href, question, options, answer, why] = card;
    const t = T[lang];
    const ok = picked === answer;
    const lines = [
      `<b>${escapeHtml(lessonTitle)}</b>`,
      "",
      toTelegramHtml(question),
      "",
      ok ? t.right : t.wrong,
      `${t.answer}: ${toTelegramHtml(options[answer])}`,
      "",
      toTelegramHtml(why),
    ];
    if (HREF.test(href)) lines.push("", `<a href="${escapeHtml(siteUrl + href)}">${escapeHtml(t.open)}</a>`);
    return { ok, text: lines.join("\n") };
  }

  async function setSub(chatId, lang, on) {
    const list = await subs();
    const i = list.findIndex((s) => s.id === chatId);
    if (on && i === -1) list.push({ id: chatId, lang });
    else if (on) list[i] = { id: chatId, lang };
    else if (i !== -1) list.splice(i, 1);
    else return;
    await store.saveSubscribers(list);
  }

  async function handleMessage(msg) {
    const chatId = msg?.chat?.id;
    if (!Number.isSafeInteger(chatId) || typeof msg.text !== "string") return;
    const m = /^\/([a-z]+)(?:@\w+)?(?:\s|$)/i.exec(msg.text.trim());
    if (!m) return;
    const cmd = m[1].toLowerCase();
    const lang = await langOf(chatId, msg.from?.language_code);
    const t = T[lang];
    switch (cmd) {
      case "start":
        return sendMessage(chatId, t.welcome, { reply_markup: LANG_KEYBOARD });
      case "karta":
      case "card":
        return sendCard(chatId, lang);
      case "obuna":
      case "subscribe": {
        const was = (await subs()).some((s) => s.id === chatId);
        await setSub(chatId, lang, true);
        return sendMessage(chatId, was ? t.already : t.subscribed);
      }
      case "stop": {
        const was = (await subs()).some((s) => s.id === chatId);
        await setSub(chatId, lang, false);
        return sendMessage(chatId, was ? t.stopped : t.notSub);
      }
      case "til":
      case "lang":
        return sendMessage(chatId, t.pick, { reply_markup: LANG_KEYBOARD });
      default:
        if (msg.chat.type === "private") return sendMessage(chatId, t.unknown);
    }
  }

  async function handleCallback(cq) {
    const data = typeof cq?.data === "string" ? cq.data : "";
    const msg = cq?.message;
    const chatId = msg?.chat?.id;
    if (!Number.isSafeInteger(chatId)) return call("answerCallbackQuery", { callback_query_id: cq.id });

    let m;
    if ((m = /^l:(uz|ru|en)$/.exec(data))) {
      const lang = m[1];
      langs.set(chatId, lang);
      if ((await subs()).some((s) => s.id === chatId)) await setSub(chatId, lang, true);
      await call("answerCallbackQuery", { callback_query_id: cq.id, text: T[lang].langSet });
      return call("editMessageText", { chat_id: chatId, message_id: msg.message_id, text: T[lang].welcome, parse_mode: "HTML" });
    }
    if ((m = /^a:(uz|ru|en):([0-9a-f]{10}):(\d)$/.exec(data))) {
      const [, lang, key, pickedS] = m;
      const card = (await cards(lang)).find((c) => cardKey(c[0]) === key);
      const picked = Number(pickedS);
      if (!card || picked >= card[4].length) return call("answerCallbackQuery", { callback_query_id: cq.id, text: T[lang].gone });
      const r = answerMessage(lang, card, picked);
      await call("answerCallbackQuery", { callback_query_id: cq.id, text: r.ok ? T[lang].right : T[lang].wrong });
      return call("editMessageText", {
        chat_id: chatId,
        message_id: msg.message_id,
        text: r.text,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        reply_markup: { inline_keyboard: [[{ text: T[lang].next, callback_data: `n:${lang}` }]] },
      });
    }
    if ((m = /^n:(uz|ru|en)$/.exec(data))) {
      await call("answerCallbackQuery", { callback_query_id: cq.id });
      return sendCard(chatId, m[1]);
    }
    if ((m = /^g:(a|r):([0-9a-f]{10})$/.exec(data))) {
      if (admin === null || chatId !== admin) return call("answerCallbackQuery", { callback_query_id: cq.id });
      const r = await store.moderate(m[2], m[1] === "a" ? "approve" : "reject");
      const verdict = r.error ? `not found: ${m[2]}` : `${r.item.status}: ${r.item.id}`;
      await call("answerCallbackQuery", { callback_query_id: cq.id, text: verdict });
      const title = r.item ? ` — ${escapeHtml(r.item.title)}` : "";
      return call("editMessageText", { chat_id: chatId, message_id: msg.message_id, text: `🖼 ${escapeHtml(verdict)}${title}`, parse_mode: "HTML" });
    }
    return call("answerCallbackQuery", { callback_query_id: cq.id });
  }

  async function handleUpdate(u) {
    try {
      if (u.message) await handleMessage(u.message);
      else if (u.callback_query) await handleCallback(u.callback_query);
    } catch (e) {
      log.error(`bot: update failed: ${e?.message ?? e}`);
    }
  }

  async function poll() {
    let backoff = 1000;
    while (running) {
      try {
        const updates = await call("getUpdates", { offset, timeout: 50, allowed_updates: ["message", "callback_query"] }, 65_000);
        backoff = 1000;
        for (const u of updates) {
          offset = Math.max(offset, u.update_id + 1);
          await handleUpdate(u);
        }
      } catch (e) {
        if (!running) break;
        const wait = e?.retryAfter ? e.retryAfter * 1000 : backoff;
        log.error(`bot: ${e?.message ?? e}; retry in ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        backoff = Math.min(backoff * 2, 60_000);
      }
    }
  }

  /** The daily card to every subscriber, paced under the Telegram limit. Blocked chats are dropped. */
  async function broadcast() {
    const list = [...(await subs())];
    const gone = [];
    let sent = 0;
    for (const s of list) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await sendCard(s.id, s.lang, `🗓 ${escapeHtml(T[s.lang].daily)}\n\n`);
          sent++;
          break;
        } catch (e) {
          if (e?.retryAfter) {
            await sleep(e.retryAfter * 1000);
            continue;
          }
          // blocked the bot, or the chat no longer exists; other errors keep the subscriber
          if (e?.status === 403 || (e?.status === 400 && /chat not found/i.test(e.message))) gone.push(s.id);
          break;
        }
      }
      await sleep(broadcastGapMs);
    }
    if (gone.length) {
      const now = await subs();
      for (const id of gone) {
        const i = now.findIndex((x) => x.id === id);
        if (i !== -1) now.splice(i, 1);
      }
      await store.saveSubscribers(now);
    }
    log.log(`bot: daily card sent to ${sent}/${list.length}, removed ${gone.length}`);
    return { sent, removed: gone.length };
  }

  function schedule() {
    if (!running) return;
    const wait = nextDailyRun(now()) - now();
    timer = setTimeout(async () => {
      try {
        await broadcast();
      } catch (e) {
        log.error(`bot: broadcast failed: ${e?.message ?? e}`);
      }
      schedule();
    }, Math.min(wait, 2 ** 31 - 1));
    timer.unref?.();
  }

  return {
    handleUpdate,
    handleMessage,
    handleCallback,
    broadcast,
    answerMessage,
    async notifyFeedback(r) {
      if (admin === null) return;
      const text = [`⚠️ <b>error</b> ${escapeHtml(`${r.lesson} / ${r.step}`)} (${r.lang})`, r.text ? escapeHtml(r.text) : ""].filter(Boolean).join("\n\n");
      try {
        await sendMessage(admin, text);
      } catch (e) {
        log.error(`bot: feedback notify failed: ${e?.message ?? e}`);
      }
    },
    async notifyGallery(item) {
      if (admin === null) return;
      const head = `🖼 <b>${escapeHtml(item.title)}</b>${item.author ? ` — ${escapeHtml(item.author)}` : ""} (${item.lang})\nid: <code>${item.id}</code>`;
      const reply_markup = {
        inline_keyboard: [[{ text: "✅ Approve", callback_data: `g:a:${item.id}` }, { text: "🗑 Reject", callback_data: `g:r:${item.id}` }]],
      };
      try {
        await sendMessage(admin, `${head}\n<a href="${escapeHtml(siteUrl + item.link)}">Open in Lab</a>`, { reply_markup });
      } catch {
        // a very long link can be refused: send the card without it, the CLI `list` prints it
        try {
          await sendMessage(admin, `${head}\nlink: ${item.link.length} chars, see \`list\``, { reply_markup });
        } catch (e) {
          log.error(`bot: gallery notify failed: ${e?.message ?? e}`);
        }
      }
    },
    start() {
      running = true;
      poll();
      schedule();
    },
    stop() {
      running = false;
      if (timer) clearTimeout(timer);
    },
  };
}

// ---------- entry ----------

async function cli(args, store, out = console) {
  const [cmd, id] = args;
  if (cmd === "list") {
    const items = await store.listGallery();
    if (!items.length) out.log("(empty)");
    for (const i of items) out.log(`${i.id}  ${i.status.padEnd(8)}  ${i.lang}  ${i.created}  ${i.title}${i.author ? ` — ${i.author}` : ""}\n    ${i.link.length > 120 ? `${i.link.slice(0, 120)}… (${i.link.length} chars)` : i.link}`);
    return 0;
  }
  if ((cmd === "approve" || cmd === "reject") && /^[0-9a-f]{10}$/.test(id ?? "")) {
    const r = await store.moderate(id, cmd);
    if (r.error) {
      out.error(`not found: ${id}`);
      return 1;
    }
    out.log(`${r.item.status}: ${id} ${r.item.title}`);
    return 0;
  }
  out.error("usage: node server.mjs [list | approve <id> | reject <id>]");
  return 2;
}
export { cli };

async function main() {
  const env = process.env;
  const store = createStore(env.DATA_DIR || "/data");
  await store.init();
  const args = process.argv.slice(2);
  if (args.length) process.exit(await cli(args, store));

  const bot = env.TG_BOT_TOKEN
    ? createBot({
        token: env.TG_BOT_TOKEN,
        adminChatId: env.ADMIN_CHAT_ID,
        store,
        siteDir: env.SITE_DIR || "/releases/current",
        siteUrl: env.SITE_URL || "https://mufassall.dtwin.uz",
      })
    : null;
  const server = createServer(createHandler({ store, env, bot }));
  server.requestTimeout = 10_000;
  server.headersTimeout = 5_000;
  server.keepAliveTimeout = 5_000;
  const port = Number(env.PORT) || 8080;
  server.listen(port, () => console.log(`api: listening on :${port}, bot ${bot ? "on" : "off"}, admin token ${env.ADMIN_TOKEN ? "set" : "unset"}`));
  bot?.start();
  const shutdown = () => {
    bot?.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
