// Pure logic of the section test (/test.js): seeded question pick, option shuffle, scoring and
// the stored record. Plain script: sets window.mufassallTestCore; vitest runs it in a vm sandbox.
(function (root) {
  var PASS = 70; // percent needed to pass
  var MAX = 10; // questions per test

  // mulberry32: tiny, deterministic, good enough to shuffle a few dozen items
  var rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  var shuffle = function (list, rand) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var x = a[i];
      a[i] = a[j];
      a[j] = x;
    }
    return a;
  };

  // ?seed=N (1..999999) or null
  var parseSeed = function (search) {
    var m = /[?&]seed=(\d{1,6})(?:&|$)/.exec(search || "");
    var n = m ? Number(m[1]) : 0;
    return n >= 1 ? n : null;
  };
  var newSeed = function (random) {
    return 1 + Math.floor((random || Math.random)() * 999999);
  };

  // N questions from the bank; each keeps its source and gets shuffled options with the
  // right one's new position in `answer`
  var build = function (bank, seed, max) {
    var rand = rng(seed);
    var n = Math.min(max || MAX, bank.length);
    return shuffle(bank, rand)
      .slice(0, n)
      .map(function (q) {
        var order = shuffle(
          q.options.map(function (_, i) {
            return i;
          }),
          rand,
        );
        return {
          src: q,
          options: order.map(function (i) {
            return q.options[i];
          }),
          answer: order.indexOf(q.answer),
        };
      });
  };

  // picks: chosen option index per question (in the shuffled order), -1 or missing = none
  var score = function (questions, picks) {
    var right = 0;
    var rows = questions.map(function (q, i) {
      var p = typeof picks[i] === "number" ? picks[i] : -1;
      var ok = p === q.answer;
      if (ok) right++;
      return { q: q, pick: p, ok: ok };
    });
    var total = questions.length;
    var pct = total ? Math.round((right * 100) / total) : 0;
    return { right: right, total: total, pct: pct, pass: total > 0 && pct >= PASS, rows: rows };
  };

  var pad = function (n) {
    return (n < 10 ? "0" : "") + n;
  };
  var ymd = function (d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };

  // mufassall:v1:tests entry after a finished attempt
  var record = function (prev, pct, date) {
    var best = prev && typeof prev.best === "number" ? Math.max(prev.best, pct) : pct;
    return { best: best, last: pct, at: ymd(date) };
  };

  // the lesson player reads ?step=N (1-based) and ?sc=<scenario>
  var stepHref = function (lang, src) {
    return "/" + lang + "/l/" + src.lesson + "/?" + (src.sc ? "sc=" + encodeURIComponent(src.sc) + "&" : "") + "step=" + (src.step + 1);
  };

  root.mufassallTestCore = {
    PASS: PASS,
    MAX: MAX,
    rng: rng,
    shuffle: shuffle,
    parseSeed: parseSeed,
    newSeed: newSeed,
    build: build,
    score: score,
    record: record,
    ymd: ymd,
    stepHref: stepHref,
  };
})(typeof window !== "undefined" ? window : this);
