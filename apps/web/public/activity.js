// Learning days, streak and daily goal. Loaded on every page; state stays in this browser:
//   mufassall:v1:days  ["YYYY-MM-DD", ...] local dates with any learning activity (last 400)
//   mufassall:v1:day   { d: today, s: lesson steps advanced, c: review cards answered }
//   mufassall:v1:seen  { p: sum of mufassall:v1:progress, c: count of mufassall:v1:checks } at the last look
//   mufassall:v1:goal  "s5" | "c5" | "c10"
// The lesson player writes progress and checks itself, so a change of those values since the last
// look means the reader advanced a step or answered a check. review.js reports cards via .card().
(function () {
  var NS = "mufassall:v1:";
  var get = function (k, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(NS + k));
      return v === null || v === undefined ? fallback : v;
    } catch (e) {
      return fallback;
    }
  };
  var put = function (k, v) {
    try {
      localStorage.setItem(NS + k, JSON.stringify(v));
    } catch (e) {}
  };
  var pad = function (n) {
    return (n < 10 ? "0" : "") + n;
  };
  var keyOf = function (d) {
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
  var days = function () {
    var v = get("days", []);
    return Array.isArray(v)
      ? v.filter(function (s) {
          return typeof s === "string" && /^\d{4}-\d\d-\d\d$/.test(s);
        })
      : [];
  };
  var todayOf = function () {
    var d = keyOf(new Date());
    var t = get("day", null);
    return t && t.d === d ? { d: d, s: Number(t.s) || 0, c: Number(t.c) || 0 } : { d: d, s: 0, c: 0 };
  };

  var markDay = function (kind, n) {
    var d = keyOf(new Date());
    var list = days();
    if (list.indexOf(d) < 0) {
      list.push(d);
      list.sort();
      put("days", list.slice(-400));
    }
    var t = todayOf();
    if (kind) t[kind] += n;
    put("day", t);
    render();
  };

  var signature = function () {
    var p = get("progress", {});
    var c = get("checks", {});
    var sum = 0;
    if (p && typeof p === "object")
      Object.keys(p).forEach(function (k) {
        if (typeof p[k] === "number" && p[k] > 0) sum += p[k];
      });
    return { p: sum, c: c && typeof c === "object" ? Object.keys(c).length : 0 };
  };
  var scan = function () {
    var now = signature();
    var seen = get("seen", null);
    if (!seen || typeof seen.p !== "number" || typeof seen.c !== "number") return put("seen", now); // first look: a baseline, no history is invented
    var steps = now.p - seen.p;
    var checks = now.c - seen.c;
    if (steps === 0 && checks === 0) return;
    put("seen", now);
    if (steps > 0) markDay("s", steps);
    else if (checks > 0) markDay(null, 0);
  };

  // ---- home widget ----
  var root = document.querySelector("[data-streak]");
  var t = function (k) {
    return (root && root.getAttribute("data-" + k)) || "";
  };
  var human = function (d) {
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
  };
  var GOALS = { s5: ["s", 5], c5: ["c", 5], c10: ["c", 10] };

  function render() {
    if (!root) return;
    var list = days();
    var set = {};
    list.forEach(function (k) {
      set[k] = 1;
    });
    var today = new Date();
    var todayKey = keyOf(today);

    // current: run ending today, or yesterday while today is still open
    var cur = 0;
    var d = set[todayKey] ? today : shift(today, -1);
    while (set[keyOf(d)]) {
      cur++;
      d = shift(d, -1);
    }
    var best = 0;
    var run = 0;
    var prev = null;
    list.forEach(function (k) {
      var x = dateOf(k);
      run = prev && keyOf(shift(prev, 1)) === k ? run + 1 : 1;
      if (run > best) best = run;
      prev = x;
    });
    var n = function (v) {
      return t("days-n").replace("{n}", String(v));
    };
    var curEl = root.querySelector("[data-streak-current]");
    var bestEl = root.querySelector("[data-streak-best]");
    if (curEl) curEl.textContent = n(cur);
    if (bestEl) bestEl.textContent = n(Math.max(best, cur));

    // 12 weeks, Monday first, the current week last
    var cells = root.querySelectorAll("[data-heat] [data-cell]");
    var monday = shift(today, -((today.getDay() + 6) % 7));
    var start = shift(monday, -7 * (Math.ceil(cells.length / 7) - 1));
    cells.forEach(function (cell, i) {
      var day = shift(start, i);
      var k = keyOf(day);
      var future = k > todayKey;
      var on = !future && !!set[k];
      cell.setAttribute("data-on", on ? "1" : "0");
      cell.toggleAttribute("data-future", future);
      cell.toggleAttribute("data-today", k === todayKey);
      if (future) {
        cell.setAttribute("aria-hidden", "true");
        cell.removeAttribute("role");
        cell.removeAttribute("aria-label");
        cell.removeAttribute("title");
      } else {
        var label = t(on ? "active" : "idle").replace("{date}", human(day));
        cell.removeAttribute("aria-hidden");
        cell.setAttribute("role", "img");
        cell.setAttribute("aria-label", label);
        cell.setAttribute("title", label);
      }
    });

    // daily goal
    var sel = root.querySelector("[data-streak-goal]");
    var goal = GOALS[get("goal", "s5")] ? get("goal", "s5") : "s5";
    if (sel && sel.value !== goal) sel.value = goal;
    var g = GOALS[goal];
    var done = Math.min(todayOf()[g[0]], g[1]);
    var bar = root.querySelector("[data-streak-bar]");
    if (bar) {
      bar.max = g[1];
      bar.value = done;
    }
    var text = root.querySelector("[data-streak-today]");
    if (text) text.textContent = done >= g[1] ? t("reached") + " ✓" : t("today").replace("{n}", String(done)).replace("{goal}", String(g[1]));
  }

  if (root) {
    var sel = root.querySelector("[data-streak-goal]");
    if (sel)
      sel.addEventListener("change", function () {
        if (GOALS[sel.value]) put("goal", sel.value);
        render();
      });
    window.addEventListener("storage", function (e) {
      if (e.key && e.key.indexOf(NS) === 0) render();
    });
  }

  window.mufassallActivity = {
    card: function () {
      markDay("c", 1);
    },
  };

  scan();
  render();
  document.addEventListener("visibilitychange", scan);
  window.addEventListener("pagehide", scan);
  // the lesson player writes progress in the same tab, which fires no storage event
  setInterval(function () {
    if (document.visibilityState === "visible") scan();
  }, 4000);
})();
