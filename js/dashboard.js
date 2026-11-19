// Draws the home-page dashboard from saved progress (js/progress.js).
(function () {
  var MODULES = [
    { id: 'm1', href: 'module1.html', title: 'What AI actually is', blurb: 'AI vs. machine learning vs. generative AI, how models learn, and where they fail.' },
    { id: 'm2', href: 'module2.html', title: 'Using AI tools well', blurb: 'Pick the right tool, write good prompts, study smarter, and check answers.' },
    { id: 'm3', href: 'module3.html', title: 'Using AI ethically at school', blurb: 'Integrity, privacy, bias, and how to cite and disclose AI use.' },
    { id: 'm4', href: 'module4.html', title: 'Going deeper', blurb: 'Kinds of AI, risks experts name, prompting with examples, and why rules exist.' },
    { id: 'm5', href: 'module5.html', title: 'Building with AI responsibly', blurb: 'The 4Ds, learning to code with AI, checking AI-written code, and your own commitment.' },
    { id: 'm6', href: 'module6.html', title: 'Coding with AI: hands-on', blurb: 'Ask for code clearly, understand it, find bugs, and run tests and checks.' }
  ];
  var LESSONS_PER_MODULE = 4;
  var BADGE_NAMES = { m1: 'AI Basics', m2: 'Tool Pro', m3: 'Ethical Thinker', m4: 'Deep Diver', m5: 'Responsible Builder', m6: 'Code Checker', 'reflective-learner': 'Reflective Learner' };
  var BADGE_RULES = { m1: 'Pass the Module 1 quiz', m2: 'Pass the Module 2 quiz', m3: 'Pass the Module 3 quiz', m4: 'Pass the Module 4 quiz', m5: 'Pass the Module 5 quiz', m6: 'Pass the Module 6 quiz', 'reflective-learner': 'Earn all six module badges' };
  var BADGE_ICONS = { m1: '1', m2: '2', m3: '3', m4: '4', m5: '5', m6: '6', 'reflective-learner': '★' };

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Where Continue should land: the first lesson not yet read (#lesson-2),
  // the quiz once all four are read, or the top of a module not started.
  function resumeAt(s, id) {
    var read = s.lessons[id] || [];
    if (!read.length && s.quiz[id] === undefined) return '';
    for (var n = 1; n <= LESSONS_PER_MODULE; n++) if (read.indexOf('l' + n) === -1) return '#lesson-' + n;
    return s.quiz[id] >= Progress.PASS ? '' : '#quiz';
  }

  function render() {
    var s = Progress.load(), xp = Progress.xp(s), into = xp % 100;
    document.getElementById('level').textContent = Progress.level(s);
    document.getElementById('xp').textContent = xp;
    document.getElementById('next').textContent = (100 - into) + ' XP to next level';
    var bar = document.getElementById('xpbar');
    bar.setAttribute('aria-valuenow', into);
    bar.firstElementChild.style.width = into + '%';

    var core = document.getElementById('modules');
    var extra = document.getElementById('modules-extra');
    var resume = document.getElementById('resume');
    var next = null; // first module that is not finished, for the Start/Continue button
    core.textContent = '';
    extra.textContent = '';
    MODULES.forEach(function (m, index) {
      var read = (s.lessons[m.id] || []).length, score = s.quiz[m.id];
      // Modules 1-3 are the core brief (concepts, tools, ethics); 4-6 are extensions.
      var card = el('li', { 'class': 'card', id: 'module-card-' + m.id, style: '--unit: var(--u' + (index + 1) + ')' });
      // Mastery: lessons read are half, passing the quiz is the other half.
      var passed = score >= Progress.PASS;
      if (!next && !(read >= LESSONS_PER_MODULE && passed)) next = { m: m, n: index + 1, started: read || score !== undefined };
      var pct = Math.round((read / LESSONS_PER_MODULE) * 50 + (passed ? 50 : 0));
      var label = pct === 100 ? 'Mastered' : passed ? 'Proficient' : (read >= 2 || score !== undefined) ? 'Familiar' : read ? 'Attempted' : 'Not started';
      card.appendChild(el('p', { 'class': 'mastery' }, label));
      card.appendChild(el('h3', {}, m.title));
      card.appendChild(el('p', {}, m.blurb));
      var bar = el('div', { 'class': 'progress-bar', role: 'progressbar', 'aria-label': m.title + ' mastery',
        'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct) });
      bar.appendChild(el('span', { style: 'width:' + pct + '%' }));
      card.appendChild(bar);
      var status = 'Lessons read: ' + read + ' of ' + LESSONS_PER_MODULE + ' · ' +
        (score === undefined ? 'Quiz not taken' : 'Best quiz: ' + score + ' of 5');
      card.appendChild(el('p', { 'class': 'status' }, status));
      var verb = pct === 100 ? 'Review' : read || score !== undefined ? 'Continue' : 'Start';
      card.appendChild(el('a', { 'class': 'btn', href: m.href + resumeAt(s, m.id), 'aria-label': verb + ' Module ' + (index + 1) + ': ' + m.title }, verb));
      (index < 3 ? core : extra).appendChild(card);
    });

    if (!next) { resume.textContent = 'Review Module 1'; resume.href = MODULES[0].href; }
    else { resume.textContent = (next.started ? 'Continue' : 'Start') + ' Module ' + next.n; resume.href = next.m.href + resumeAt(s, next.m.id); }

    var earned = Progress.badges(s), shelf = document.getElementById('badges');
    shelf.textContent = '';
    Object.keys(BADGE_NAMES).forEach(function (id) {
      var has = earned.indexOf(id) !== -1;
      var li = el('li', { 'class': 'badge' + (has ? '' : ' locked') });
      li.appendChild(el('div', { 'class': 'medal', 'aria-hidden': 'true' }, BADGE_ICONS[id]));
      li.appendChild(el('span', {}, BADGE_NAMES[id]));
      li.appendChild(el('small', {}, has ? 'Earned' : BADGE_RULES[id]));
      li.appendChild(el('span', { 'class': 'sr-only' }, has ? ' (earned)' : ' (locked)'));
      shelf.appendChild(li);
    });
  }

  // ---- switch devices: show / copy / restore a progress code ----
  var msg = document.getElementById('code-msg');
  var codeOut = document.getElementById('code-out');
  var copyBtn = document.getElementById('copy-code');

  document.getElementById('show-code').addEventListener('click', function () {
    codeOut.textContent = Progress.exportCode();
    copyBtn.hidden = false;
    msg.textContent = '';
  });

  // Clipboard API needs https and permission; fall back to a hidden textarea.
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (ok, no) {
      var t = document.createElement('textarea');
      t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      var good = false;
      try { good = document.execCommand('copy'); } catch (e) { /* fall through */ }
      document.body.removeChild(t);
      good ? ok() : no();
    });
  }

  copyBtn.addEventListener('click', function () {
    copyText(codeOut.textContent).then(
      function () { msg.textContent = 'Copied. Paste it on your other device.'; },
      function () { msg.textContent = 'Could not copy automatically. Select the code and copy it yourself.'; });
  });

  document.getElementById('restore').addEventListener('click', function () {
    var input = document.getElementById('code-in');
    msg.classList.remove('err');
    var before = Progress.xp(Progress.load());
    var beforeState = JSON.stringify(Progress.load());
    if (Progress.importCode(input.value)) {
      var gained = Progress.xp(Progress.load()) - before;
      // A quiz scored 0 adds no XP but is still new progress, so compare the whole state too.
      var changed = JSON.stringify(Progress.load()) !== beforeState;
      input.value = '';
      render();
      msg.textContent = gained > 0 ? 'Progress restored. Added ' + gained + ' XP from that code.'
        : changed ? 'Progress restored.'
        : 'That code is valid, but this device already has all of that progress, so nothing changed. Restore it on the other device, the one that is missing progress.';
    } else {
      msg.textContent = 'That code does not look right. Check for typos and try again.';
      msg.classList.add('err');
    }
  });

  document.getElementById('reset').addEventListener('click', function () {
    if (window.confirm('Reset all progress? This clears XP, badges, lessons, quiz scores, and demos.')) {
      Progress.reset(); render();
      codeOut.textContent = ''; copyBtn.hidden = true; // the old code no longer matches
    }
  });
  render();
})();
