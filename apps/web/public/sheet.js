// Cheat sheet page: the "Print / Save PDF" button (the print stylesheet in site.css does the layout).
(function () {
  document.querySelectorAll("[data-print]").forEach(function (b) {
    if (typeof window.print !== "function") return;
    b.hidden = false;
    b.addEventListener("click", function () {
      window.print();
    });
  });
})();
