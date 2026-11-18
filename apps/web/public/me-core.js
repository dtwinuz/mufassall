// Pure logic of the "My progress" page (/me.js): the overview numbers, the export file, the
// transfer code, strict import checks and the per-key merge. Plain script: sets
// window.mufassallMeCore; vitest runs it with a stand-in window.
(function (root) {
  var PREFIX = "mufassall:";
  var NS = "mufassall:v1:";
  var VERSION = 1;
  var MAX_BYTES = 1000000; // the whole import text, UTF-8
  var PASS = 70; // test pass mark, same as test-core.js
  var DAY = 864e5;
  // settings, not progress: a reset keeps them
  var PREFS = { "mufassall:theme": 1, "mufassall:v1:keys": 1 };

  var pad = function (n) {
    return (n < 10 ? "0" : "") + n;
  };
  var ymd = function (d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };
  var dateOf = function (k) {
    var p = k.split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  };
  var shift = function (d, n) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  };
  var isObj = function (v) {
    return !!v && typeof v === "object" && !Array.isArray(v);
  };
  // JSON value of a raw string, or undefined when missing or broken
  var json = function (raw) {
    if (typeof raw !== "string") return undefined;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return undefined;
    }
  };
  var obj = function (raw) {
    var v = json(raw);
    return isObj(v) ? v : {};
  };
  var DAY_RE = /^\d{4}-\d\d-\d\d$/;
  var daysOf = function (raw) {
    var v = json(raw);
    return Array.isArray(v)
      ? v.filter(function (s) {
          return typeof s === "string" && DAY_RE.test(s);
        })
      : [];
  };
  var isProgressKey = function (k) {
    return typeof k === "string" && k.indexOf(PREFIX) === 0;
  };
  var isPreference = function (k) {
    return !!PREFS[k];
  };

  // ---------- export ----------
  var envelope = function (data, now) {
    var out = {};
    Object.keys(data)
      .sort()
      .forEach(function (k) {
        if (isProgressKey(k) && typeof data[k] === "string") out[k] = data[k];
      });
    return { app: "mufassall", version: VERSION, exported: now.toISOString(), data: out };
  };
  var fileName = function (now) {
    return "mufassall-progress-" + ymd(now) + ".json";
  };

  var utf8 = function (s) {
    return new TextEncoder().encode(s);
  };
  var bytesOf = function (s) {
    return utf8(s).length;
  };
  // base64url of the UTF-8 bytes, no padding
  var toCode = function (text) {
    var bytes = utf8(text);
    var bin = "";
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  var fromCode = function (code) {
    var s = String(code).replace(/\s+/g, "");
    if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    try {
      var bin = atob(s);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (e) {
      return null;
    }
  };

  // ---------- import ----------
  // text: the file, pasted JSON or a transfer code. { ok, data, exported } or { ok: false, error }
  var parse = function (text) {
    var s = String(text == null ? "" : text).trim();
    if (!s) return { ok: false, error: "empty" };
    if (bytesOf(s) >= MAX_BYTES * 1.4) return { ok: false, error: "size" }; // a code is 4/3 of its JSON
    if (s.charAt(0) !== "{") {
      var decoded = fromCode(s);
      if (decoded === null) return { ok: false, error: "json" };
      s = decoded.trim();
    }
    if (bytesOf(s) >= MAX_BYTES) return { ok: false, error: "size" };
    var v = json(s);
    if (!isObj(v)) return { ok: false, error: "json" };
    if (v.app !== "mufassall") return { ok: false, error: "app" };
    if (v.version !== VERSION) return { ok: false, error: "version" };
    if (!isObj(v.data)) return { ok: false, error: "json" };
    var keys = Object.keys(v.data);
    for (var i = 0; i < keys.length; i++) {
      if (!isProgressKey(keys[i])) return { ok: false, error: "keys" };
      if (typeof v.data[keys[i]] !== "string") return { ok: false, error: "values" };
    }
    if (!keys.length) return { ok: false, error: "empty" };
    var at = typeof v.exported === "string" && !isNaN(Date.parse(v.exported)) ? v.exported : null;
    return { ok: true, data: v.data, exported: at };
  };

  // ---------- merge ----------
  // Every strategy gets the two parsed values and returns [merged value, number of changed items].
  var num = function (v) {
    return typeof v === "number" && isFinite(v) ? v : 0;
  };
  var byId = function (pick) {
    return function (a, b) {
      var out = {};
      var n = 0;
      Object.keys(a).forEach(function (k) {
        out[k] = a[k];
      });
      Object.keys(b).forEach(function (k) {
        if (!(k in a)) {
          out[k] = b[k];
          n++;
        } else {
          var m = pick(a[k], b[k]);
          if (m !== a[k]) {
            out[k] = m;
            n++;
          }
        }
      });
      return [out, n];
    };
  };
  var keepA = function (a) {
    return a;
  };
  var STRATEGY = {
    // FSRS cards: the one reviewed later carries the newer schedule
    "mufassall:v2:review": {
      kind: "cards",
      merge: byId(function (a, b) {
        return isObj(b) && (!isObj(a) || num(b.last) > num(a.last)) ? b : a;
      }),
    },
    "mufassall:v1:review": { kind: "other", merge: byId(keepA) },
    // tests: the higher best; the last score and its date from the later attempt
    "mufassall:v1:tests": {
      kind: "tests",
      merge: byId(function (a, b) {
        if (!isObj(b) || typeof b.best !== "number") return a;
        if (!isObj(a) || typeof a.best !== "number") return b;
        var later = String(b.at || "") > String(a.at || "") ? b : a;
        var best = Math.max(a.best, b.best);
        if (best === a.best && later === a) return a;
        return { best: best, last: later.last, at: later.at };
      }),
    },
    // lesson -> furthest step: the larger one
    "mufassall:v1:progress": {
      kind: "lessons",
      merge: byId(function (a, b) {
        return typeof b === "number" && (typeof a !== "number" || b > a) ? b : a;
      }),
    },
    // first answers: an existing first answer stays the first answer
    "mufassall:v1:checks": { kind: "checks", merge: byId(keepA) },
    // challenge / practice: solved anywhere counts, the later solve date wins
    "mufassall:v1:practice": {
      kind: "other",
      merge: byId(function (a, b) {
        return typeof b === "string" && String(b) > String(a) ? b : a;
      }),
    },
  };
  var LISTS = { "mufassall:v1:days": "days", "mufassall:v1:review:known": "other", "mufassall:v1:lab:solved": "other" };

  var mergeList = function (key, a, b) {
    var isDays = key === "mufassall:v1:days";
    var la = isDays ? daysOf(a) : (Array.isArray(json(a)) ? json(a) : []).filter(function (x) {
      return typeof x === "string";
    });
    var lb = isDays ? daysOf(b) : (Array.isArray(json(b)) ? json(b) : []).filter(function (x) {
      return typeof x === "string";
    });
    var seen = {};
    la.forEach(function (x) {
      seen[x] = 1;
    });
    var added = lb.filter(function (x) {
      if (seen[x]) return false;
      seen[x] = 1;
      return true;
    });
    if (!added.length) return null;
    var out = la.concat(added);
    if (isDays) out = out.sort().slice(-400); // activity.js keeps the last 400 days
    return [JSON.stringify(out), added.length];
  };

  // today's counters: the same day sums nothing twice, so take the larger of each
  var mergeDay = function (a, b) {
    var va = json(a);
    var vb = json(b);
    if (!isObj(vb) || typeof vb.d !== "string") return null;
    if (!isObj(va) || typeof va.d !== "string" || vb.d > va.d) return [b, 1];
    if (vb.d < va.d) return null;
    var s = Math.max(num(va.s), num(vb.s));
    var c = Math.max(num(va.c), num(vb.c));
    if (s === num(va.s) && c === num(va.c)) return null;
    return [JSON.stringify({ d: va.d, s: s, c: c }), 1];
  };

  // what activity.js compares against to notice new steps; set from the merged data so an
  // import is not counted as today's learning
  var signature = function (data) {
    var p = obj(data[NS + "progress"]);
    var sum = 0;
    Object.keys(p).forEach(function (k) {
      if (typeof p[k] === "number" && p[k] > 0) sum += p[k];
    });
    return { p: sum, c: Object.keys(obj(data[NS + "checks"])).length };
  };

  // local, incoming: key -> raw string. Returns the merged map, the keys whose value changes,
  // and counts per kind for the preview.
  var merge = function (local, incoming) {
    var out = {};
    var changed = [];
    var counts = { lessons: 0, checks: 0, cards: 0, tests: 0, days: 0, other: 0 };
    Object.keys(local).forEach(function (k) {
      out[k] = local[k];
    });
    Object.keys(incoming).forEach(function (k) {
      if (!isProgressKey(k) || typeof incoming[k] !== "string" || k === NS + "seen") return;
      var a = local[k];
      var b = incoming[k];
      var res = null;
      var kind = "other";
      if (typeof a !== "string") {
        res = [b, 1];
        kind = STRATEGY[k] ? STRATEGY[k].kind : LISTS[k] || "other";
        // a whole new map counts its entries, not as one
        if (STRATEGY[k]) res[1] = Object.keys(obj(b)).length;
        else if (LISTS[k]) res[1] = Array.isArray(json(b)) ? json(b).length : 0;
      } else if (a === b) {
        res = null;
      } else if (STRATEGY[k]) {
        kind = STRATEGY[k].kind;
        var va = json(a);
        var vb = json(b);
        if (!isObj(vb)) res = null;
        else if (!isObj(va)) res = [b, Object.keys(vb).length];
        else {
          var m = STRATEGY[k].merge(va, vb);
          res = m[1] ? [JSON.stringify(m[0]), m[1]] : null;
        }
      } else if (LISTS[k]) {
        kind = LISTS[k];
        res = mergeList(k, a, b);
      } else if (k === NS + "day") {
        res = mergeDay(a, b);
      }
      // anything else (goal, Lab drafts, settings, future keys): this device's value stays
      if (!res || res[0] === a) return;
      out[k] = res[0];
      changed.push(k);
      counts[kind] += res[1];
    });
    if (changed.indexOf(NS + "progress") >= 0 || changed.indexOf(NS + "checks") >= 0) {
      var sig = JSON.stringify(signature(out));
      if (out[NS + "seen"] !== sig) {
        out[NS + "seen"] = sig;
        changed.push(NS + "seen");
      }
    }
    var total = 0;
    Object.keys(counts).forEach(function (k) {
      total += counts[k];
    });
    return { data: out, changed: changed, counts: counts, total: total };
  };

  // ---------- overview ----------
  var streak = function (days, today) {
    var set = {};
    days.forEach(function (k) {
      set[k] = 1;
    });
    var cur = 0;
    var d = set[ymd(today)] ? today : shift(today, -1);
    while (set[ymd(d)]) {
      cur++;
      d = shift(d, -1);
    }
    var best = 0;
    var run = 0;
    var prev = null;
    days
      .slice()
      .sort()
      .forEach(function (k) {
        run = prev && ymd(shift(prev, 1)) === k ? run + 1 : prev && ymd(prev) === k ? run : 1;
        if (run > best) best = run;
        prev = dateOf(k);
      });
    return { current: cur, best: Math.max(best, cur) };
  };

  var GOALS = { s5: ["s", 5], c5: ["c", 5], c10: ["c", 10] };

  // course: [{ id, lessons: [{ slug, steps }] }]; retr(tDays, s) from fsrs.js, optional
  var overview = function (data, course, now, retr) {
    var today = new Date(now);
    var progress = obj(data[NS + "progress"]);
    var checks = obj(data[NS + "checks"]);
    var tests = obj(data[NS + "tests"]);
    var done = 0;
    var total = 0;
    var next = null;
    var sections = course.map(function (sec) {
      var d = 0;
      var started = 0;
      var lessons = sec.lessons.map(function (l) {
        var r = progress[l.slug];
        var state = typeof r !== "number" ? "none" : r >= l.steps - 1 ? "done" : "started";
        if (state === "done") d++;
        else {
          if (state === "started") started++;
          if (!next) next = { slug: l.slug, step: typeof r === "number" ? r + 1 : 0 };
        }
        return { slug: l.slug, state: state };
      });
      done += d;
      total += lessons.length;
      return { id: sec.id, done: d, started: started, total: lessons.length, lessons: lessons };
    });

    var days = daysOf(data[NS + "days"]);
    var dayRaw = obj(data[NS + "day"]);
    var goalId = GOALS[json(data[NS + "goal"])] ? json(data[NS + "goal"]) : "s5";
    var g = GOALS[goalId];
    var todayCount = dayRaw.d === ymd(today) ? num(dayRaw[g[0]]) : 0;

    // review: v2 if present, else the old Leitner boxes; ids no longer in the course are skipped
    var v2 = json(data["mufassall:v2:review"]);
    var cards = isObj(v2) ? v2 : obj(data[NS + "review"]);
    var dueOf = isObj(v2)
      ? function (c) {
          return num(c.due);
        }
      : function (c) {
          return num(c.d);
        };
    var known = json(data[NS + "review:known"]);
    var live = null;
    if (Array.isArray(known)) {
      live = {};
      known.forEach(function (id) {
        live[id] = 1;
      });
    }
    var ids = Object.keys(cards).filter(function (id) {
      return isObj(cards[id]) && (!live || live[id]);
    });
    var due = ids.filter(function (id) {
      return dueOf(cards[id]) <= now;
    }).length;
    var recall = null;
    if (isObj(v2) && typeof retr === "function") {
      var rs = ids
        .filter(function (id) {
          var c = cards[id];
          return c.st && num(c.s) > 0 && num(c.last) > 0;
        })
        .map(function (id) {
          return retr((now - cards[id].last) / DAY, cards[id].s);
        });
      if (rs.length)
        recall = Math.round(
          (100 *
            rs.reduce(function (a, b) {
              return a + b;
            }, 0)) /
            rs.length,
        );
    }

    var testRows = {};
    var anyTest = false;
    Object.keys(tests).forEach(function (id) {
      var r = tests[id];
      if (!isObj(r) || typeof r.best !== "number") return;
      anyTest = true;
      testRows[id] = { best: r.best, last: num(r.last), at: typeof r.at === "string" ? r.at : "", pass: r.best >= PASS };
    });

    return {
      sections: sections,
      lessonsDone: done,
      lessonsTotal: total,
      next: next,
      certificate: total > 0 && done === total,
      streak: streak(days, today),
      goal: { id: goalId, done: Math.min(todayCount, g[1]), target: g[1] },
      review: { total: ids.length, due: due, recall: recall },
      tests: testRows,
      empty: !Object.keys(progress).length && !Object.keys(checks).length && !ids.length && !anyTest && !days.length,
    };
  };

  root.mufassallMeCore = {
    PREFIX: PREFIX,
    VERSION: VERSION,
    MAX_BYTES: MAX_BYTES,
    PASS: PASS,
    ymd: ymd,
    isProgressKey: isProgressKey,
    isPreference: isPreference,
    envelope: envelope,
    fileName: fileName,
    toCode: toCode,
    fromCode: fromCode,
    parse: parse,
    merge: merge,
    signature: signature,
    streak: streak,
    overview: overview,
  };
})(typeof window !== "undefined" ? window : this);
