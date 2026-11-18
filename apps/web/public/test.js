// Section test on /<lang>/test/<section>/: up to 10 of the section's lesson checks, no feedback
// until the end, then the score with links back to the steps that were missed.
// Questions come from /<lang>/test/<section>.json; the pick is seeded (?seed=N retakes the same test).
// Logic lives in /test-core.js (window.mufassallTestCore). State in this browser only:
//   mufassall:v1:tests  section -> { best, last, at: "YYYY-MM-DD" }
//   mufassall:v1:keys   "off" = the reader switched single-key shortcuts off (WCAG 2.1.4)
(function () {
  var KEY = "mufassall:v1:tests";
  // the list page /<lang>/test/: best score badge per section
  var listPage = document.querySelector("[data-test-list]");
  if (listPage) {
    var stored = {};
    try {
      stored = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    } catch (e) {}
    listPage.querySelectorAll("[data-test-best]").forEach(function (b) {
      var r = stored[b.getAttribute("data-test-best")];
      if (!r || typeof r.best !== "number") return;
      b.textContent = (listPage.getAttribute("data-best") || "").replace("{p}", String(r.best));
      b.classList.add(r.best >= Number(listPage.getAttribute("data-pass") || 70) ? "is-pass" : "is-fail");
    });
  }
  var root = document.querySelector("[data-test]");
  var core = window.mufassallTestCore;
  if (!root || !core) return;
  var section = root.getAttribute("data-test") || "";
  var lang = document.documentElement.lang || "en";
  var t = function (k) {
    return root.getAttribute("data-" + k) || "";
  };
  var fill = function (s, v) {
    return s.replace(/\{(\w+)\}/g, function (_, k) {
      return v[k] === undefined ? "" : v[k];
    });
  };
  var keysOn = function () {
    try {
      return localStorage.getItem("mufassall:v1:keys") !== "off";
    } catch (e) {
      return true;
    }
  };
  var readAll = function () {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "{}");
      return v && typeof v === "object" ? v : {};
    } catch (e) {
      return {};
    }
  };
  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  // **bold** and `code`, built as nodes
  var rich = function (node, text) {
    node.textContent = "";
    String(text)
      .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
      .forEach(function (part) {
        if (!part) return;
        var tag = /^\*\*.*\*\*$/.test(part) ? "strong" : /^`.*`$/.test(part) ? "code" : null;
        if (!tag) return node.appendChild(document.createTextNode(part));
        var n = document.createElement(tag);
        n.textContent = tag === "strong" ? part.slice(2, -2) : part.slice(1, -1);
        node.appendChild(n);
      });
  };

  var seed = core.parseSeed(location.search) || core.newSeed();
  var questions = [];
  var picks = [];
  var at = 0;
  var onKey = null;

  var setKeys = function (fn) {
    if (onKey) document.removeEventListener("keydown", onKey);
    onKey = fn;
    if (fn) document.addEventListener("keydown", fn);
  };

  // focus: true after "Next", so keyboard and screen reader users land on the new question
  var show = function (focus) {
    var q = questions[at];
    var pick = -1;
    root.textContent = "";
    var head = el("div", "review__head");
    head.appendChild(el("span", "review__count", fill(t("progress"), { i: at + 1, n: questions.length })));
    head.appendChild(el("span", "test__seed", fill(t("seed"), { seed: seed })));
    root.appendChild(head);
    var bar = el("progress", "test__bar");
    bar.max = questions.length;
    bar.value = at;
    bar.setAttribute("aria-hidden", "true");
    root.appendChild(bar);

    var card = el("fieldset", "mf-check review__card");
    var legend = el("legend", "mf-check__q");
    legend.tabIndex = -1;
    rich(legend, q.src.q);
    card.appendChild(legend);
    var list = el("ol", "mf-check__options");
    var buttons = [];
    var last = at === questions.length - 1;
    var next = el("button", "mf-btn mf-btn--primary", last ? t("finish") : t("next"));
    next.type = "button";
    next.disabled = true;

    var choose = function (i) {
      pick = i;
      buttons.forEach(function (b, j) {
        b.setAttribute("aria-pressed", j === i ? "true" : "false");
      });
      next.disabled = false;
    };
    var go = function () {
      if (pick < 0) return;
      picks[at] = pick;
      at++;
      if (at < questions.length) show(true);
      else finish();
    };
    next.addEventListener("click", go);

    q.options.forEach(function (o, i) {
      var li = el("li");
      var b = el("button", "mf-check__opt test__opt");
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      var k = el("kbd", "", String(i + 1));
      k.setAttribute("aria-hidden", "true");
      b.appendChild(k);
      var label = el("span");
      rich(label, o);
      b.appendChild(label);
      b.addEventListener("click", function () {
        choose(i);
      });
      buttons.push(b);
      li.appendChild(b);
      list.appendChild(li);
    });
    card.appendChild(list);
    var row = el("div", "review__actions");
    row.appendChild(next);
    card.appendChild(row);
    root.appendChild(card);
    var keys = el("p", "mf-keys", t("keys"));
    keys.hidden = !keysOn();
    root.appendChild(keys);

    setKeys(function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var tg = e.target;
      if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) return;
      // Enter on a focused button or link already clicks it; only handle Enter elsewhere
      if (e.key === "Enter") {
        if (tg && /^(BUTTON|A)$/.test(tg.tagName)) return;
        if (pick >= 0) {
          e.preventDefault();
          go();
        }
        return;
      }
      if (!keysOn()) return;
      var n = Number(e.key);
      if (n >= 1 && n <= q.options.length) {
        e.preventDefault();
        choose(n - 1);
      }
    });
    if (focus) legend.focus({ preventScroll: false });
  };

  var finish = function () {
    setKeys(null);
    var r = core.score(questions, picks);
    var all = readAll();
    var rec = core.record(all[section], r.pct, new Date());
    all[section] = rec;
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch (e) {}
    if (window.mufassallActivity)
      r.rows.forEach(function () {
        window.mufassallActivity.card(); // streak and daily goal (/activity.js)
      });

    root.textContent = "";
    var box = el("div", "review__empty test__result" + (r.pass ? " is-pass" : " is-fail"));
    var title = el("h2", "review__summary-title", fill(t("result"), { right: r.right, n: r.total, p: r.pct }));
    title.tabIndex = -1;
    box.appendChild(title);
    box.appendChild(el("p", "test__verdict", r.pass ? "✓ " + t("passed") : fill(t("failed"), { pass: core.PASS })));
    box.appendChild(el("p", "review__meta", fill(t("best-now"), { p: rec.best }) + " · " + fill(t("seed"), { seed: seed })));
    var acts = el("div", "review__actions");
    var again = el("a", "mf-btn mf-btn--primary", t("retake"));
    again.href = "?seed=" + seed;
    acts.appendChild(again);
    var fresh = el("a", "mf-btn", t("fresh"));
    fresh.href = location.pathname;
    acts.appendChild(fresh);
    var back = el("a", "mf-btn", t("all"));
    back.href = "/" + lang + "/test/";
    acts.appendChild(back);
    box.appendChild(acts);
    root.appendChild(box);

    var list = el("ol", "test__review");
    r.rows.forEach(function (row) {
      var src = row.q.src;
      var li = el("li", "test__item " + (row.ok ? "is-right" : "is-wrong"));
      var q = el("p", "test__q");
      var mark = el("span", "test__mark", row.ok ? "✓" : "✗");
      mark.setAttribute("aria-hidden", "true");
      q.appendChild(mark);
      var sr = el("span", "sr-only", (row.ok ? t("right") : t("wrong")) + ": ");
      q.appendChild(sr);
      var qt = el("span");
      rich(qt, src.q);
      q.appendChild(qt);
      li.appendChild(q);
      var dl = el("dl", "test__answers");
      var pair = function (label, text) {
        dl.appendChild(el("dt", "", label));
        var dd = el("dd");
        if (text === null) dd.textContent = t("none");
        else rich(dd, text);
        dl.appendChild(dd);
      };
      pair(t("yours"), row.pick >= 0 ? row.q.options[row.pick] : null);
      if (!row.ok) pair(t("correct"), row.q.options[row.q.answer]);
      pair(t("why"), src.why);
      li.appendChild(dl);
      var foot = el("p", "test__src");
      if (!row.ok) {
        var a = el("a", "", t("back") + " → ");
        a.href = core.stepHref(lang, src);
        a.appendChild(el("span", "", src.lessonTitle));
        foot.appendChild(a);
      } else foot.textContent = src.lessonTitle;
      li.appendChild(foot);
      list.appendChild(li);
    });
    root.appendChild(list);
    title.focus({ preventScroll: false });
  };

  fetch("/" + lang + "/test/" + section + ".json")
    .then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    })
    .then(function (bank) {
      questions = core.build(bank, seed);
      if (!questions.length) {
        root.textContent = "";
        root.appendChild(el("p", "review__empty", t("empty")));
        return;
      }
      show(false);
    })
    .catch(function () {
      root.textContent = t("fail");
    });
})();
