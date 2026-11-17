// Shared progress state for every page. XP is never stored; it is
// calculated from what the student has completed, so it can't drift.
(function (root) {
  var KEY = 'aiPortal.v1';
  var PASS = 4;            // correct answers needed for a module badge
  var LESSON_XP = 10;      // per lesson
  var QUIZ_XP = 10;        // per correct quiz answer
  var MODULES = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
  var memory = null;       // fallback when localStorage is blocked

  function empty() { return { lessons: {}, quiz: {} }; }

  function valid(s) {
    return s && typeof s === 'object' &&
      s.lessons && typeof s.lessons === 'object' && !Array.isArray(s.lessons) &&
      s.quiz && typeof s.quiz === 'object' && !Array.isArray(s.quiz) &&
      Object.keys(s.lessons).every(function (k) { return Array.isArray(s.lessons[k]); }) &&
      Object.keys(s.quiz).every(function (k) { return typeof s.quiz[k] === 'number' && isFinite(s.quiz[k]); });
  }

  function load() {
    try {
      var raw = root.localStorage.getItem(KEY);
      if (raw !== null) {
        var parsed = JSON.parse(raw);
        if (valid(parsed)) return parsed;
        return empty(); // corrupt or old data: start fresh
      }
    } catch (e) { /* storage blocked or bad JSON: fall through */ }
    return memory ? JSON.parse(JSON.stringify(memory)) : empty();
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
  // Format: AIL4- then, per module, one hex digit (which of the 4 lessons are
  // read, as bits) and one quiz score (0-5, or X for "not taken"), then one
  // checksum character that catches typos. Example: AIL4-F5F5F5F5F5F5K
  // Older AIL1- (3), AIL2- (4) and AIL3- (5 module) codes still restore.
  var LESSON_IDS = ['l1', 'l2', 'l3', 'l4'];
  var PREFIX = 'AIL4-';
  var CODE_MODULES = { 'AIL1-': ['m1', 'm2', 'm3'], 'AIL2-': ['m1', 'm2', 'm3', 'm4'],
    'AIL3-': ['m1', 'm2', 'm3', 'm4', 'm5'], 'AIL4-': MODULES };

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
    }).join('');
    return PREFIX + body + checksum(body);
  }

  // Merges the code into this device's progress (never erases anything).
  // Returns the new state, or null if the code is not valid.
  function importCode(code) {
    if (typeof code !== 'string') return null;
    var c = code.replace(/\s+/g, '').toUpperCase();
    var mods = CODE_MODULES[c.slice(0, PREFIX.length)];
    var body = c.slice(PREFIX.length, -1);
    if (!mods || !new RegExp('^([0-9A-F][0-5X]){' + mods.length + '}$').test(body) ||
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
    return save(s);
  }

  var api = { load: load, completeLesson: completeLesson, submitQuiz: submitQuiz,
              xp: xp, level: level, badges: badges, reset: reset, PASS: PASS,
              exportCode: exportCode, importCode: importCode };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Progress = api;
})(typeof window !== 'undefined' ? window : globalThis);
