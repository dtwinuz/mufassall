// Spaced review of the lessons' prediction checks (Leitner boxes), on /<lang>/review/.
// Cards come from /<lang>/review.json; state lives only in this browser:
//   mufassall:v1:checks   first answer in a lesson, id -> right? (written by the lesson player)
//   mufassall:v1:review   id -> { b: box 0..5, d: due time in ms }
//   mufassall:v1:progress lesson -> furthest step reached (written by the lesson player)
//   mufassall:v1:review:known  ids present in review.json, so the nav badge (search.js) skips removed cards
//   mufassall:v1:keys     "off" = the reader switched single-key shortcuts off (WCAG 2.1.4)
(function () {
  var root = document.querySelector("[data-review]");
  if (!root) return;
  var DAY = 864e5;
  var GAP = [0, 1, 3, 7, 16, 35]; // days until a card in box n comes back
  var KEY = "mufassall:v1:review";
  var t = function (k) {
    return root.getAttribute("data-" + k) || "";
  };
  var read = function (k) {
    try {
      var v = JSON.parse(localStorage.getItem(k) || "{}");
      return v && typeof v === "object" ? v : {};
    } catch (e) {
      return {};
    }
  };
  var keysOn = function () {
    try {
      return localStorage.getItem("mufassall:v1:keys") !== "off";
    } catch (e) {
      return true;
    }
  };
  var state = read(KEY);
  var save = function () {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  };

  // answers given in lessons become cards: a miss is due now, a hit tomorrow
  var checks = read("mufassall:v1:checks");
  Object.keys(checks).forEach(function (id) {
    if (state[id]) return;
    state[id] = checks[id] === true ? { b: 1, d: Date.now() + DAY } : { b: 0, d: 0 };
  });
  save();

  // **bold** and `code`, built as nodes
  var rich = function (el, text) {
    el.textContent = "";
    String(text)
      .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
      .forEach(function (part) {
        if (!part) return;
        var tag = /^\*\*.*\*\*$/.test(part) ? "strong" : /^`.*`$/.test(part) ? "code" : null;
        if (!tag) return el.appendChild(document.createTextNode(part));
        var n = document.createElement(tag);
        n.textContent = tag === "strong" ? part.slice(2, -2) : part.slice(1, -1);
        el.appendChild(n);
      });
  };
  var fill = function (s, v) {
    return s.replace(/\{(\w+)\}/g, function (_, k) {
      return v[k] === undefined ? "" : v[k];
    });
  };
  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  var lang = document.documentElement.lang || "en";
  var day = function (ms) {
    var d = new Date(ms);
    return d.getDate() + "." + String(d.getMonth() + 1).padStart(2, "0");
  };

  var cards = {};
  var queue = [];
  var done = 0;

  var stats = function () {
    var ids = Object.keys(state).filter(function (id) {
      return cards[id];
    });
    var at = Date.now();
    var next = ids
      .map(function (id) {
        return state[id].d;
      })
      .filter(function (d) {
        return d > at;
      })
      .sort(function (a, b) {
        return a - b;
      })[0];
    return {
      total: ids.length,
      due: ids.filter(function (id) {
        return state[id].d <= at;
      }),
      learned: ids.filter(function (id) {
        return state[id].b >= 3;
      }).length,
      next: next,
    };
  };

  // checks the reader passed in a lesson without answering
  var fresh = function () {
    var progress = read("mufassall:v1:progress");
    return Object.keys(cards).filter(function (id) {
      if (state[id]) return false;
      var slug = id.split("/")[0];
      var step = Number((cards[id][2].match(/step=(\d+)/) || [])[1]) - 1;
      return typeof progress[slug] === "number" && progress[slug] >= step;
    });
  };

  var summary = function (focus) {
    var s = stats();
    root.textContent = "";
    var box = el("div", "review__empty");
    var title = el("h2", "review__summary-title", done > 0 ? t("done") : s.total ? t("none-due") : t("empty"));
    title.tabIndex = -1;
    box.appendChild(title);
    if (s.total) box.appendChild(el("p", "review__meta", fill(t("stats"), { total: s.total, learned: s.learned })));
    if (s.next) box.appendChild(el("p", "review__meta", fill(t("next"), { date: day(s.next) })));
    var extra = fresh();
    if (extra.length) {
      var b = el("button", "mf-btn mf-btn--primary", fill(t("add"), { n: Math.min(10, extra.length) }));
      b.type = "button";
      b.addEventListener("click", function () {
        extra.slice(0, 10).forEach(function (id) {
          state[id] = { b: 0, d: 0 };
        });
        save();
        start(true);
      });
      box.appendChild(b);
    } else if (!s.total) {
      var a = el("a", "mf-btn mf-btn--primary", t("go"));
      a.href = "/" + lang + "/";
      box.appendChild(a);
    }
    root.appendChild(box);
    if (focus) title.focus({ preventScroll: true });
    badge();
  };

  // focus: true after an answer, so keyboard and screen reader users land on the new card
  // instead of <body> (the button they pressed is gone); false on first render
  var show = function (focus) {
    if (!queue.length) return summary(focus);
    var id = queue[0];
    var c = cards[id];
    var answered = false;
    root.textContent = "";
    var head = el("div", "review__head");
    head.appendChild(el("span", "review__count", fill(t("left"), { n: queue.length })));
    var src = el("a", "review__lesson", c[1]);
    src.href = c[2];
    head.appendChild(src);
    root.appendChild(head);
    var card = el("fieldset", "mf-check review__card");
    var keys = el("p", "mf-keys", t("keys"));
    keys.hidden = !keysOn();
    var q = el("legend", "mf-check__q");
    q.tabIndex = -1;
    rich(q, c[3]);
    card.appendChild(q);
    var list = el("ol", "mf-check__options");
    var status = el("div", "mf-check__result");
    status.setAttribute("role", "status");

    var advance = function () {
      document.removeEventListener("keydown", onKey);
      show(true);
    };
    var pick = function (i) {
      if (answered) return;
      answered = true;
      var right = i === c[5];
      var s = state[id] || { b: 0, d: 0 };
      s.b = right ? Math.min(5, s.b + 1) : 0;
      s.d = Date.now() + GAP[s.b] * DAY;
      state[id] = s;
      save();
      if (window.mufassallActivity) window.mufassallActivity.card(); // streak and daily goal (/activity.js)
      list.querySelectorAll("button").forEach(function (b, j) {
        b.disabled = true;
        b.classList.add(j === c[5] ? "mf-check__opt--right" : j === i ? "mf-check__opt--wrong" : "mf-check__opt--dim");
        if (j === c[5] || j === i) b.appendChild(el("span", "mf-check__mark", j === c[5] ? "✓" : "✗"));
      });
      keys.hidden = true;
      var why = el("p");
      rich(why, c[6]);
      why.insertBefore(document.createTextNode(" "), why.firstChild);
      why.insertBefore(el("strong", "", right ? t("right") : t("wrong")), why.firstChild);
      status.appendChild(why);
      var row = el("div", "review__actions");
      var next = el("button", "mf-btn mf-btn--primary", t("continue"));
      next.type = "button";
      next.addEventListener("click", advance);
      row.appendChild(next);
      var open = el("a", "mf-btn", t("open"));
      open.href = c[2];
      row.appendChild(open);
      status.appendChild(row);
      next.focus();
      queue.shift();
      if (right) done++;
      else queue.push(id); // a miss comes back once more in this session
    };
    var onKey = function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || !keysOn()) return;
      var tg = e.target;
      if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) return;
      var n = Number(e.key);
      if (!answered && n >= 1 && n <= c[4].length) {
        e.preventDefault();
        pick(n - 1);
      }
    };
    document.addEventListener("keydown", onKey);

    c[4].forEach(function (o, i) {
      var li = el("li");
      var b = el("button", "mf-check__opt");
      b.type = "button";
      var k = el("kbd", "", String(i + 1));
      k.setAttribute("aria-hidden", "true");
      b.appendChild(k);
      var label = el("span");
      rich(label, o);
      b.appendChild(label);
      b.addEventListener("click", function () {
        pick(i);
      });
      li.appendChild(b);
      list.appendChild(li);
    });
    card.appendChild(list);
    card.appendChild(status);
    root.appendChild(card);
    root.appendChild(keys);
    if (focus) q.focus({ preventScroll: true });
  };

  var start = function (focus) {
    queue = stats().due.sort(function (a, b) {
      return state[a].d - state[b].d;
    });
    done = 0;
    show(focus);
  };

  // due count next to the nav link
  var badge = function () {
    var n = stats().due.length;
    document.querySelectorAll("[data-review-badge]").forEach(function (b) {
      b.textContent = n ? String(n) : "";
    });
  };

  fetch("/" + lang + "/review.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (rows) {
      rows.forEach(function (r) {
        cards[r[0]] = r;
      });
      try {
        localStorage.setItem("mufassall:v1:review:known", JSON.stringify(Object.keys(cards)));
      } catch (e) {}
      start();
    })
    .catch(function () {
      root.textContent = t("fail");
    });
})();
