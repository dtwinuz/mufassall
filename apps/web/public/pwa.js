// Registers the offline service worker and wires the "save the course offline" button.
(function () {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(function () {});

  var btn = document.querySelector("[data-offline]");
  if (!btn) return;
  btn.hidden = false;
  var status = document.querySelector("[data-offline-status]");
  var say = function (t) {
    if (status) status.textContent = t;
  };

  // unhashed files at the site root every page or the review page loads
  // (a missing one only lowers the "saved" count; scripts named in the fetched pages are added too)
  var ROOT = [
    "/theme.js",
    "/search.js",
    "/progress.js",
    "/pwa.js",
    "/review.js",
    "/fsrs.js",
    "/test.js",
    "/test-core.js",
    "/me.js",
    "/me-core.js",
    "/lang.js",
    "/activity.js",
    "/compare.js",
    "/estimate.js",
    "/gallery.js",
    "/share.js",
    "/sheet.js",
    "/favicon.svg",
    "/manifest.webmanifest",
  ];

  // assets the pages need: root scripts they load, /_astro/ scripts and styles, and whatever
  // those import in turn (JS chunks "./x.js", fonts in CSS)
  function assetsOf(html) {
    var found = {};
    ROOT.forEach(function (u) {
      found[u] = 1;
    });
    (html.match(/src="\/[\w.\-]+\.js"/g) || []).forEach(function (m) {
      found[m.slice(5, -1)] = 1;
    });
    var walk = function (text, inAstro) {
      var next = [];
      var add = function (u) {
        if (found[u]) return;
        found[u] = 1;
        if (/\.(?:js|css)$/.test(u)) next.push(u);
      };
      (text.match(/\/_astro\/[\w.\-]+/g) || []).forEach(add);
      if (inAstro)
        (text.match(/["'(]\.\/[\w.\-]+\.(?:js|css|woff2?)/g) || []).forEach(function (m) {
          add("/_astro/" + m.slice(3));
        });
      return Promise.all(
        next.map(function (u) {
          return fetch(u)
            .then(function (r) {
              return r.text();
            })
            .then(function (t) {
              return walk(t, true);
            })
            .catch(function () {});
        }),
      );
    };
    return walk(html, false).then(function () {
      return Object.keys(found);
    });
  }

  btn.addEventListener("click", function () {
    var lang = document.documentElement.lang || "uz";
    var pages = Array.prototype.map.call(document.querySelectorAll("a.lesson-card"), function (a) {
      return a.getAttribute("href");
    });
    pages.push("/" + lang + "/", "/" + lang + "/lab/", "/" + lang + "/search.json", "/" + lang + "/glossary/", "/" + lang + "/review/", "/" + lang + "/test/", "/" + lang + "/me/", "/" + lang + "/review.json", "/fsrs.js", "/review.js", "/" + lang + "/tools/", "/" + lang + "/tools/estimate/", "/" + lang + "/compare/", "/" + lang + "/paths/", "/activity.js", "/estimate.js", "/compare.js", "/share.js", "/sheet.js");
    btn.disabled = true;
    say(btn.getAttribute("data-busy"));
    Promise.all([fetch(pages[0]), fetch("/" + lang + "/lab/")])
      .then(function (rs) {
        return Promise.all(
          rs.map(function (r) {
            return r.text();
          }),
        );
      })
      .then(function (htmls) {
        return assetsOf(htmls.join("\n"));
      })
      .then(function (assets) {
        return navigator.serviceWorker.ready.then(function (reg) {
          navigator.serviceWorker.addEventListener("message", function onMsg(e) {
            if (!e.data || e.data.type !== "cached") return;
            navigator.serviceWorker.removeEventListener("message", onMsg);
            btn.disabled = false;
            say(btn.getAttribute("data-done").replace("{n}", String(e.data.ok)));
          });
          reg.active.postMessage({ type: "cache-urls", urls: pages.concat(assets) });
        });
      })
      .catch(function () {
        btn.disabled = false;
        say(btn.getAttribute("data-fail"));
      });
  });
})();
