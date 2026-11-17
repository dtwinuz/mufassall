// Compare page (/<lang>/compare/?a=<slug>&b=<slug>): a column is rebuilt from the parts of that
// lesson's cheat sheet page (same origin, our own markup), so no extra data file is needed.
(function () {
  var root = document.querySelector("[data-compare]");
  var form = document.querySelector("[data-compare-form]");
  if (!root || !form) return;
  var lang = document.documentElement.lang || "en";
  var t = function (k) {
    return root.getAttribute("data-" + k) || "";
  };
  var select = function (key) {
    return form.elements.namedItem(key);
  };
  var valid = function (slug) {
    return !!slug && !!select("a").querySelector('option[value="' + slug.replace(/[^\w-]/g, "") + '"]');
  };
  var col = function (key) {
    return root.querySelector('[data-col="' + key + '"]');
  };
  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  var cache = {};
  var sheetOf = function (slug) {
    if (!cache[slug]) {
      cache[slug] = fetch("/" + lang + "/l/" + slug + "/sheet/")
        .then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          return r.text();
        })
        .then(function (html) {
          return new DOMParser().parseFromString(html, "text/html");
        });
      cache[slug].catch(function () {
        delete cache[slug];
      });
    }
    return cache[slug];
  };

  var build = function (box, doc, slug) {
    var part = function (name) {
      return doc.querySelector('[data-part="' + name + '"]');
    };
    var take = function (node) {
      return document.importNode(node, true);
    };
    box.textContent = "";
    var h = el("h2");
    var a = el("a", "", (part("title") || {}).textContent || slug);
    a.href = "/" + lang + "/l/" + slug + "/";
    h.appendChild(a);
    box.appendChild(h);
    var sum = part("summary");
    var p = sum && sum.querySelector("p");
    if (p) box.appendChild(el("p", "cmp__summary", p.textContent));
    var scene = part("scene");
    var stage = scene && scene.querySelector(".sheet__stage");
    if (stage) {
      var wrap = el("div", "cmp__stage");
      wrap.setAttribute("aria-label", t("scene"));
      wrap.appendChild(take(stage));
      box.appendChild(wrap);
    }
    var learn = part("learn");
    var ul = learn && learn.querySelector("ul");
    if (ul) {
      box.appendChild(el("h3", "", t("learn")));
      box.appendChild(take(ul));
    }
    var recap = part("recap");
    if (recap) {
      box.appendChild(el("h3", "", t("recap")));
      var r = el("div", "cmp__recap");
      recap.querySelectorAll("p").forEach(function (n) {
        r.appendChild(take(n));
      });
      box.appendChild(r);
    }
    var link = el("a", "cmp__sheet", t("sheet-label") + " →");
    link.href = "/" + lang + "/l/" + slug + "/sheet/";
    box.appendChild(link);
  };

  var load = function (key, slug) {
    var box = col(key);
    if (!box || box.getAttribute("data-slug") === slug) return;
    box.setAttribute("data-slug", slug);
    box.setAttribute("aria-busy", "true");
    box.style.minHeight = box.offsetHeight + "px"; // keep the height while loading: no jump
    sheetOf(slug)
      .then(function (doc) {
        if (box.getAttribute("data-slug") !== slug) return;
        build(box, doc, slug);
      })
      .catch(function () {
        if (box.getAttribute("data-slug") !== slug) return;
        box.textContent = "";
        box.appendChild(el("p", "cmp__fail", t("fail")));
        box.removeAttribute("data-slug");
      })
      .then(function () {
        box.removeAttribute("aria-busy");
        box.style.minHeight = "";
      });
  };

  var sync = function () {
    var a = select("a").value;
    var b = select("b").value;
    try {
      history.replaceState(history.state, "", location.pathname + "?a=" + encodeURIComponent(a) + "&b=" + encodeURIComponent(b));
    } catch (e) {}
    load("a", a);
    load("b", b);
  };

  var q = new URLSearchParams(location.search);
  if (valid(q.get("a"))) select("a").value = q.get("a");
  if (valid(q.get("b"))) select("b").value = q.get("b");
  else if (valid(q.get("a")) && q.get("a") === select("b").value) {
    // ?a= alone (from a lesson page) that equals the default b: pick the default a instead
    select("b").value = col("a").getAttribute("data-slug");
  }
  if (q.has("a") || q.has("b")) sync();

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    sync();
  });
  form.addEventListener("change", sync);
  var swap = form.querySelector("[data-compare-swap]");
  swap.hidden = false;
  swap.addEventListener("click", function () {
    var a = select("a").value;
    select("a").value = select("b").value;
    select("b").value = a;
    sync();
  });
  document.querySelectorAll("[data-pair]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      var ab = link.getAttribute("data-pair").split(" ");
      if (!valid(ab[0]) || !valid(ab[1])) return;
      e.preventDefault();
      select("a").value = ab[0];
      select("b").value = ab[1];
      sync();
      form.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
  });
})();
