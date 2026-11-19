// Demos page: three small, offline illustrations of how AI handles text.
// Everything runs in the browser. No network, no libraries: only the demo ids
// are saved, by js/progress.js, so the page can award 10 XP per demo.
(function () {
  'use strict';

  var Progress = window.Progress || null;
  var DEMO_XP = Progress && Progress.DEMO_XP ? Progress.DEMO_XP : 10;
  var awarded = {};

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Redraw the demo XP panel in the same style as the home dashboard.
  function renderXp() {
    var levelEl = document.getElementById('demo-level');
    if (!Progress || !levelEl) return;
    var s = Progress.load();
    var total = Progress.xp(s);
    var into = total % 100;
    var done = (s.demos || []).length;
    levelEl.textContent = Progress.level(s);
    document.getElementById('demo-xp').textContent = total;
    document.getElementById('demo-next').textContent = (100 - into) + ' XP to next level';
    var bar = document.getElementById('demo-xpbar');
    bar.setAttribute('aria-valuenow', into);
    bar.firstElementChild.style.width = into + '%';
    document.getElementById('demo-xp-detail').textContent =
      'Demos tried: ' + done + ' of 3 · ' + (done * DEMO_XP) + ' XP from demos.';
  }

  // First use of a demo earns its 10 XP once; later uses change nothing.
  function award(demoId) {
    if (!Progress || awarded[demoId]) return;
    awarded[demoId] = true;
    Progress.completeDemo(demoId);
    renderXp();
  }

  renderXp();

  /* ---------------------------------------------------------------
     1. Tokenizer: rough rule-based split, not a real tokenizer.
     --------------------------------------------------------------- */

  var TOKEN_RE = /[A-Za-z0-9'\u2019]+|[^\sA-Za-z0-9'\u2019]/g;
  // Words up to WORD_MAX letters stay whole. Longer words lose a common
  // ending first (learn|ing, pattern|s), the way real tokenizers often split,
  // and anything still long is cut into PIECE_MAX-letter chunks.
  var WORD_MAX = 6;
  var PIECE_MAX = 5;
  var ENDINGS = ['ation', 'ing', 'ers', 'est', 'ed', 'er', 'ly', 's'];

  function splitWord(word) {
    if (word.length <= WORD_MAX) return [{ text: word, kind: 'word' }];
    var stem = word, end = '';
    for (var e = 0; e < ENDINGS.length; e++) {
      var cut = word.length - ENDINGS[e].length;
      if (cut >= 3 && word.toLowerCase().slice(cut) === ENDINGS[e] && !/(ss|is|us)$/i.test(word)) { stem = word.slice(0, cut); end = word.slice(cut); break; }
    }
    var out = [];
    if (stem.length <= WORD_MAX + 1) out.push({ text: stem, kind: 'piece' });
    else for (var i = 0; i < stem.length; i += PIECE_MAX) out.push({ text: stem.slice(i, i + PIECE_MAX), kind: 'piece' });
    if (end) out.push({ text: end, kind: 'piece' });
    return out;
  }

  function roughTokens(text) {
    var raw = text.match(TOKEN_RE) || [];
    var tokens = [];
    raw.forEach(function (piece) {
      if (/^[A-Za-z0-9'\u2019]+$/.test(piece)) tokens.push.apply(tokens, splitWord(piece));
      else tokens.push({ text: piece, kind: 'punct' });
    });
    return tokens;
  }

  var tokenInput = document.getElementById('token-input');
  var chipList = document.getElementById('token-chips');
  var tokenCount = document.getElementById('token-count');

  function renderTokens() {
    var tokens = roughTokens(tokenInput.value);
    var frag = document.createDocumentFragment();

    tokens.forEach(function (token) {
      frag.appendChild(el('li', 'chip chip--' + token.kind, token.text));
    });
    chipList.textContent = '';
    chipList.appendChild(frag);

    tokenCount.textContent = tokens.length === 0
      ? 'No tokens yet. Type something in the box above.'
      : tokens.length + (tokens.length === 1 ? ' token' : ' tokens') + ' so far.';
  }

  tokenInput.addEventListener('input', function () {
    renderTokens();
    award('tokens');
  });
  renderTokens();

  /* ---------------------------------------------------------------
     2. Next-word predictor: a bigram model built from one paragraph.
     --------------------------------------------------------------- */

  var TRAINING = 'At school, students ask AI to explain a hard idea, and AI answers in plain words. ' +
    'Students check the answer, because AI can make mistakes. ' +
    'Teachers remind students to cite sources and to write their own work. ' +
    'When students ask a clear question, AI can help them learn faster. ' +
    'When students ask a vague question, AI gives a vague answer. ' +
    'Teachers use AI to plan lessons, and students use AI to practice. ' +
    'AI is a tool for learning, not a replacement for thinking.';

  var model = Object.create(null);   // word -> { nextWord: count }

  TRAINING.split(/[.!?]+/).forEach(function (sentence) {
    var words = sentence.toLowerCase().match(/[a-z']+/g) || [];
    for (var i = 0; i < words.length - 1; i++) {
      var next = model[words[i]] || (model[words[i]] = Object.create(null));
      next[words[i + 1]] = (next[words[i + 1]] || 0) + 1;
    }
  });

  var seedInput = document.getElementById('seed-word');
  var predictions = document.getElementById('predictions');
  var generated = document.getElementById('generated');

  function cleanWord(value) {
    var words = String(value).toLowerCase().match(/[a-z']+/g);
    return words ? words[words.length - 1] : '';
  }

  function topNext(word) {
    var next = model[word];
    if (!next) return [];
    return Object.keys(next).map(function (w) {
      return { word: w, count: next[w] };
    }).sort(function (a, b) {
      return b.count - a.count || a.word.localeCompare(b.word);
    }).slice(0, 3);
  }

  function someKnownWords(limit) {
    var known = ['students', 'teachers', 'ai', 'ask', 'school', 'thinking'];
    return known.filter(function (w) { return model[w]; }).slice(0, limit);
  }

  function renderPredictions() {
    var word = cleanWord(seedInput.value);
    var rows = topNext(word);
    predictions.textContent = '';

    if (!word) {
      predictions.appendChild(el('p', 'demo-empty', 'Type a word above to see what probably comes next.'));
      return;
    }
    if (rows.length === 0) {
      predictions.appendChild(el('p', 'demo-empty',
        '“' + word + '” is not in the mini training paragraph. Try ' +
        someKnownWords(4).join(', ') + '.'));
      return;
    }

    var max = rows[0].count;
    rows.forEach(function (row) {
      var line = el('div', 'pred');
      line.appendChild(el('span', 'pred-word', row.word));

      var bar = el('span', 'pred-bar');
      bar.setAttribute('aria-hidden', 'true');
      var fill = el('span');
      fill.style.width = Math.round((row.count / max) * 100) + '%';
      bar.appendChild(fill);
      line.appendChild(bar);

      line.appendChild(el('span', 'pred-count',
        row.count + (row.count === 1 ? ' time' : ' times')));
      predictions.appendChild(line);
    });
  }

  function weightedPick(word) {
    var next = model[word];
    var total = 0;
    var key;
    for (key in next) total += next[key];

    var roll = Math.random() * total;
    var running = 0;
    for (key in next) {
      running += next[key];
      if (roll < running) return key;
    }
    return Object.keys(next)[0];
  }

  // Some words end a sentence and have no next word, so the run restarts from
  // another word (marked with …) until it has produced the requested count.
  function generateChain(start, count) {
    var output = [start];
    var produced = 1;
    var current = start;
    var known = Object.keys(model);

    while (produced < count) {
      if (!model[current]) {
        output.push('…');
        current = known[Math.floor(Math.random() * known.length)];
      } else {
        current = weightedPick(current);
      }
      output.push(current);
      produced++;
    }
    return output;
  }

  document.getElementById('generate').addEventListener('click', function () {
    award('nextword');
    var typed = cleanWord(seedInput.value);
    var start = model[typed] ? typed : null;
    var note = '';

    if (!start) {
      var known = Object.keys(model);
      start = known[Math.floor(Math.random() * known.length)];
      note = typed
        ? '“' + typed + '” is not in the mini training text, so this run starts from “' + start + '” instead: '
        : 'This run starts from “' + start + '”: ';
    }

    var words = generateChain(start, 8);
    generated.textContent = note + '“' + words.join(' ') + '”';
  });

  seedInput.addEventListener('input', function () {
    renderPredictions();
    award('nextword');
  });
  renderPredictions();

  Array.prototype.forEach.call(document.querySelectorAll('[data-seed]'), function (button) {
    button.addEventListener('click', function () {
      seedInput.value = button.getAttribute('data-seed');
      renderPredictions();
      award('nextword');
      seedInput.focus();
    });
  });

  /* ---------------------------------------------------------------
     3. Prompt builder: live preview plus a completeness checklist.
     --------------------------------------------------------------- */

  var PARTS = [
    { key: 'role', input: 'p-role', label: 'Role', missing: 'say who the AI should act as' },
    { key: 'task', input: 'p-task', label: 'Task', missing: 'say what you want done' },
    { key: 'context', input: 'p-context', label: 'Context', missing: 'give the details that matter' },
    { key: 'format', input: 'p-format', label: 'Format', missing: 'say what the answer should look like' }
  ];

  var preview = document.getElementById('prompt-preview');
  var status = document.getElementById('prompt-status');
  var checklist = document.getElementById('prompt-checklist');
  var EMPTY_PREVIEW = 'Your prompt will appear here as you fill in the fields.';

  PARTS.forEach(function (part) {
    part.field = document.getElementById(part.input);
    part.item = el('li');
    checklist.appendChild(part.item);
    part.field.addEventListener('input', function () {
      updatePrompt();
      award('prompt');
    });
  });

  function updatePrompt() {
    var lines = [];
    var missing = [];

    PARTS.forEach(function (part) {
      var value = part.field.value.trim().replace(/\s+/g, ' ');
      if (value) {
        lines.push(part.label + ': ' + value);
        part.item.className = 'done';
        part.item.textContent = part.label + ': added';
      } else {
        missing.push(part.label);
        part.item.className = '';
        part.item.textContent = part.label + ': missing — ' + part.missing;
      }
    });

    preview.textContent = lines.length ? lines.join('\n\n') : EMPTY_PREVIEW;
    preview.classList.toggle('is-empty', lines.length === 0);

    var filled = PARTS.length - missing.length;
    var message = filled === PARTS.length
      ? 'All 4 parts are filled in. The AI knows who to be, what to do, what to know, and what the answer should look like.'
      : filled + ' of 4 parts filled in. Missing: ' + missing.join(', ') + '.';
    if (status.textContent !== message) status.textContent = message;
  }

  updatePrompt();
})();
