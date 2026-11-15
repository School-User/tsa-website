// Run: node tests/progress.test.js
const assert = require('assert');
const path = require('path');

function useStorage(impl) {
  Object.defineProperty(globalThis, 'localStorage', { value: impl, configurable: true, writable: true });
}
function memStorage() {
  const d = {};
  return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: k => { delete d[k]; }, _d: d };
}
function fresh(storage) {
  useStorage(storage || memStorage());
  delete require.cache[require.resolve(path.join(__dirname, '../js/progress.js'))];
  return require('../js/progress.js');
}

// lesson XP counts once
let P = fresh();
P.completeLesson('m1', 'a'); let s = P.completeLesson('m1', 'a');
assert.strictEqual(P.xp(s), 10, 'same lesson twice = 10 XP');

// quiz XP: best score only, never double counted
P = fresh();
s = P.submitQuiz('m1', 3, 5); assert.strictEqual(P.xp(s), 30);
s = P.submitQuiz('m1', 5, 5); assert.strictEqual(P.xp(s), 50, 'retake replaces, not adds');
s = P.submitQuiz('m1', 2, 5); assert.strictEqual(P.xp(s), 50, 'worse retake keeps best');

// badges
P = fresh();
assert.deepStrictEqual(P.badges(P.submitQuiz('m1', 3, 5)), [], '3/5 does not pass');
assert.deepStrictEqual(P.badges(P.submitQuiz('m1', 4, 5)), ['m1'], '4/5 passes');
P.submitQuiz('m2', 5, 5);
assert.deepStrictEqual(P.badges(P.submitQuiz('m3', 4, 5)), ['m1', 'm2', 'm3', 'reflective-learner']);

// level boundaries
P = fresh();
assert.strictEqual(P.level({ lessons: { m1: new Array(9).fill(0).map((_, i) => 'l' + i) }, quiz: {} }), 1); // 90 XP
assert.strictEqual(P.level({ lessons: { m1: new Array(10).fill(0).map((_, i) => 'l' + i) }, quiz: {} }), 2); // 100 XP

// persistence across loads
P = fresh(); P.completeLesson('m2', 'x');
assert.strictEqual(P.xp(P.load()), 10);

// corrupt JSON -> empty state, no crash
const bad = memStorage(); bad.setItem('aiPortal.v1', '{not json');
P = fresh(bad); assert.strictEqual(P.xp(P.load()), 0);
bad.setItem('aiPortal.v1', '{"lessons":5}'); assert.strictEqual(P.xp(P.load()), 0, 'wrong shape ignored');

// storage that throws -> still works in memory
P = fresh({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
s = P.completeLesson('m1', 'a'); assert.strictEqual(P.xp(s), 10);
assert.strictEqual(P.xp(P.load()), 10, 'memory fallback remembers');

// reset
P = fresh(); P.completeLesson('m1', 'a'); P.reset();
assert.strictEqual(P.xp(P.load()), 0);

// ---- progress code: export / import ----
P = fresh();
P.completeLesson('m1', 'l1'); P.completeLesson('m1', 'l3'); P.submitQuiz('m1', 4, 5); P.completeLesson('m3', 'l4');
const code = P.exportCode();
assert.ok(/^AIL1-[0-9A-F][0-5X][0-9A-F][0-5X][0-9A-F][0-5X][0-9A-Z]$/.test(code), 'code format: ' + code);
assert.ok(code.length <= 16, 'code stays short');

// round trip into a fresh browser
const other = fresh();
const restored = other.importCode(code);
assert.strictEqual(other.xp(restored), 10 + 10 + 40 + 10, 'xp matches after restore');
assert.deepStrictEqual(other.load().lessons.m1, ['l1', 'l3']);
assert.strictEqual(other.load().quiz.m1, 4);
assert.strictEqual(other.exportCode(), code, 'export of restored state gives same code');

// merge: restoring never erases what's already on this device
const dev = fresh(); dev.completeLesson('m2', 'l2'); dev.submitQuiz('m1', 5, 5);
dev.importCode(code);
assert.strictEqual(dev.load().quiz.m1, 5, 'better local score kept');
assert.deepStrictEqual(dev.load().lessons.m2, ['l2'], 'local lessons kept');
assert.ok(dev.load().lessons.m1.includes('l1') && dev.load().lessons.m1.includes('l3'), 'imported lessons added');

// forgiving input: lowercase, spaces, newlines
assert.ok(fresh().importCode('  ' + code.toLowerCase() + '\n'), 'whitespace and case ignored');

// empty state round trip
assert.strictEqual(fresh().importCode(fresh().exportCode()) !== null, true, 'empty code is valid');

// bad input returns null and changes nothing
const keep = fresh(); keep.completeLesson('m1', 'l1');
['', 'hello', 'AIL2-F5F5F5K', code.slice(0, -1), code.slice(0, -1) + (code.slice(-1) === 'Z' ? 'Y' : 'Z'),
 'AIL1-F9F5F5K', null, undefined, 42].forEach(function (bad) {
  assert.strictEqual(keep.importCode(bad), null, 'rejects ' + String(bad));
});
assert.strictEqual(keep.xp(keep.load()), 10, 'bad code left progress untouched');

console.log('progress: all tests passed');
