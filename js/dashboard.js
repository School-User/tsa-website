// Draws the home-page dashboard from saved progress (js/progress.js).
(function () {
  'use strict';
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
  // Badge icons: small line drawings (24x24 SVG paths) in the badge's colour.
  // lightbulb, wrench, shield with a tick, magnifier, building blocks, </>, star
  var BADGE_ICONS = {
    m1: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    m2: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    m3: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    m4: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    m5: '<rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/><rect x="8.5" y="4" width="7" height="7" rx="1"/>',
    m6: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    'reflective-learner': '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'
  };

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
    // Every lesson, quiz answer, practice card and demo: the most XP there is.
    var maxXp = MODULES.length * ((LESSONS_PER_MODULE + 5) * 10 + Progress.PRACTICE_XP) + Progress.DEMOS.length * Progress.DEMO_XP;
    var isMax = xp >= maxXp;
    if (isMax) into = 100; // a full bar, not the leftover of the last level
    document.getElementById('next').textContent = isMax ? 'All XP earned. Great work!' : (100 - into) + ' XP to next level';
    var bar = document.getElementById('xpbar');
    bar.setAttribute('aria-valuenow', into);
    bar.firstElementChild.style.width = into + '%';

    var core = document.getElementById('modules');
    var extra = document.getElementById('modules-extra');
    var resume = document.getElementById('resume');
    var upNext = null; // first module that is not finished, for the Start/Continue button
    core.textContent = '';
    extra.textContent = '';
    MODULES.forEach(function (m, index) {
      var read = (s.lessons[m.id] || []).length, score = s.quiz[m.id];
      // Modules 1-3 are the core brief (concepts, tools, ethics); 4-6 are extensions.
      var card = el('li', { 'class': 'card', style: '--unit: var(--u' + (index + 1) + ')' });
      // Mastery: lessons read are half, passing the quiz is the other half.
      var passed = score >= Progress.PASS;
      if (!upNext && !(read >= LESSONS_PER_MODULE && passed)) upNext = { m: m, n: index + 1, started: read > 0 || score !== undefined };
      var pct = Math.round((read / LESSONS_PER_MODULE) * 50 + (passed ? 50 : 0));
      var label = pct === 100 ? 'Mastered' : passed ? 'Proficient' : (read >= 2 || score !== undefined) ? 'Familiar' : read ? 'Attempted' : 'Not started';
      // The module's icon (the same drawing as its badge), in the module colour.
      var icon = el('div', { 'class': 'module-icon', 'aria-hidden': 'true' });
      icon.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + BADGE_ICONS[m.id] + '</svg>';
      card.appendChild(icon);
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

    if (!upNext) { resume.textContent = 'Review Module 1'; resume.href = MODULES[0].href; }
    else { resume.textContent = (upNext.started ? 'Continue' : 'Start') + ' Module ' + upNext.n; resume.href = upNext.m.href + resumeAt(s, upNext.m.id); }

    var earned = Progress.badges(s), shelf = document.getElementById('badges');
    shelf.textContent = '';
    Object.keys(BADGE_NAMES).forEach(function (id) {
      var has = earned.indexOf(id) !== -1;
      var li = el('li', { 'class': 'badge' + (has ? '' : ' locked') });
      var medal = el('div', { 'class': 'medal', 'aria-hidden': 'true' });
      // The icon strings are fixed in this file (never user input), so innerHTML is safe here.
      medal.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + BADGE_ICONS[id] + '</svg>';
      li.appendChild(medal);
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
    return fallbackCopy(text);
  }

  // The older way: select the text in a hidden textarea and run the copy command.
  function fallbackCopy(text) {
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
    var done = function () { msg.textContent = 'Copied. Paste it on your other device.'; };
    var failed = function () { msg.textContent = 'Could not copy automatically. Select the code and copy it yourself.'; };
    // If the modern clipboard refuses (permission), try the old textarea way before giving up.
    copyText(codeOut.textContent).then(done, function () {
      fallbackCopy(codeOut.textContent).then(done, failed);
    });
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
    if (window.confirm('Reset all progress? This clears XP, badges, lessons, quiz scores, practice cards, and demos.')) {
      Progress.reset(); render();
      codeOut.textContent = ''; copyBtn.hidden = true; // the old code no longer matches
    }
  });
  render();
})();
