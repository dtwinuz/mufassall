// Napkin-math calculator on /<lang>/tools/estimate/. Inputs live in the URL query, so a link
// reproduces the numbers. Every result shows its formula with the real values filled in.
(function () {
  var root = document.querySelector("[data-estimate]");
  if (!root) return;
  var form = root.querySelector("form");
  var lang = document.documentElement.lang || "en";
  var t = function (k) {
    return root.getAttribute("data-" + k) || "";
  };
  var DAY = 86400;
  var FIELDS = ["dau", "actions", "ratio", "payload", "retention", "peak", "replicas", "perServer"];
  var PRESETS = {
    url: { dau: 1000000, actions: 10, ratio: 100, payload: 0.5, retention: 1825, peak: 3, replicas: 3, perServer: 2000 },
    feed: { dau: 10000000, actions: 50, ratio: 50, payload: 2, retention: 365, peak: 4, replicas: 3, perServer: 1000 },
    chat: { dau: 50000000, actions: 40, ratio: 2, payload: 0.2, retention: 365, peak: 5, replicas: 3, perServer: 2000 },
    video: { dau: 5000000, actions: 5, ratio: 200, payload: 50000, retention: 3650, peak: 3, replicas: 3, perServer: 500 },
  };

  // same rules as formatNumber in packages/scene-engine/src/ui.ts: no Intl, fixed grouping and mark
  var fmt = function (value, decimals) {
    decimals = decimals || 0;
    var factor = Math.pow(10, decimals);
    var rounded = Math.round(Math.abs(value) * factor) / factor;
    var parts = rounded.toFixed(decimals).split(".");
    var grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    var mark = lang === "en" ? "." : ",";
    return (value < 0 && rounded !== 0 ? "−" : "") + grouped + (parts[1] ? mark + parts[1] : "");
  };
  // enough digits to be useful, never a wall of them
  var num = function (v) {
    var a = Math.abs(v);
    if (a === 0 || a >= 100) return fmt(v, 0);
    if (a >= 10) return fmt(v, 1).replace(/[.,]0$/, "");
    if (a >= 1) return fmt(v, 2).replace(/[.,]?0+$/, "");
    return fmt(v, 3).replace(/[.,]?0+$/, "") || "0";
  };
  var UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];
  var bytes = function (b) {
    var i = 0;
    while (Math.abs(b) >= 1000 && i < UNITS.length - 1) {
      b /= 1000;
      i++;
    }
    return num(b) + " " + UNITS[i];
  };

  var input = function (id) {
    return form.elements.namedItem(id);
  };
  var read = function () {
    var v = {};
    FIELDS.forEach(function (id) {
      var n = Number(input(id).value);
      v[id] = isFinite(n) && n >= 0 ? n : 0;
    });
    v.replicas = Math.max(1, v.replicas);
    v.perServer = Math.max(1, v.perServer);
    return v;
  };
  var write = function (v) {
    FIELDS.forEach(function (id) {
      if (v[id] !== undefined) input(id).value = String(v[id]);
    });
  };

  var show = function (id, value, formula) {
    var out = root.querySelector('[data-out="' + id + '"]');
    var f = root.querySelector('[data-formula="' + id + '"]');
    if (out) out.textContent = value;
    if (f) f.textContent = formula;
  };

  var render = function () {
    var v = read();
    var perDay = t("per-day");
    var perSec = t("per-sec");
    var size = v.payload * 1000;
    var total = v.dau * v.actions;
    var writesDay = total / (v.ratio + 1);
    var readsDay = total - writesDay;
    var avgR = readsDay / DAY;
    var avgW = writesDay / DAY;
    var peakR = avgR * v.peak;
    var peakW = avgW * v.peak;
    var storeDay = writesDay * size * v.replicas;
    var servers = Math.ceil((peakR + peakW) / v.perServer);
    var cache = readsDay * size * 0.2;
    var kb = num(v.payload) + " KB";

    show("requests", num(total) + " " + perDay, num(v.dau) + " × " + num(v.actions) + " = " + num(total) + perDay);
    show(
      "avgReads",
      num(avgR) + " " + perSec,
      num(total) + " × " + num(v.ratio) + " ÷ (" + num(v.ratio) + " + 1) = " + num(readsDay) + perDay + " ÷ 86 400 = " + num(avgR) + perSec,
    );
    show("avgWrites", num(avgW) + " " + perSec, num(total) + " ÷ (" + num(v.ratio) + " + 1) = " + num(writesDay) + perDay + " ÷ 86 400 = " + num(avgW) + perSec);
    show("peakReads", num(peakR) + " " + perSec, num(avgR) + " × " + num(v.peak) + " = " + num(peakR) + perSec);
    show("peakWrites", num(peakW) + " " + perSec, num(avgW) + " × " + num(v.peak) + " = " + num(peakW) + perSec);
    show("bwIn", bytes(peakW * size) + perSec, num(peakW) + perSec + " × " + kb + " = " + bytes(peakW * size) + perSec);
    show("bwOut", bytes(peakR * size) + perSec, num(peakR) + perSec + " × " + kb + " = " + bytes(peakR * size) + perSec);
    show("storeDay", bytes(storeDay) + perDay, num(writesDay) + " × " + kb + " × " + num(v.replicas) + " = " + bytes(storeDay));
    show("storeYear", bytes(storeDay * 365), bytes(storeDay) + " × 365 = " + bytes(storeDay * 365));
    show("storeKept", bytes(storeDay * v.retention), bytes(storeDay) + " × " + num(v.retention) + " " + t("days") + " = " + bytes(storeDay * v.retention));
    show(
      "servers",
      fmt(servers) + " " + t("servers"),
      "(" + num(peakR) + " + " + num(peakW) + ") ÷ " + num(v.perServer) + " = " + num((peakR + peakW) / v.perServer) + " → " + fmt(servers),
    );
    show("cache", bytes(cache), num(readsDay) + " × " + kb + " × 0" + (lang === "en" ? "." : ",") + "2 = " + bytes(cache));
  };

  var pressPreset = function () {
    var v = read();
    root.querySelectorAll("[data-preset]").forEach(function (b) {
      var p = PRESETS[b.getAttribute("data-preset")];
      var same = FIELDS.every(function (id) {
        return p[id] === v[id];
      });
      b.setAttribute("aria-pressed", same ? "true" : "false");
    });
  };

  var toUrl = function () {
    var v = read();
    var q = new URLSearchParams();
    FIELDS.forEach(function (id) {
      q.set(id, String(v[id]));
    });
    try {
      history.replaceState(history.state, "", location.pathname + "?" + q.toString());
    } catch (e) {}
  };

  var update = function () {
    render();
    pressPreset();
    toUrl();
  };

  // a shared link wins over the defaults
  var q = new URLSearchParams(location.search);
  var fromQuery = {};
  FIELDS.forEach(function (id) {
    var n = Number(q.get(id));
    if (q.has(id) && isFinite(n) && n >= 0) fromQuery[id] = n;
  });
  write(fromQuery);

  form.addEventListener("input", update);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    update();
  });
  root.querySelectorAll("[data-preset]").forEach(function (b) {
    b.addEventListener("click", function () {
      write(PRESETS[b.getAttribute("data-preset")]);
      update();
    });
  });

  var status = root.querySelector("[data-est-status]");
  var copy = root.querySelector("[data-est-copy]");
  copy.addEventListener("click", function () {
    toUrl();
    var done = function () {
      status.textContent = t("copied");
      setTimeout(function () {
        status.textContent = "";
      }, 2500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(done, function () {});
  });

  render();
  pressPreset();
  if (Object.keys(fromQuery).length) toUrl();
})();
