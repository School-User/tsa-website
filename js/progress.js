// Shared progress state for every page. XP is never stored; it is
// calculated from what the student has completed, so it can't drift.
(function (root) {
  'use strict';
  var KEY = 'aiPortal.v1';
  var PASS = 4;            // correct answers needed for a module badge
  var LESSON_XP = 10;      // per lesson
  var QUIZ_XP = 10;        // per correct quiz answer
  var DEMO_XP = 10;        // per demo tried
  var MODULES = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
  var DEMOS = ['tokens', 'nextword', 'prompt'];
  var memory = null;       // fallback when localStorage is blocked

  function empty() { return { lessons: {}, quiz: {}, demos: [] }; }

  // Older saved data has no demos array, so that is the only optional field.
  function valid(s) {
    return s && typeof s === 'object' &&
      s.lessons && typeof s.lessons === 'object' && !Array.isArray(s.lessons) &&
      s.quiz && typeof s.quiz === 'object' && !Array.isArray(s.quiz) &&
      Object.keys(s.lessons).every(function (k) { return Array.isArray(s.lessons[k]); }) &&
      Object.keys(s.quiz).every(function (k) { return typeof s.quiz[k] === 'number' && isFinite(s.quiz[k]); }) &&
      (s.demos === undefined || Array.isArray(s.demos));
  }

  // Keep only known module ids, string lesson ids, whole quiz scores in 0-5
  // and known demo ids, without duplicates.
  function clean(s) {
    var out = empty();
    MODULES.forEach(function (m) {
      var list = s.lessons[m];
      if (!Array.isArray(list)) return;
      out.lessons[m] = [];
      list.forEach(function (id) {
        if (typeof id !== 'string' || id === '' || out.lessons[m].indexOf(id) !== -1) return;
        out.lessons[m].push(id);
      });
    });
    MODULES.forEach(function (m) {
      var score = s.quiz[m];
      if (typeof score !== 'number' || !isFinite(score)) return;
      out.quiz[m] = Math.max(0, Math.min(5, Math.floor(score)));
    });
    if (Array.isArray(s.demos)) {
      s.demos.forEach(function (id) {
        if (DEMOS.indexOf(id) !== -1 && out.demos.indexOf(id) === -1) out.demos.push(id);
      });
    }
    return out;
  }

  function load() {
    try {
      var raw = root.localStorage.getItem(KEY);
      if (raw !== null) {
        var parsed = JSON.parse(raw);
        if (valid(parsed)) return clean(parsed);
        return empty(); // corrupt data: start fresh
      }
    } catch (e) { /* storage blocked or bad JSON: fall through */ }
    return memory ? clean(JSON.parse(JSON.stringify(memory))) : empty();
  }

  function save(state) {
    memory = JSON.parse(JSON.stringify(state));
    try { root.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* memory copy still works */ }
    return state;
  }

  function completeLesson(moduleId, lessonId) {
    var s = load();
    var list = s.lessons[moduleId] || (s.lessons[moduleId] = []);
    if (list.indexOf(lessonId) === -1) list.push(lessonId);
    return save(s);
  }

  // A demo counts once, however often it is used afterwards.
  function completeDemo(demoId) {
    var s = load();
    if (DEMOS.indexOf(demoId) === -1 || s.demos.indexOf(demoId) !== -1) return s;
    s.demos.push(demoId);
    return save(s);
  }

  // Keeps the best score, so retaking a quiz can never farm extra XP.
  function submitQuiz(moduleId, correct, total) {
    var s = load();
    var score = Math.max(0, Math.min(correct, total));
    if (!(s.quiz[moduleId] >= score)) s.quiz[moduleId] = score;
    return save(s);
  }

  function xp(s) {
    var total = 0, id;
    for (id in s.lessons) total += s.lessons[id].length * LESSON_XP;
    for (id in s.quiz) total += s.quiz[id] * QUIZ_XP;
    total += (Array.isArray(s.demos) ? s.demos.length : 0) * DEMO_XP;
    return total;
  }

  function level(s) { return Math.floor(xp(s) / 100) + 1; }

  function badges(s) {
    var earned = MODULES.filter(function (m) { return s.quiz[m] >= PASS; });
    if (earned.length === MODULES.length) earned.push('reflective-learner');
    return earned;
  }

  function reset() {
    memory = null;
    try { root.localStorage.removeItem(KEY); } catch (e) { /* nothing to clear */ }
  }

  // ---- Progress code: move progress between devices with no account ----
  // Format: AIL5- then, per module, one hex digit (which of the 4 lessons are
  // read, as bits) and one quiz score (0-5, or X for "not taken"), then one
  // checksum character that catches typos. AIL5 adds one digit for the demos
  // tried (bits). Example: AIL5-F5F5F5F5F5F57K
  // Older AIL1- to AIL4- codes (fewer modules, no demos) still restore.
  var LESSON_IDS = ['l1', 'l2', 'l3', 'l4'];
  var PREFIX = 'AIL5-';
  var CODE_MODULES = { 'AIL1-': ['m1', 'm2', 'm3'], 'AIL2-': ['m1', 'm2', 'm3', 'm4'],
    'AIL3-': ['m1', 'm2', 'm3', 'm4', 'm5'], 'AIL4-': MODULES, 'AIL5-': MODULES };

  // Position-weighted sum, so swapped characters are caught too.
  function checksum(body) {
    var sum = 0;
    for (var i = 0; i < body.length; i++) {
      sum += parseInt(body.charAt(i) === 'X' ? '6' : body.charAt(i), 36) * (i + 1);
    }
    return (sum % 36).toString(36).toUpperCase();
  }

  function exportCode() {
    var s = load();
    var body = MODULES.map(function (m) {
      var read = s.lessons[m] || [], mask = 0;
      LESSON_IDS.forEach(function (id, i) { if (read.indexOf(id) !== -1) mask |= 1 << i; });
      var score = s.quiz[m] === undefined ? 'X' : String(Math.min(5, s.quiz[m]));
      return mask.toString(16).toUpperCase() + score;
    }).join('') + DEMOS.reduce(function (m, d, i) { return s.demos.indexOf(d) !== -1 ? m | 1 << i : m; }, 0).toString(16).toUpperCase();
    return PREFIX + body + checksum(body);
  }

  // Merges the code into this device's progress (never erases anything).
  // Returns the new state, or null if the code is not valid.
  function importCode(code) {
    if (typeof code !== 'string') return null;
    // Forgiving: any case, stray spaces, text around it, phone "smart" dashes.
    var c = code.toUpperCase().replace(/[\u2010-\u2015\u2212]/g, '-');
    var found = c.match(/AIL[1-5]-?[0-9A-Z]+/) || c.replace(/\s+/g, '').match(/AIL[1-5]-?[0-9A-Z]+/);
    if (!found) return null;
    c = found[0].replace(/^(AIL\d)-?/, '$1-');
    var mods = CODE_MODULES[c.slice(0, 5)];
    var hasDemos = c.slice(0, 5) === 'AIL5-';
    var body = c.slice(5, -1);
    if (!mods || !new RegExp('^([0-9A-F][0-5X]){' + mods.length + '}' + (hasDemos ? '[0-7]' : '') + '$').test(body) ||
        checksum(body) !== c.slice(-1)) return null;
    var s = load();
    mods.forEach(function (mod, i) {
      var mask = parseInt(body.charAt(2 * i), 16), score = body.charAt(2 * i + 1);
      var read = s.lessons[mod] || [];
      LESSON_IDS.forEach(function (id, bit) {
        if (mask & (1 << bit) && read.indexOf(id) === -1) read.push(id);
      });
      if (read.length) s.lessons[mod] = read;
      if (score !== 'X' && !(s.quiz[mod] >= Number(score))) s.quiz[mod] = Number(score);
    });
    if (hasDemos) {
      var dm = parseInt(body.charAt(body.length - 1), 16);
      s.demos = s.demos || [];
      DEMOS.forEach(function (d, i) { if (dm & (1 << i) && s.demos.indexOf(d) === -1) s.demos.push(d); });
    }
    return save(s);
  }

  var api = { load: load, completeLesson: completeLesson, submitQuiz: submitQuiz,
              completeDemo: completeDemo, xp: xp, level: level, badges: badges,
              reset: reset, PASS: PASS, DEMO_XP: DEMO_XP, DEMOS: DEMOS,
              exportCode: exportCode, importCode: importCode };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Progress = api;
})(typeof window !== 'undefined' ? window : globalThis);
