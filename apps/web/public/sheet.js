// Cheat sheet page: the "Print / Save PDF" button, and the "Diagram as code" tabs and copy buttons
// (the code itself is generated at build time; without JS every format is simply listed).
(function () {
  document.querySelectorAll("[data-print]").forEach(function (b) {
    if (typeof window.print !== "function") return;
    b.hidden = false;
    b.addEventListener("click", function () {
      window.print();
    });
  });

  document.querySelectorAll("[data-code-tabs]").forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var list = root.querySelector('[role="tablist"]');
    var status = root.querySelector("[data-copy-status]");
    var timer = 0;

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }

    if (list && tabs.length) {
      list.hidden = false;
      root.querySelectorAll("[data-panel-name]").forEach(function (h) {
        h.hidden = true;
      });
      select(tabs[0], false);
      tabs.forEach(function (t, i) {
        t.addEventListener("click", function () {
          select(t, false);
        });
        t.addEventListener("keydown", function (e) {
          var next = -1;
          if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
          else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = tabs.length - 1;
          if (next < 0) return;
          e.preventDefault();
          select(tabs[next], true);
        });
      });
    }

    function say(text) {
      if (!status) return;
      status.textContent = text;
      clearTimeout(timer);
      timer = setTimeout(function () {
        status.textContent = "";
      }, 2500);
    }

    // last resort: select the code so Ctrl+C works, and try the old copy command
    function fallback(code) {
      var range = document.createRange();
      range.selectNodeContents(code);
      var sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err) {
        ok = false;
      }
      say(root.getAttribute(ok ? "data-copied" : "data-failed") || "");
    }

    root.querySelectorAll("[data-copy]").forEach(function (b) {
      var code = b.parentElement && b.parentElement.querySelector("[data-code]");
      if (!code) return;
      b.hidden = false;
      b.addEventListener("click", function () {
        var text = code.textContent || "";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            function () {
              say(root.getAttribute("data-copied") || "");
            },
            function () {
              fallback(code);
            },
          );
        } else fallback(code);
      });
    });
  });
})();
