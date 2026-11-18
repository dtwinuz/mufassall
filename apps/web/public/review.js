// Spaced review of the lessons' prediction checks, on /<lang>/review/, scheduled by FSRS (/fsrs.js).
// Cards come from /<lang>/review.json; state lives only in this browser:
//   mufassall:v1:checks   first answer in a lesson, id -> right? (written by the lesson player)
//   mufassall:v2:review   id -> { s: stability days, d: difficulty 1..10, due: ms, last: ms, reps, lapses, st }
//   mufassall:v1:review   the old Leitner boxes { b, d }: read once to fill v2, never written or deleted
//   mufassall:v1:progress lesson -> furthest step reached (written by the lesson player)
//   mufassall:v1:review:known  ids present in review.json, so the nav badge (search.js) skips removed cards
//   mufassall:v1:keys     "off" = the reader switched single-key shortcuts off (WCAG 2.1.4)
(function () {
  var root = document.querySelector("[data-review]");
  if (!root) return;
  var F = window.MufassallFSRS;
  var DAY = 864e5;
  var KEY = "mufassall:v2:review";
  var AGAIN = 1;
  var HARD = 2;
  var GOOD = 3;
  var EASY = 4;
  var t = function (k) {
    return root.getAttribute("data-" + k) || "";
  };
  if (!F) {
    root.textContent = t("fail");
    return;
  }
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
  var stored = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch (e) {}
  // first visit after the switch to FSRS: Leitner boxes become stabilities, due dates stay
  var state = stored === null ? F.migrate(read("mufassall:v1:review"), Date.now()) : read(KEY);
  var save = function () {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  };

  // answers given in lessons become cards: a hit is scheduled as Good, a miss is due now
  var checks = read("mufassall:v1:checks");
  Object.keys(checks).forEach(function (id) {
    if (state[id]) return;
    var now = Date.now();
    state[id] = F.next(F.newCard(), checks[id] === true ? GOOD : AGAIN, now, id);
    if (checks[id] !== true) state[id].due = now;
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
  var seen = {}; // ids answered in this session
  var reviewed = 0;
  var firstRight = 0;

  var stats = function () {
    var ids = Object.keys(state).filter(function (id) {
      return cards[id];
    });
    var at = Date.now();
    var next = ids
      .map(function (id) {
        return state[id].due;
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
        return state[id].due <= at;
      }),
      // a week of stability: about the old box 3
      learned: ids.filter(function (id) {
        return state[id].st === 2 && state[id].s >= 7;
      }).length,
      next: next,
      recall: recall(ids, at),
    };
  };

  // FSRS's estimate of the share of started cards the reader would get right now, in %
  var recall = function (ids, at) {
    var rs = ids
      .filter(function (id) {
        return state[id].st && state[id].s > 0 && state[id].last;
      })
      .map(function (id) {
        return F.retrievability((at - state[id].last) / DAY, state[id].s);
      });
    if (!rs.length) return null;
    var sum = rs.reduce(function (a, b) {
      return a + b;
    }, 0);
    return Math.round((100 * sum) / rs.length);
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
    if (reviewed) box.appendChild(el("p", "review__meta", fill(t("session"), { n: reviewed, right: firstRight })));
    if (s.total) box.appendChild(el("p", "review__meta", fill(t("stats"), { total: s.total, learned: s.learned })));
    if (s.recall !== null) box.appendChild(el("p", "review__meta", fill(t("recall"), { r: s.recall })));
    if (s.next) box.appendChild(el("p", "review__meta", fill(t("next"), { date: day(s.next) })));
    var extra = fresh();
    if (extra.length) {
      var b = el("button", "mf-btn mf-btn--primary", fill(t("add"), { n: Math.min(10, extra.length) }));
      b.type = "button";
      b.addEventListener("click", function () {
        extra.slice(0, 10).forEach(function (id) {
          state[id] = F.newCard();
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
    // a right pick counts as Good; "I guessed" (Hard) or "Easy" re-scores it from the same snapshot
    var before = state[id] || F.newCard();
    var at = 0;
    var rate = function (g) {
      state[id] = F.next(before, g, at, id);
      save();
    };
    var pick = function (i) {
      if (answered) return;
      answered = true;
      var right = i === c[5];
      at = Date.now();
      rate(right ? GOOD : AGAIN);
      if (!seen[id]) {
        seen[id] = 1;
        reviewed++;
        if (right) firstRight++;
      }
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
      if (right)
        [
          [HARD, "hard"],
          [EASY, "easy"],
        ].forEach(function (r) {
          var b = el("button", "mf-btn", t(r[1]));
          b.type = "button";
          b.addEventListener("click", function () {
            rate(r[0]);
            advance();
          });
          row.appendChild(b);
        });
      var open = el("a", "mf-btn", t("open"));
      open.href = c[2];
      row.appendChild(open);
      status.appendChild(row);
      next.focus();
      queue.shift();
      if (right) done++;
      else queue.push(id); // a miss is a learning step: it comes back in this session
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
      return state[a].due - state[b].due;
    });
    done = 0;
    seen = {};
    reviewed = 0;
    firstRight = 0;
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
