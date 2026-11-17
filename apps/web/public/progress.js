// Lesson cards: show Start / Continue / Done from the progress the player stores.
(function () {
  var progress = {};
  try {
    progress = JSON.parse(localStorage.getItem("mufassall:v1:progress") || "{}");
  } catch (e) {}
  document.querySelectorAll("[data-progress]").forEach(function (card) {
    var reached = progress[card.getAttribute("data-progress")];
    if (typeof reached !== "number") return;
    var total = Number(card.getAttribute("data-steps"));
    var cta = card.querySelector(".lesson-card__cta");
    if (!cta) return;
    var done = reached >= total - 1;
    cta.textContent = (done ? cta.getAttribute("data-label-done") : cta.getAttribute("data-label-continue")) + (done ? " ✓" : " →");
    if (!done) card.setAttribute("href", card.getAttribute("href") + "?step=" + (reached + 1));
  });
})();
