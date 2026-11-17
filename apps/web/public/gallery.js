// Lab gallery on /<lang>/gallery/: approved diagrams from GET /api/gallery?lang=<lang>.
// Everything from the API is put on the page as text; links are accepted only as /<lang>/lab/#d=… paths.
(function () {
  var root = document.querySelector("[data-gallery]");
  if (!root) return;
  var t = function (k) {
    return root.getAttribute("data-" + k) || "";
  };
  var lang = t("lang");
  var LINK = new RegExp("^/" + lang + "/lab/#d=[A-Za-z0-9_-]+={0,2}$");
  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  var date = function (iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    try {
      return d.toLocaleDateString(t("locale") || undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch (e) {
      return iso.slice(0, 10);
    }
  };
  var done = function (node) {
    root.textContent = "";
    root.appendChild(node);
    root.setAttribute("aria-busy", "false");
  };

  var state = function (title, lead, action) {
    var box = el("div", "gallery__state");
    box.appendChild(el("h2", "", title));
    if (lead) box.appendChild(el("p", "", lead));
    if (action) box.appendChild(action);
    return box;
  };

  var render = function (items) {
    items = Array.isArray(items)
      ? items.filter(function (i) {
          return i && typeof i.title === "string" && typeof i.link === "string" && LINK.test(i.link);
        })
      : [];
    if (!items.length) {
      var go = el("a", "mf-btn mf-btn--primary", t("to-lab"));
      go.href = "/" + lang + "/lab/";
      return done(state(t("empty"), t("empty-lead"), go));
    }
    var list = el("ul", "gallery__grid");
    items.forEach(function (i) {
      var card = el("li", "gallery__card");
      card.appendChild(el("h2", "", i.title));
      var meta = [];
      if (typeof i.author === "string" && i.author) meta.push(t("by").replace("{author}", i.author));
      var when = typeof i.created === "string" ? date(i.created) : "";
      if (when) meta.push(when);
      if (meta.length) card.appendChild(el("p", "gallery__meta", meta.join(" · ")));
      var open = el("a", "mf-btn mf-btn--primary", t("open"));
      open.href = i.link;
      card.appendChild(open);
      list.appendChild(card);
    });
    done(list);
  };

  var fail = function () {
    var retry = el("button", "mf-btn", t("retry"));
    retry.type = "button";
    retry.addEventListener("click", load);
    done(state(t("fail"), "", retry));
  };

  function load() {
    root.setAttribute("aria-busy", "true");
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, 10000);
    fetch("/api/gallery?lang=" + encodeURIComponent(lang), {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(render)
      .catch(fail)
      .then(function () {
        clearTimeout(timer);
      });
  }
  load();
})();
