// Share card for a finished section and the course certificate: a 1200x630 PNG drawn on a canvas
// in the browser. The optional name is drawn on the picture only; nothing is sent anywhere.
(function () {
  var dlg = document.querySelector("[data-share-dialog]");
  if (!dlg) return;
  var canvas = dlg.querySelector("canvas");
  var nameInput = dlg.querySelector("input[name=name]");
  var send = dlg.querySelector("[data-share-send]");
  var save = dlg.querySelector("[data-share-download]");
  var t = function (k) {
    return dlg.getAttribute("data-" + k) || "";
  };
  var W = 1200;
  var H = 630;
  var SANS = "'Geist Sans', 'Geist', system-ui, sans-serif";
  var MONO = "'Geist Mono', ui-monospace, monospace";
  var current = null;
  var opener = null;

  var pad = function (n) {
    return (n < 10 ? "0" : "") + n;
  };
  var today = function () {
    var d = new Date();
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
  };

  // greedy word wrap; the font shrinks until the title fits in maxLines
  var fit = function (ctx, text, maxW, maxLines, size, min) {
    for (; size >= min; size -= 4) {
      ctx.font = "600 " + size + "px " + SANS;
      var words = text.split(/\s+/);
      var lines = [];
      var line = "";
      words.forEach(function (w) {
        var next = line ? line + " " + w : w;
        if (ctx.measureText(next).width > maxW && line) {
          lines.push(line);
          line = w;
        } else line = next;
      });
      if (line) lines.push(line);
      if (lines.length <= maxLines) return { size: size, lines: lines };
    }
    return { size: min, lines: [text] };
  };

  var draw = function () {
    if (!current) return;
    var ctx = canvas.getContext("2d");
    var name = (nameInput.value || "").trim().slice(0, 48);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0b0f14";
    ctx.fillRect(0, 0, W, H);

    // isometric dot grid on the right, the course's scene language
    ctx.fillStyle = "#1c2633";
    for (var gx = 0; gx < 14; gx++)
      for (var gy = 0; gy < 14; gy++) {
        var x = 760 + (gx - gy) * 26 + 180;
        var y = 60 + (gx + gy) * 15;
        if (x > 700 && x < W - 20 && y < H - 20) {
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    // one big block in the brand shape
    ctx.save();
    ctx.translate(930, 300);
    ctx.scale(9, 9);
    ctx.translate(-16, -16);
    ctx.fillStyle = "#131922";
    ctx.strokeStyle = "#364151";
    ctx.lineWidth = 0.25;
    var hex = new Path2D("M16 3 27 9.5v13L16 29 5 22.5v-13Z");
    ctx.fill(hex);
    ctx.stroke(hex);
    ctx.strokeStyle = "#4d86ff";
    ctx.lineWidth = 0.45;
    ctx.stroke(new Path2D("M16 16 27 9.5M16 16v13M16 16 5 9.5"));
    ctx.fillStyle = "#4d86ff";
    ctx.beginPath();
    ctx.arc(16, 16, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // wordmark
    ctx.save();
    ctx.translate(72, 64);
    ctx.scale(1.6, 1.6);
    ctx.fillStyle = "#eef1f5";
    ctx.fill(hex);
    ctx.strokeStyle = "#0b0f14";
    ctx.lineWidth = 1.6;
    ctx.stroke(new Path2D("M16 16 27 9.5M16 16v13M16 16 5 9.5"));
    ctx.fillStyle = "#4d86ff";
    ctx.beginPath();
    ctx.arc(16, 16, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#eef1f5";
    ctx.font = "600 34px " + SANS;
    ctx.textBaseline = "middle";
    ctx.fillText("mufassall", 136, 90);

    // kicker, title, meta
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#4d86ff";
    ctx.font = "600 26px " + MONO;
    ctx.fillText((current.course ? t("course-done") : t("section-done")).toUpperCase(), 72, 232);
    var title = fit(ctx, current.title, 640, 3, 76, 40);
    ctx.fillStyle = "#eef1f5";
    ctx.font = "600 " + title.size + "px " + SANS;
    var y0 = 232 + title.size * 1.15;
    title.lines.forEach(function (l, i) {
      ctx.fillText(l, 72, y0 + i * title.size * 1.1);
    });
    var after = y0 + (title.lines.length - 1) * title.size * 1.1;
    ctx.fillStyle = "#97a1ae";
    ctx.font = "500 28px " + MONO;
    ctx.fillText(t("lessons-n").replace("{n}", current.count) + "  ·  " + today(), 72, after + 64);
    if (name) {
      ctx.fillStyle = "#eef1f5";
      ctx.font = "500 40px " + SANS;
      var n = name;
      while (ctx.measureText(n).width > 640 && n.length > 1) n = n.slice(0, -1);
      ctx.fillText(n, 72, H - 104);
    }
    ctx.fillStyle = "#5f6b7a";
    ctx.font = "500 24px " + MONO;
    ctx.fillText("mufassall.dtwin.uz", 72, H - 56);
  };

  var blob = function () {
    return new Promise(function (ok, fail) {
      canvas.toBlob(function (b) {
        if (b) ok(b);
        else fail(new Error("png"));
      }, "image/png");
    });
  };
  var fileName = function () {
    return "mufassall-" + current.id + ".png";
  };

  save.addEventListener("click", function () {
    blob().then(function (b) {
      var url = URL.createObjectURL(b);
      var a = document.createElement("a");
      a.href = url;
      a.download = fileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 4000);
    });
  });

  send.addEventListener("click", function () {
    blob().then(function (b) {
      var file = new File([b], fileName(), { type: "image/png" });
      var data = { files: [file], title: "mufassall", text: t("text").replace("{title}", current.title) };
      if (navigator.canShare && navigator.canShare(data)) navigator.share(data).catch(function () {});
    });
  });

  nameInput.addEventListener("input", draw);
  dlg.addEventListener("close", function () {
    if (opener) opener.focus();
  });

  var probe = function () {
    try {
      var f = new File([new Blob([""], { type: "image/png" })], "x.png", { type: "image/png" });
      return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [f] }));
    } catch (e) {
      return false;
    }
  };

  document.querySelectorAll("[data-share]").forEach(function (b) {
    b.addEventListener("click", function () {
      opener = b;
      current = {
        id: b.getAttribute("data-share") || "course",
        title: b.getAttribute("data-title") || "",
        count: b.getAttribute("data-count") || "",
        course: b.hasAttribute("data-course"),
      };
      send.hidden = !probe();
      if (typeof dlg.showModal === "function") dlg.showModal();
      else dlg.setAttribute("open", "");
      draw();
      // fonts may still be loading on a first visit: redraw once they are in
      if (document.fonts && document.fonts.load)
        Promise.all([document.fonts.load("600 40px 'Geist Sans'"), document.fonts.load("500 24px 'Geist Mono'")]).then(draw, function () {});
    });
  });
})();
