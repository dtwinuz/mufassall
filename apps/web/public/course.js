// Course sidebar: open on wide screens, mark lessons the reader has finished or started.
(function () {
  var box = document.querySelector("[data-course-nav]");
  if (box && window.matchMedia("(min-width: 1280px)").matches) box.setAttribute("open", "");
  var progress = {};
  try {
    progress = JSON.parse(localStorage.getItem("mufassall:v1:progress") || "{}");
  } catch (e) {}
  document.querySelectorAll("[data-progress-dot]").forEach(function (a) {
    var reached = progress[a.getAttribute("data-progress-dot")];
    if (typeof reached !== "number") return;
    var total = Number(a.getAttribute("data-steps"));
    a.classList.add(reached >= total - 1 ? "is-done" : "is-started");
  });
})();
