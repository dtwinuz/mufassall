// FSRS-5 scheduler (Free Spaced Repetition Scheduler, open-spaced-repetition) for /review.js.
// Pure functions, no DOM: loaded as a plain script it sets window.MufassallFSRS; the vitest
// suite imports it for its side effect and reads globalThis.MufassallFSRS.
// A card: { s: stability in days, d: difficulty 1..10, due: ms, last: ms of the last review,
//           reps, lapses, st: 0 new | 1 learning | 2 review | 3 relearning }
// Ratings: 1 Again, 2 Hard, 3 Good, 4 Easy.
(function () {
  var DAY = 864e5;
  // published FSRS-5 default parameters w0..w18
  var W = [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605,
    2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
  ];
  var DECAY = -0.5;
  var FACTOR = 19 / 81; // 0.9^(1/DECAY) - 1, so that R(S, S) = 0.9
  var RETENTION = 0.9;
  var S_MIN = 0.01;
  var MAX_IVL = 36500;
  // learning steps inside one session: a miss on a new card, and on a card already in review
  var LEARN_STEP = 60e3;
  var RELEARN_STEP = 10 * 60e3;

  var clampD = function (d) {
    return Math.min(10, Math.max(1, d));
  };
  var clampS = function (s) {
    return Math.max(S_MIN, s);
  };

  // probability of recall after t days for stability s
  var retrievability = function (t, s) {
    return Math.pow(1 + (FACTOR * Math.max(0, t)) / s, DECAY);
  };
  // days until recall falls to r (r = 0.9 gives exactly s)
  var interval = function (s, r) {
    return (s / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);
  };
  var initStability = function (g) {
    return clampS(W[g - 1]);
  };
  var initDifficultyRaw = function (g) {
    return W[4] - Math.exp(W[5] * (g - 1)) + 1;
  };
  var initDifficulty = function (g) {
    return clampD(initDifficultyRaw(g));
  };
  // linear damping, then mean reversion toward D0(Easy)
  var nextDifficulty = function (d, g) {
    var delta = -W[6] * (g - 3);
    var damped = d + (delta * (10 - d)) / 9;
    return clampD(W[7] * initDifficultyRaw(4) + (1 - W[7]) * damped);
  };
  var recallStability = function (d, s, r, g) {
    var hard = g === 2 ? W[15] : 1;
    var easy = g === 4 ? W[16] : 1;
    return clampS(
      s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy),
    );
  };
  var forgetStability = function (d, s, r) {
    var long = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
    return clampS(Math.min(long, s / Math.exp(W[17] * W[18])));
  };
  // a second review on the same day
  var shortTermStability = function (s, g) {
    return clampS(s * Math.exp(W[17] * (g - 3 + W[18])));
  };

  // FNV-1a, then one mulberry32 round: a number in [0, 1) fixed by the string
  var seed = function (str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    var t = (h + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // the reference fuzz ranges: +-15% up to a week, 10% up to 20 days, 5% beyond
  var fuzz = function (ivl, u) {
    if (ivl < 2.5) return ivl;
    var delta = 1;
    [
      [2.5, 7, 0.15],
      [7, 20, 0.1],
      [20, Infinity, 0.05],
    ].forEach(function (r) {
      delta += r[2] * Math.max(Math.min(ivl, r[1]) - r[0], 0);
    });
    var lo = Math.max(2, Math.round(ivl - delta));
    var hi = Math.min(MAX_IVL, Math.round(ivl + delta));
    return Math.min(hi, Math.floor(u * (hi - lo + 1) + lo));
  };
  var days = function (s, id, reps) {
    var ivl = Math.min(MAX_IVL, Math.max(1, Math.round(interval(s, RETENTION))));
    return id === undefined ? ivl : fuzz(ivl, seed(String(id) + ":" + reps));
  };

  var newCard = function () {
    return { s: 0, d: 0, due: 0, last: 0, reps: 0, lapses: 0, st: 0 };
  };

  // the card after answering with rating g at time now; id seeds the fuzz
  var next = function (card, g, now, id) {
    var c = card && card.st ? card : newCard();
    var out = { s: c.s, d: c.d, due: 0, last: now, reps: (c.reps || 0) + 1, lapses: c.lapses || 0, st: c.st };
    if (!c.st) {
      out.s = initStability(g);
      out.d = initDifficulty(g);
    } else {
      var t = (now - (c.last || now)) / DAY;
      var r = retrievability(t, c.s);
      out.d = nextDifficulty(c.d, g);
      if (t < 1) out.s = shortTermStability(c.s, g);
      else out.s = g === 1 ? forgetStability(c.d, c.s, r) : recallStability(c.d, c.s, r, g);
    }
    if (g === 1) {
      if (c.st === 2) out.lapses++;
      out.st = c.st === 2 || c.st === 3 ? 3 : 1;
      out.due = now + (out.st === 3 ? RELEARN_STEP : LEARN_STEP);
    } else {
      out.st = 2;
      out.due = now + days(out.s, id, out.reps) * DAY;
    }
    return out;
  };

  // v1 Leitner state { b: box 0..5, d: due ms } -> a card: the box's gap becomes the stability
  var GAP = [0, 1, 3, 7, 16, 35];
  var fromV1 = function (v, now) {
    var b = Math.min(5, Math.max(0, Math.floor(Number(v && v.b) || 0)));
    var due = Number(v && v.d) || 0;
    if (!b) {
      var c = newCard();
      c.due = due;
      return c;
    }
    return {
      s: GAP[b],
      d: 5,
      due: due,
      last: Math.min(now, Math.max(0, due - GAP[b] * DAY)),
      reps: b,
      lapses: 0,
      st: 2,
    };
  };
  var migrate = function (v1, now) {
    var out = {};
    Object.keys(v1 || {}).forEach(function (id) {
      if (v1[id] && typeof v1[id] === "object") out[id] = fromV1(v1[id], now);
    });
    return out;
  };

  var api = {
    W: W,
    DECAY: DECAY,
    FACTOR: FACTOR,
    RETENTION: RETENTION,
    LEARN_STEP: LEARN_STEP,
    RELEARN_STEP: RELEARN_STEP,
    retrievability: retrievability,
    interval: interval,
    initStability: initStability,
    initDifficulty: initDifficulty,
    nextDifficulty: nextDifficulty,
    recallStability: recallStability,
    forgetStability: forgetStability,
    shortTermStability: shortTermStability,
    seed: seed,
    fuzz: fuzz,
    newCard: newCard,
    next: next,
    fromV1: fromV1,
    migrate: migrate,
  };
  (typeof window !== "undefined" ? window : globalThis).MufassallFSRS = api;
})();
