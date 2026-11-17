// Theme: an explicit choice is remembered per browser; otherwise the system setting wins.
(function () {
  var KEY = "mufassall:theme";
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  } catch (e) {}

  document.addEventListener("click", function (e) {
    var btn = e.target instanceof Element ? e.target.closest("[data-theme-toggle]") : null;
    if (!btn) return;
    var current = root.getAttribute("data-theme");
    if (!current) current = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    var next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {}
  });
})();
