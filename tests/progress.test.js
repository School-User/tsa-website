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
assert.deepStrictEqual(P.badges(P.submitQuiz('m3', 4, 5)), ['m1', 'm2', 'm3']);
assert.deepStrictEqual(P.badges(P.submitQuiz('m4', 4, 5)), ['m1', 'm2', 'm3', 'm4']);
assert.deepStrictEqual(P.badges(P.submitQuiz('m5', 4, 5)), ['m1', 'm2', 'm3', 'm4', 'm5']);
assert.deepStrictEqual(P.badges(P.submitQuiz('m6', 4, 5)), ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'reflective-learner']);

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
assert.ok(/^AIL6-([0-9A-F][0-5X]){6}[0-7][0-3][0-9A-F][0-9A-Z]$/.test(code), 'code format: ' + code);
assert.ok(code.length <= 24, 'code stays short');

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
['', 'hello', 'AIL2-F5F5F5K', 'AIL5-F5F5F5F5F5F5K', 'AIL4-F5F5F5F5F5K', code.slice(0, -1), code.slice(0, -1) + (code.slice(-1) === 'Z' ? 'Y' : 'Z'),
 'AIL1-F9F5F5K', 'AIL1-F5F5F5F5K', 'AIL2-F5F5F5F5F5K', 'AIL3-F5F5F5F5F5F5K', null, undefined, 42].forEach(function (bad) {
  assert.strictEqual(keep.importCode(bad), null, 'rejects ' + String(bad));
});
assert.strictEqual(keep.xp(keep.load()), 10, 'bad code left progress untouched');

// old 3-module codes still restore (build one by hand with the same checksum rule)
const body1 = 'F4' + '30' + '0X';
let sum1 = 0; for (let i = 0; i < body1.length; i++) sum1 += parseInt(body1[i] === 'X' ? '6' : body1[i], 36) * (i + 1);
const old = fresh().importCode('AIL1-' + body1 + (sum1 % 36).toString(36).toUpperCase());
assert.ok(old, 'AIL1 code accepted');
assert.strictEqual(old.quiz.m1, 4); assert.strictEqual(old.quiz.m2, 0); assert.strictEqual(old.quiz.m3, undefined);

const body2 = 'F4' + '30' + '0X' + '51';
let sum2 = 0; for (let i = 0; i < body2.length; i++) sum2 += parseInt(body2[i] === 'X' ? '6' : body2[i], 36) * (i + 1);
const old2 = fresh().importCode('AIL2-' + body2 + (sum2 % 36).toString(36).toUpperCase());
assert.ok(old2, 'AIL2 code accepted'); assert.strictEqual(old2.quiz.m4, 1);

const body3 = 'F4' + '30' + '0X' + '51' + '22';
let sum3 = 0; for (let i = 0; i < body3.length; i++) sum3 += parseInt(body3[i] === 'X' ? '6' : body3[i], 36) * (i + 1);
const old3 = fresh().importCode('AIL3-' + body3 + (sum3 % 36).toString(36).toUpperCase());
assert.ok(old3, 'AIL3 code accepted'); assert.strictEqual(old3.quiz.m5, 2);


// ---- demos: 10 XP once each ----
P = fresh();
let d = P.completeDemo('tokens');
assert.strictEqual(P.xp(d), 10, 'first demo = 10 XP');
d = P.completeDemo('tokens');
assert.strictEqual(P.xp(d), 10, 'using the same demo again adds nothing');
d = P.completeDemo('nextword');
d = P.completeDemo('prompt');
assert.strictEqual(P.xp(d), 30, 'three demos = 30 XP');
assert.deepStrictEqual(d.demos, ['tokens', 'nextword', 'prompt']);
assert.strictEqual(P.xp(P.completeDemo('unknown')), 30, 'unknown demo ignored');

// progress codes still work with demos in state, and a restore keeps local demos
const demoCode = P.exportCode();
assert.ok(/^AIL6-([0-9A-F][0-5X]){6}[0-7][0-3][0-9A-F][0-9A-Z]$/.test(demoCode), 'code format with demos');
const withDemos = fresh();
withDemos.completeDemo('tokens');
withDemos.importCode(demoCode);
assert.deepStrictEqual(withDemos.load().demos, ['tokens', 'nextword', 'prompt'], 'restore brings the demos across and keeps local ones');
assert.strictEqual(withDemos.exportCode(), demoCode, 'demo round trip is identical');

// phone-friendly input: smart dash, no dash, text around the code
const phone = fresh();
assert.ok(phone.importCode('My code: ' + demoCode.replace('-', '\u2013') + ' thanks'), 'smart dash and surrounding text ok');
assert.ok(fresh().importCode(demoCode.replace('-', '')), 'missing dash ok');

// old saved data without a demos array still loads
{
  const st = memStorage();
  st.setItem('aiPortal.v1', JSON.stringify({ lessons: { m1: ['l1'] }, quiz: { m1: 4 } }));
  P = fresh(st);
  s = P.load();
  assert.strictEqual(P.xp(s), 50, 'old data without demos loads');
  assert.deepStrictEqual(s.demos, [], 'missing demos becomes an empty array');
}

// ---- load() cleans stored data ----
{
  const st = memStorage();
  st.setItem('aiPortal.v1', JSON.stringify({
    lessons: { m1: ['l1', 'l1', 'l2', 7, null], m9: ['l1'] },
    quiz: { m1: 9, m2: -3, m3: 4.9, m9: 5 },
    demos: ['tokens', 'tokens', 'bogus', 5]
  }));
  P = fresh(st);
  s = P.load();
  assert.deepStrictEqual(s.lessons, { m1: ['l1', 'l2'] },
    'string lesson ids kept once, unknown modules dropped');
  assert.deepStrictEqual(s.quiz, { m1: 5, m2: 0, m3: 4 }, 'quiz scores clamped to 0-5');
  assert.deepStrictEqual(s.demos, ['tokens'], 'known demo ids kept once');
  assert.strictEqual(P.xp(s), 20 + 50 + 0 + 40 + 10, 'cleaned state gives sane XP');
}

// wrongly-typed stored data is discarded instead of giving NaN XP
{
  const st = memStorage();
  st.setItem('aiPortal.v1', JSON.stringify({ lessons: { m1: 'abc' }, quiz: { m1: 'x' } }));
  P = fresh(st);
  assert.strictEqual(P.xp(P.load ? P.load() : { lessons: {}, quiz: {} }), 0, 'bad types give 0 XP, not NaN');
}
// ---- practice cards: 10 XP each, once per module, carried by AIL6 codes ----
{
  P = fresh();
  let ps = P.completePractice('m3');
  assert.strictEqual(P.xp(ps), 10, 'one practice card = 10 XP');
  assert.strictEqual(P.xp(P.completePractice('m3')), 10, 'finishing it again adds nothing');
  assert.strictEqual(P.xp(P.completePractice('m9')), 10, 'unknown module ignored');
  P.completePractice('m6');
  const pCode = P.exportCode();
  assert.ok(/^AIL6-.*24.$/.test(pCode), 'practice bits m3+m6 = 0x24: ' + pCode);
  const q = fresh(); q.completePractice('m1');
  q.importCode(pCode);
  assert.deepStrictEqual(q.load().practice.sort(), ['m1', 'm3', 'm6'], 'restore adds practice and keeps local');
  // an old AIL5 code (no practice digits) still restores
  const b5 = 'F5' + 'X'.repeat(0) + '0X0X0X0X0X' + '1';
  let s5 = 0; for (let i = 0; i < b5.length; i++) s5 += parseInt(b5[i] === 'X' ? '6' : b5[i], 36) * (i + 1);
  const old5 = 'AIL5-' + b5 + (s5 % 36).toString(36).toUpperCase();
  const r = fresh();
  assert.ok(r.importCode(old5), 'AIL5 code restores: ' + old5);
  assert.strictEqual(r.load().quiz.m1, 5);
  assert.deepStrictEqual(r.load().demos, ['tokens']);
  assert.deepStrictEqual(r.load().practice, [], 'AIL5 has no practice');
  // old saved data without a practice array still loads
  const st = memStorage(); st.setItem('aiPortal.v1', JSON.stringify({ lessons: {}, quiz: {}, demos: ['tokens'] }));
  assert.deepStrictEqual(fresh(st).load().practice, [], 'missing practice becomes an empty array');
}
console.log('progress: all tests passed');
