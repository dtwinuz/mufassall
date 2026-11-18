// Course search: Ctrl/Cmd+K or "/" opens it. The index (/<lang>/search.json) loads on first open.
(function () {
  var dialog = document.querySelector("[data-search]");
  if (!dialog) return;
  var input = dialog.querySelector("input");
  var list = dialog.querySelector("[role=listbox]");
  var lang = document.documentElement.lang || "uz";
  var rows = null;
  var loading = null;
  var active = 0;
  var hits = [];

  // fold case, diacritics and the many Uzbek apostrophes so "o'zbek", "oʻzbek" and "ozbek" all match
  function fold(s) {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[ʻʼ‘’'`]/g, "")
      .replace(/ё/g, "е");
  }

  function load() {
    if (!loading)
      loading = fetch("/" + lang + "/search.json")
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          rows = data.map(function (r) {
            return { title: r[0], href: r[1], ctx: r[2], kind: r[3], ft: fold(r[0]), fx: fold(r[4]) };
          });
        })
        .catch(function () {
          loading = null;
        });
    return loading;
  }

  function search(q) {
    var words = fold(q).split(/\s+/).filter(Boolean);
    if (!rows || !words.length) return [];
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var score = 0;
      for (var j = 0; j < words.length; j++) {
        var w = words[j];
        var t = r.ft.indexOf(w);
        if (t === 0) score += 6;
        else if (t > 0) score += 4;
        else if (r.fx.indexOf(w) >= 0) score += 1;
        else {
          score = 0;
          break;
        }
      }
      if (score) out.push({ r: r, s: score + (r.kind === 1 ? 0 : 2) });
    }
    out.sort(function (a, b) {
      return b.s - a.s;
    });
    return out.slice(0, 24).map(function (x) {
      return x.r;
    });
  }

  function render() {
    list.textContent = "";
    if (!hits.length) {
      var li = document.createElement("li");
      li.className = "search__empty";
      li.textContent = input.value.trim() ? dialog.getAttribute("data-empty") : dialog.getAttribute("data-hint");
      list.appendChild(li);
      input.removeAttribute("aria-activedescendant");
      return;
    }
    hits.forEach(function (r, i) {
      var li = document.createElement("li");
      li.id = "search-opt-" + i;
      li.setAttribute("role", "option");
      var a = document.createElement("a");
      a.href = r.href;
      a.tabIndex = -1;
      var kind = document.createElement("span");
      kind.className = "search__kind search__kind--" + r.kind;
      kind.textContent = dialog.getAttribute(r.kind === 0 ? "data-lesson" : r.kind === 2 ? "data-term" : "data-step");
      var title = document.createElement("span");
      title.className = "search__title";
      title.textContent = r.title;
      var ctx = document.createElement("span");
      ctx.className = "search__ctx";
      ctx.textContent = r.ctx;
      a.appendChild(kind);
      a.appendChild(title);
      a.appendChild(ctx);
      li.appendChild(a);
      li.addEventListener("mousemove", function () {
        if (active !== i) {
          active = i;
          mark();
        }
      });
      list.appendChild(li);
    });
    mark();
  }

  function mark() {
    var opts = list.querySelectorAll("[role=option]");
    for (var i = 0; i < opts.length; i++) opts[i].setAttribute("aria-selected", i === active ? "true" : "false");
    if (opts[active]) {
      input.setAttribute("aria-activedescendant", opts[active].id);
      opts[active].scrollIntoView({ block: "nearest" });
    }
  }

  function update() {
    active = 0;
    hits = search(input.value);
    render();
  }

  function open() {
    if (dialog.open) return;
    dialog.showModal();
    input.select();
    load().then(update);
    update();
  }

  input.addEventListener("input", function () {
    if (rows) update();
    else load().then(update);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!hits.length) return;
      active = (active + (e.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length;
      mark();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hits[active]) go(hits[active].href);
    }
  });
  // a result on the same page (glossary term, another step) only changes the hash:
  // nothing unloads, so the dialog must be closed by hand
  function go(href) {
    if (dialog.open) dialog.close();
    window.location.href = href;
  }
  list.addEventListener("click", function (e) {
    var a = e.target instanceof Element ? e.target.closest("a") : null;
    if (a && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0 && dialog.open) dialog.close();
  });
  window.addEventListener("hashchange", function () {
    if (dialog.open) dialog.close();
  });
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) dialog.close();
  });
  document.querySelectorAll("[data-search-open]").forEach(function (b) {
    b.addEventListener("click", open);
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    var typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      open();
    } else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      open();
    }
  });
})();

// due review cards next to the "Review" link (state written by /review.js)
(function () {
  try {
    var st = JSON.parse(localStorage.getItem("mufassall:v2:review") || "null");
    var dueOf = function (c) {
      return c.due;
    };
    if (!st) {
      st = JSON.parse(localStorage.getItem("mufassall:v1:review") || "{}");
      dueOf = function (c) {
        return c.d;
      };
    }
    // ids still in review.json (review.js writes the list): a card dropped from the course is not due
    var known = JSON.parse(localStorage.getItem("mufassall:v1:review:known") || "null");
    var live = Array.isArray(known)
      ? known.reduce(function (m, id) {
          m[id] = 1;
          return m;
        }, {})
      : null;
    var now = Date.now();
    var n = Object.keys(st).filter(function (k) {
      return st[k] && dueOf(st[k]) <= now && (!live || live[k]);
    }).length;
    if (!n) return;
    document.querySelectorAll("[data-review-badge]").forEach(function (b) {
      b.textContent = String(n);
    });
  } catch (e) {}
})();
