// Reading progress (stored by the lesson player) shown on the home cards, the course outline,
// the learning paths and the share buttons of finished sections.
(function () {
  var progress = {};
  try {
    progress = JSON.parse(localStorage.getItem("mufassall:v1:progress") || "{}") || {};
  } catch (e) {}
  // a lesson is done when its last step was reached
  var reachedOf = function (el, attr) {
    var r = progress[el.getAttribute(attr)];
    return typeof r === "number" ? { done: r >= Number(el.getAttribute("data-steps")) - 1, reached: r } : null;
  };
  var mark = function (a, p, box) {
    a.classList.add(p.done ? "is-done" : "is-started");
    var note = document.createElement("span");
    note.className = "sr-only";
    note.textContent = " (" + box.getAttribute(p.done ? "data-label-done" : "data-label-started") + ")";
    a.appendChild(note);
  };

  // home: Start / Continue / Done
  document.querySelectorAll("[data-progress]").forEach(function (card) {
    var p = reachedOf(card, "data-progress");
    var cta = card.querySelector(".lesson-card__cta");
    if (!p || !cta) return;
    cta.textContent = (p.done ? cta.getAttribute("data-label-done") : cta.getAttribute("data-label-continue")) + (p.done ? " ✓" : " →");
    if (!p.done) card.setAttribute("href", card.getAttribute("href") + "?step=" + (p.reached + 1));
  });

  // home: a section whose lessons are all done gets its share button; all sections done = certificate
  var tracks = document.querySelectorAll(".track[id^='s-']");
  var allDone = tracks.length > 0;
  tracks.forEach(function (sec) {
    var cards = sec.querySelectorAll("[data-progress]");
    var done =
      cards.length > 0 &&
      Array.prototype.every.call(cards, function (c) {
        var p = reachedOf(c, "data-progress");
        return !!(p && p.done);
      });
    if (!done) allDone = false;
    sec.querySelectorAll("[data-share]").forEach(function (b) {
      b.hidden = !done;
    });
  });
  document.querySelectorAll("[data-share-course]").forEach(function (box) {
    box.hidden = !allDone;
  });

  // lesson page: course outline, open on wide screens; dots carry a text label for screen readers
  var box = document.querySelector("[data-course-nav]");
  if (box) {
    if (window.matchMedia("(min-width: 1280px)").matches) box.setAttribute("open", "");
    box.querySelectorAll("[data-progress-dot]").forEach(function (a) {
      var p = reachedOf(a, "data-progress-dot");
      if (p) mark(a, p, box);
    });
  }

  // learning paths: bar, count and the next unfinished lesson
  var paths = document.querySelector("[data-paths]");
  if (paths) {
    var attr = function (k) {
      return paths.getAttribute("data-" + k) || "";
    };
    paths.querySelectorAll("[data-path]").forEach(function (path) {
      var links = path.querySelectorAll("[data-path-lesson]");
      var done = 0;
      var next = null;
      links.forEach(function (a) {
        var p = reachedOf(a, "data-path-lesson");
        if (p) mark(a, p, paths);
        if (p && p.done) done++;
        else if (!next) next = { a: a, p: p };
      });
      var bar = path.querySelector("progress");
      if (bar) bar.value = done;
      var count = path.querySelector("[data-path-count]");
      if (count) count.textContent = attr("progress-label").replace("{done}", String(done)).replace("{total}", String(links.length));
      var go = path.querySelector("[data-path-go]");
      if (!go || !links.length) return;
      if (!next) {
        go.textContent = attr("done") + " ✓";
        go.classList.remove("mf-btn--primary");
        go.setAttribute("href", links[0].getAttribute("href"));
        return;
      }
      go.textContent = (done > 0 || next.p ? attr("continue") : attr("start")) + " →";
      go.setAttribute("href", next.a.getAttribute("href") + (next.p ? "?step=" + (next.p.reached + 1) : ""));
    });
  }
})();
