// Reading progress (stored by the lesson player) shown on the home cards and the course outline.
(function () {
  var progress = {};
  try {
    progress = JSON.parse(localStorage.getItem("mufassall:v1:progress") || "{}");
  } catch (e) {}
  var reachedOf = function (el, attr) {
    var r = progress[el.getAttribute(attr)];
    return typeof r === "number" ? { done: r >= Number(el.getAttribute("data-steps")) - 1, reached: r } : null;
  };

  // home: Start / Continue / Done
  document.querySelectorAll("[data-progress]").forEach(function (card) {
    var p = reachedOf(card, "data-progress");
    var cta = card.querySelector(".lesson-card__cta");
    if (!p || !cta) return;
    cta.textContent = (p.done ? cta.getAttribute("data-label-done") : cta.getAttribute("data-label-continue")) + (p.done ? " ✓" : " →");
    if (!p.done) card.setAttribute("href", card.getAttribute("href") + "?step=" + (p.reached + 1));
  });

  // lesson page: course outline, open on wide screens; dots carry a text label for screen readers
  var box = document.querySelector("[data-course-nav]");
  if (!box) return;
  if (window.matchMedia("(min-width: 1280px)").matches) box.setAttribute("open", "");
  box.querySelectorAll("[data-progress-dot]").forEach(function (a) {
    var p = reachedOf(a, "data-progress-dot");
    if (!p) return;
    a.classList.add(p.done ? "is-done" : "is-started");
    var note = document.createElement("span");
    note.className = "sr-only";
    note.textContent = " (" + box.getAttribute(p.done ? "data-label-done" : "data-label-started") + ")";
    a.appendChild(note);
  });
})();
