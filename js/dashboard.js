// Draws the home-page dashboard from saved progress (js/progress.js).
(function () {
  var MODULES = [
    { id: 'm1', href: 'module1.html', title: 'What AI actually is', blurb: 'AI vs. machine learning vs. generative AI, how models learn, and where they fail.' },
    { id: 'm2', href: 'module2.html', title: 'Using AI tools well', blurb: 'Pick the right tool, write good prompts, study smarter, and check answers.' },
    { id: 'm3', href: 'module3.html', title: 'Using AI ethically at school', blurb: 'Integrity, privacy, bias, and how to cite and disclose AI use.' },
    { id: 'm4', href: 'module4.html', title: 'Going deeper', blurb: 'Kinds of AI, risks experts list, prompting with examples, and why rules exist.' },
    { id: 'm5', href: 'module5.html', title: 'Building with AI responsibly', blurb: 'The 4Ds, learning to code with AI, checking AI-written code, and your own commitment.' },
    { id: 'm6', href: 'module6.html', title: 'Coding with AI, hands on', blurb: 'Ask for code clearly, understand it, find bugs, and run tests and checks.' }
  ];
  var LESSONS_PER_MODULE = 4;
  var BADGE_NAMES = { m1: 'AI Basics', m2: 'Tool Pro', m3: 'Ethical Thinker', m4: 'Deep Diver', m5: 'Responsible Builder', m6: 'Code Checker', 'reflective-learner': 'Reflective Learner' };
  var BADGE_ICONS = { m1: '1', m2: '2', m3: '3', m4: '4', m5: '5', m6: '6', 'reflective-learner': '★' };

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function render() {
    var s = Progress.load(), xp = Progress.xp(s), into = xp % 100;
    document.getElementById('level').textContent = Progress.level(s);
    document.getElementById('xp').textContent = xp;
    document.getElementById('next').textContent = (100 - into) + ' XP to next level';
    var bar = document.getElementById('xpbar');
    bar.setAttribute('aria-valuenow', into);
    bar.firstElementChild.style.width = into + '%';

    var list = document.getElementById('modules');
    list.textContent = '';
    MODULES.forEach(function (m) {
      var read = (s.lessons[m.id] || []).length, score = s.quiz[m.id];
      var card = el('li', { 'class': 'card' });
      card.appendChild(el('h3', {}, m.title));
      card.appendChild(el('p', {}, m.blurb));
      var status = 'Lessons read: ' + read + ' of ' + LESSONS_PER_MODULE + ' · ' +
        (score === undefined ? 'Quiz not taken' : 'Best quiz: ' + score + ' of 5');
      card.appendChild(el('p', {}, status));
      card.appendChild(el('a', { 'class': 'btn', href: m.href }, read || score !== undefined ? 'Continue' : 'Start'));
      list.appendChild(card);
    });

    var earned = Progress.badges(s), shelf = document.getElementById('badges');
    shelf.textContent = '';
    Object.keys(BADGE_NAMES).forEach(function (id) {
      var has = earned.indexOf(id) !== -1;
      var li = el('li', { 'class': 'badge' + (has ? '' : ' locked') });
      li.appendChild(el('div', { 'class': 'medal', 'aria-hidden': 'true' }, BADGE_ICONS[id]));
      li.appendChild(el('span', {}, BADGE_NAMES[id] + (has ? ' (earned)' : ' (locked)')));
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

  copyBtn.addEventListener('click', function () {
    var done = function () { msg.textContent = 'Copied. Paste it on your other device.'; };
    var fail = function () { msg.textContent = 'Could not copy automatically. Select the code and copy it by hand.'; };
    if (navigator.clipboard) navigator.clipboard.writeText(codeOut.textContent).then(done, fail); else fail();
  });

  document.getElementById('restore').addEventListener('click', function () {
    var input = document.getElementById('code-in');
    if (Progress.importCode(input.value)) {
      input.value = '';
      render();
      msg.textContent = 'Progress restored.';
    } else {
      msg.textContent = 'That code does not look right. Check for typos and try again.';
    }
  });

  document.getElementById('reset').addEventListener('click', function () {
    if (window.confirm('Reset all XP and badges?')) { Progress.reset(); render(); }
  });
  render();
})();
