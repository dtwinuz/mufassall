// "My progress" on /<lang>/me/: the overview of everything this browser stores under mufassall:*,
// export (file, text, transfer code), import with a merge preview, and a two-step reset.
// Logic lives in /me-core.js (window.mufassallMeCore); FSRS recall from /fsrs.js when loaded.
(function () {
  var root = document.querySelector("[data-me]");
  var core = window.mufassallMeCore;
  if (!root || !core) return;
  var T = {};
  try {
    T = JSON.parse(root.getAttribute("data-t") || "{}");
  } catch (e) {}
  var lang = document.documentElement.lang || "en";
  var $ = function (sel) {
    return root.querySelector(sel);
  };
  var fill = function (s, v) {
    return String(s || "").replace(/\{(\w+)\}/g, function (_, k) {
      return v[k] === undefined ? "" : v[k];
    });
  };
  var pad = function (n) {
    return (n < 10 ? "0" : "") + n;
  };
  var human = function (d) {
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
  };
  var humanYmd = function (k) {
    var p = String(k).split("-");
    return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : String(k);
  };

  // ---------- storage ----------
  var storageOk = true;
  var readAll = function () {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (core.isProgressKey(k)) {
          var v = localStorage.getItem(k);
          if (typeof v === "string") out[k] = v;
        }
      }
    } catch (e) {
      storageOk = false;
    }
    return out;
  };
  var write = function (k, v) {
    try {
      localStorage.setItem(k, v);
      return true;
    } catch (e) {
      return false;
    }
  };
  var remove = function (k) {
    try {
      localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  };

  // ---------- overview ----------
  var course = [];
  var titles = {};
  root.querySelectorAll("[data-me-section]").forEach(function (sec) {
    var list = [];
    sec.querySelectorAll("[data-me-lesson]").forEach(function (a) {
      var slug = a.getAttribute("data-me-lesson");
      titles[slug] = a.getAttribute("data-title") || slug;
      list.push({ slug: slug, steps: Number(a.getAttribute("data-steps")) || 1 });
    });
    course.push({ id: sec.getAttribute("data-me-section"), lessons: list });
  });
  var F = window.MufassallFSRS;
  var retr = F && F.retrievability;
  var setText = function (sel, text) {
    var n = $(sel);
    if (n) n.textContent = text;
  };

  var render = function () {
    var data = readAll();
    $("[data-me-storage]").hidden = storageOk;
    var o = core.overview(data, course, Date.now(), retr);
    $("[data-me-empty]").hidden = !o.empty;
    $("[data-me-overview]").hidden = o.empty;

    setText("[data-me-lessons]", fill(T.of, { done: o.lessonsDone, total: o.lessonsTotal }));
    var bar = $("[data-me-lessons-bar]");
    if (bar) bar.value = o.lessonsDone;
    setText("[data-me-streak]", fill(T.daysN, { n: o.streak.current }));
    setText("[data-me-best]", fill(T.daysN, { n: o.streak.best }));
    setText("[data-me-goal]", o.goal.done >= o.goal.target ? T.goalReached + " ✓" : o.goal.done + " / " + o.goal.target);
    setText("[data-me-review]", fill(T.reviewOf, { due: o.review.due, total: o.review.total }));
    var rc = $("[data-me-recall]");
    rc.hidden = o.review.recall === null;
    rc.textContent = o.review.recall === null ? "" : fill(T.recall, { r: o.review.recall });

    var next = $("[data-me-next]");
    next.hidden = !o.next;
    if (o.next) {
      next.href = "/" + lang + "/l/" + o.next.slug + "/" + (o.next.step > 0 ? "?step=" + (o.next.step + 1) : "");
      next.textContent = fill(T.continue, { lesson: titles[o.next.slug] || o.next.slug }) + " →";
    }
    setText("[data-me-cert-text]", o.certificate ? T.certYes : fill(T.certNo, { n: o.lessonsTotal - o.lessonsDone }));
    $("[data-me-cert-go]").hidden = !o.certificate;

    var stateText = { done: T.stateDone, started: T.stateStarted, none: T.stateNone };
    o.sections.forEach(function (sec) {
      var box = root.querySelector('[data-me-section="' + sec.id + '"]');
      if (!box) return;
      var count = box.querySelector("[data-me-section-count]");
      count.hidden = false;
      count.textContent = fill(T.sectionOf, { done: sec.done, total: sec.total });
      sec.lessons.forEach(function (l) {
        var a = box.querySelector('[data-me-lesson="' + l.slug + '"]');
        if (!a) return;
        a.classList.toggle("is-done", l.state === "done");
        a.classList.toggle("is-started", l.state === "started");
        var sr = a.querySelector("[data-me-state]");
        if (sr) sr.textContent = " (" + stateText[l.state] + ")";
      });
    });

    var pass = Number(root.getAttribute("data-pass")) || core.PASS;
    root.querySelectorAll("[data-me-test]").forEach(function (b) {
      var r = o.tests[b.getAttribute("data-me-test")];
      b.classList.remove("is-pass", "is-fail");
      if (!r) {
        b.textContent = T.testNone;
        return;
      }
      b.classList.add(r.pass ? "is-pass" : "is-fail");
      b.textContent =
        fill(T.testBest, { p: r.best }) +
        " · " +
        (r.pass ? T.testPass : fill(T.testFail, { pass: pass })) +
        (r.at ? " · " + fill(T.testLast, { p: r.last, date: humanYmd(r.at) }) : "");
    });
    return data;
  };

  // ---------- export ----------
  var exportText = function () {
    var data = readAll();
    if (!Object.keys(data).length) return null;
    return JSON.stringify(core.envelope(data, new Date()), null, 2);
  };
  var expStatus = $("[data-me-export-status]");
  var say = function (el, text, bad) {
    el.textContent = text;
    el.classList.toggle("is-bad", !!bad);
  };
  var copyText = function (text, area) {
    var fallback = function () {
      if (area) {
        area.focus();
        area.select();
      }
      say(expStatus, T.copyFail, true);
    };
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(text).then(function () {
        say(expStatus, T.copied);
      }, fallback);
    else fallback();
  };

  $("[data-me-download]").addEventListener("click", function () {
    var text = exportText();
    if (!text) return say(expStatus, T.exportEmpty);
    var url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = core.fileName(new Date());
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 4000);
    say(expStatus, "");
  });

  var codeBox = document.getElementById("me-code-box");
  var codeArea = document.getElementById("me-code");
  $("[data-me-copy]").addEventListener("click", function () {
    var text = exportText();
    if (!text) return say(expStatus, T.exportEmpty);
    // without clipboard access the JSON goes into the code box so it can be selected by hand
    if (navigator.clipboard && navigator.clipboard.writeText) return copyText(text, null);
    codeBox.hidden = false;
    showBtn.setAttribute("aria-expanded", "true");
    codeArea.value = text;
    copyText(text, codeArea);
  });
  var showBtn = $("[data-me-show-code]");
  showBtn.addEventListener("click", function () {
    var open = codeBox.hidden;
    if (open) {
      var text = exportText();
      if (!text) return say(expStatus, T.exportEmpty);
      codeArea.value = core.toCode(JSON.stringify(core.envelope(readAll(), new Date())));
    }
    codeBox.hidden = !open;
    showBtn.setAttribute("aria-expanded", String(open));
    if (open) codeArea.focus();
  });
  $("[data-me-copy-code]").addEventListener("click", function () {
    copyText(codeArea.value, codeArea);
  });

  // ---------- import ----------
  var impStatus = $("[data-me-import-status]");
  var preview = $("[data-me-preview]");
  var pending = null;
  var hidePreview = function () {
    pending = null;
    preview.hidden = true;
  };
  var check = function (text) {
    hidePreview();
    var r = core.parse(text);
    if (!r.ok) return say(impStatus, (T.errors && T.errors[r.error]) || T.errors.json, true);
    say(impStatus, "");
    var m = core.merge(readAll(), r.data);
    var list = $("[data-me-preview-list]");
    list.textContent = "";
    ["lessons", "checks", "cards", "tests", "days", "other"].forEach(function (k) {
      if (!m.counts[k]) return;
      var li = document.createElement("li");
      li.textContent = fill(T.changes[k], { n: m.counts[k] });
      list.appendChild(li);
    });
    var from = $("[data-me-preview-from]");
    from.hidden = !r.exported;
    from.textContent = r.exported ? fill(T.previewFrom, { date: human(new Date(r.exported)) }) : "";
    var confirm = $("[data-me-confirm]");
    if (!m.changed.length) {
      var li = document.createElement("li");
      li.textContent = T.nothing;
      list.appendChild(li);
      confirm.hidden = true;
    } else {
      confirm.hidden = false;
      pending = r.data;
    }
    preview.hidden = false;
    preview.focus();
  };

  var fileInput = $("[data-me-file]");
  fileInput.addEventListener("change", function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    if (f.size >= core.MAX_BYTES) {
      hidePreview();
      fileInput.value = "";
      return say(impStatus, T.errors.size, true);
    }
    var rd = new FileReader();
    rd.onload = function () {
      check(String(rd.result || ""));
    };
    rd.onerror = function () {
      say(impStatus, T.errors.read, true);
    };
    rd.readAsText(f);
    fileInput.value = "";
  });
  $("[data-me-check]").addEventListener("click", function () {
    check($("[data-me-paste]").value);
  });
  $("[data-me-cancel]").addEventListener("click", function () {
    hidePreview();
    say(impStatus, "");
    $("[data-me-check]").focus();
  });
  $("[data-me-confirm]").addEventListener("click", function () {
    if (!pending) return;
    // merge again against what is stored now: another tab may have written in between
    var m = core.merge(readAll(), pending);
    var failed = 0;
    m.changed.forEach(function (k) {
      if (!write(k, m.data[k])) failed++;
    });
    hidePreview();
    $("[data-me-paste]").value = "";
    render();
    say(impStatus, failed ? T.writeFail : fill(T.imported, { n: m.total }), !!failed);
    // the confirm button is gone: keep keyboard focus on the result instead of <body>
    impStatus.setAttribute("tabindex", "-1");
    impStatus.focus();
  });

  // ---------- reset ----------
  var resetBtn = $("[data-me-reset]");
  var resetBox = document.getElementById("me-reset-confirm");
  var resetStatus = $("[data-me-reset-status]");
  var closeReset = function () {
    resetBox.hidden = true;
    resetBtn.setAttribute("aria-expanded", "false");
  };
  resetBtn.addEventListener("click", function () {
    var open = resetBox.hidden;
    resetBox.hidden = !open;
    resetBtn.setAttribute("aria-expanded", String(open));
    say(resetStatus, "");
    if (open) $("[data-me-reset-no]").focus();
  });
  $("[data-me-reset-no]").addEventListener("click", function () {
    closeReset();
    resetBtn.focus();
  });
  $("[data-me-reset-yes]").addEventListener("click", function () {
    var failed = 0;
    Object.keys(readAll()).forEach(function (k) {
      if (!core.isPreference(k) && !remove(k)) failed++;
    });
    closeReset();
    render();
    say(resetStatus, failed ? T.writeFail : T.resetDone, !!failed);
    resetBtn.focus();
    hidePreview();
  });

  // another tab learning or importing: keep the numbers fresh
  window.addEventListener("storage", function (e) {
    if (!e.key || core.isProgressKey(e.key)) render();
  });

  root.querySelectorAll("[data-me-js]").forEach(function (n) {
    n.hidden = false;
  });
  render();
})();
