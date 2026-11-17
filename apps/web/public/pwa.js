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

  // assets the lesson pages need: scripts, styles and the fonts those styles point to
  function assetsOf(html) {
    var found = {};
    (html.match(/\/_astro\/[\w.\-]+/g) || []).forEach(function (u) {
      found[u] = 1;
    });
    var css = Object.keys(found).filter(function (u) {
      return /\.css$/.test(u);
    });
    return Promise.all(
      css.map(function (u) {
        return fetch(u)
          .then(function (r) {
            return r.text();
          })
          .then(function (t) {
            (t.match(/\/_astro\/[\w.\-]+\.woff2/g) || []).forEach(function (f) {
              found[f] = 1;
            });
          })
          .catch(function () {});
      }),
    ).then(function () {
      return Object.keys(found);
    });
  }

  btn.addEventListener("click", function () {
    var lang = document.documentElement.lang || "uz";
    var pages = Array.prototype.map.call(document.querySelectorAll("a.lesson-card"), function (a) {
      return a.getAttribute("href");
    });
    pages.push("/" + lang + "/", "/" + lang + "/lab/", "/" + lang + "/search.json", "/" + lang + "/glossary/", "/" + lang + "/review/", "/" + lang + "/review.json", "/review.js");
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
