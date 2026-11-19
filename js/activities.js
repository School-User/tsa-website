(function () {
  'use strict';

  function feedback(element, message, correct) {
    element.className = 'quiz-feedback ' + (correct ? 'right' : 'wrong');
    // Bold the opening sentence or test result.
    // The bold part ends after the first "." or "·" that has a space after it.
    var cut = message.search(/[.·] /);
    if (cut === -1) cut = message.length; else cut = cut + 1;
    var lead = document.createElement('strong');
    lead.textContent = message.slice(0, cut);
    element.textContent = '';
    element.appendChild(lead);
    element.appendChild(document.createTextNode(message.slice(cut)));
  }

  // Finishing a practice card gives 10 XP once (saved by js/progress.js).
  // The module id comes from the current module pill, e.g. module3.html -> m3.
  function finished(card) {
    var current = document.querySelector('.module-nav [aria-current]');
    if (!current || !window.Progress) return;
    var moduleId = 'm' + current.getAttribute('href').match(/\d/)[0];
    var before = Progress.xp(Progress.load());
    var after = Progress.xp(Progress.completePractice(moduleId));
    if (after > before && !card.querySelector('.practice-xp')) {
      var note = document.createElement('p');
      note.className = 'practice-xp';
      note.textContent = '+' + (after - before) + ' XP for finishing this practice.';
      card.appendChild(note);
    }
  }

  // Both sorting cards keep each answer and reason beside its select in HTML.
  function initSort(card) {
    var selects = card.querySelectorAll('select');

    function checkAnswers() {
      var allRight = true;
      for (var i = 0; i < selects.length; i++) {
        var select = selects[i];
        var status = document.getElementById(select.getAttribute('aria-describedby'));
        var answer = select.dataset.answer;
        var correct = select.value === answer;
        var message = (correct ? 'Correct. ' : 'Try again. ') + answer + '. ' + select.dataset.reason;
        feedback(status, select.value ? message : 'Choose an answer first.', correct);
        if (!correct) allRight = false;
      }
      if (allRight) finished(card);
    }

    card.querySelector('button').addEventListener('click', checkAnswers);
  }

  function initPrompt(card) {
    var rewrite = card.querySelector('#prompt-rewrite');
    var status = card.querySelector('.quiz-feedback');
    var example = card.querySelector('#prompt-example');
    var boxes = card.querySelectorAll('input');
    // The hints follow the checkbox order and look for common words or phrases.
    var hints = [
      /\b(act as|you are|pretend to be|tutor|teacher)\b/i,
      /\b(explain|compare|describe|summarize|contrast|define)\b/i,
      /\b(studying|learning|grade|biology class|already know|test|quiz)\b/i,
      /\b(paragraphs?|sentences?|lists?|bullets?|table|comparison)\b/i
    ];

    example.querySelector('p').textContent = document.getElementById('strong-prompt').textContent;

    function checkPrompt() {
      var missed = [];
      var found = [];
      for (var i = 0; i < boxes.length; i++) {
        if (!boxes[i].checked) missed.push(boxes[i].value);
        if (hints[i].test(rewrite.value)) found.push(boxes[i].value);
      }

      // Part 1: did they spot that all four parts were missing or vague?
      var message = missed.length === 0
        ? 'Right: all four parts were missing or too vague.'
        : 'Look again: ' + missed.join(', ') + (missed.length === 1 ? ' is' : ' are') + ' also missing or too vague in “Tell me about cells.”';
      // Part 2: which parts does the rewrite seem to include (simple keyword hints)?
      var notFound = [];
      for (var j = 0; j < boxes.length; j++) if (found.indexOf(boxes[j].value) === -1) notFound.push(boxes[j].value);
      message += notFound.length === 0
        ? ' Your rewrite seems to include all four parts.'
        : ' Your rewrite may still need: ' + notFound.join(', ') + '.';
      message += ' Compare it with the lesson example below.';
      example.hidden = false;
      feedback(status, message, missed.length === 0 && notFound.length === 0);
      if (missed.length === 0 && notFound.length === 0) finished(card);
    }

    card.querySelector('button').addEventListener('click', checkPrompt);
  }

  function initFlashcards(card) {
    var status = card.querySelector('.quiz-feedback');

    function checkPrompt() {
      var answer = card.querySelector('input:checked');
      if (!answer) {
        feedback(status, 'Choose a prompt first.', false);
        return;
      }

      var correct = answer.value === 'pattern';
      var message = correct ? 'Correct. ' : 'Try again. ';
      feedback(status, message + 'Use the two sample cards to show the pattern, then ask for new cards with a term and a one-line definition.', correct);
      if (correct) finished(card);
    }

    card.querySelector('button').addEventListener('click', checkPrompt);
  }

  function initPrivacy(card) {
    var parts = card.querySelectorAll('button[aria-pressed]');
    var choice = card.querySelector('#privacy-choice');
    var detailFeedback = card.querySelector('#private-feedback');
    var choiceFeedback = card.querySelector('#privacy-choice-feedback');

    // Use the accessible pressed state to track which parts are selected.
    function togglePart(event) {
      var part = event.currentTarget;
      var selected = part.getAttribute('aria-pressed') === 'true';
      part.setAttribute('aria-pressed', String(!selected));
    }

    function checkDetails() {
      var missed = [];
      var extra = [];
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        var selected = part.getAttribute('aria-pressed') === 'true';
        var privateDetail = part.hasAttribute('data-private');
        if (privateDetail && !selected) missed.push(part.textContent);
        if (!privateDetail && selected) extra.push(part.textContent);
      }

      var notes = [];
      if (missed.length) notes.push('Also select: ' + missed.join(', ') + '.');
      if (extra.length) notes.push('Deselect these general details: ' + extra.join(', ') + '.');
      var correct = notes.length === 0;
      feedback(detailFeedback, correct
        ? 'You found the name, email, phone number, and medical detail. Try step 2.'
        : notes.join(' '), correct);
      choice.hidden = !correct; // hide step 2 again if step 1 is no longer right
    }

    function checkChoice() {
      var answer = choice.querySelector('input:checked');
      if (!answer) {
        feedback(choiceFeedback, 'Choose an answer first.', false);
        return;
      }
      var correct = answer.value === 'general';
      var tryAgain = answer.value === 'name'
        ? 'The draft still has contact information and a medical detail. Try again.'
        : 'Remove private information and follow class rules before disclosing AI use. Try again.';
      feedback(choiceFeedback, correct ? 'Correct. See the safer prompt and example disclosure below.' : tryAgain, correct);
      if (correct) finished(card);
      card.querySelector('#privacy-example').hidden = !correct;
    }

    for (var i = 0; i < parts.length; i++) {
      parts[i].addEventListener('click', togglePart);
    }
    card.querySelector('#check-private').addEventListener('click', checkDetails);
    card.querySelector('#check-privacy-choice').addEventListener('click', checkChoice);
  }

  function averageScore(scores) {
    var total = 0;
    for (var i = 0; i < scores.length; i++) {
      total += scores[i];
    }
    return total / 3;
  }

  function fixedAverageScore(scores) {
    var total = 0;
    for (var i = 0; i < scores.length; i++) {
      total += scores[i];
    }
    return total / scores.length;
  }

  function initBug(card) {
    var cases = [
      { scores: [3, 6, 9], expected: 6 },
      { scores: [6, 12], expected: 9 },
      { scores: [0, 3, 3], expected: 2 }
    ];
    var status = card.querySelector('#bug-feedback');
    var labels = card.querySelectorAll('.quiz-options span');

    // Show the functions that run, with the file's outer indent removed.
    function source(fn) {
      return fn.toString().replace(/\n  /g, '\n');
    }

    // Rebuild the list on every run to keep each test result unique.
    function runTests(fn, list) {
      var failures = [];
      list.textContent = '';
      for (var i = 0; i < cases.length; i++) {
        var test = cases[i];
        var actual = fn(test.scores);
        var passed = actual === test.expected;
        if (!passed) failures.push(i + 1);
        var item = document.createElement('li');
        feedback(item, (passed ? 'Pass' : 'Fail') + ' · Expected ' + test.expected + ', got ' + actual + '.', passed);
        list.appendChild(item);
      }
      return failures;
    }

    function checkPrediction() {
      var prediction = card.querySelector('input:checked');
      if (!prediction) {
        feedback(status, 'Predict which test will fail first.', false);
        return;
      }
      var failures = runTests(averageScore, card.querySelector('#original-results'));
      var fixedFailures = runTests(fixedAverageScore, card.querySelector('#fixed-results'));
      var correct = failures.includes(Number(prediction.value));
      var result = 'Test ' + failures.join(', ') + ' failed. ' +
        (cases.length - fixedFailures.length) + ' of ' + cases.length + ' tests passed after the fix.';
      card.querySelector('#bug-results').hidden = false;
      feedback(status, (correct ? 'Correct prediction. ' : 'Check your prediction. ') + result, correct);
      finished(card); // running the tests and reading the results finishes this one
    }

    card.querySelector('#bug-code').textContent = source(averageScore);
    card.querySelector('#fixed-code').textContent = source(fixedAverageScore);
    for (var i = 0; i < labels.length; i++) {
      var test = cases[i];
      labels[i].textContent = 'Test ' + (i + 1) + ' · Input [' + test.scores.join(', ') + '] · Expected ' + test.expected;
    }
    card.querySelector('#run-bug-tests').addEventListener('click', checkPrediction);
  }

  function initActivity(id, init) {
    var card = document.getElementById(id);
    if (card) init(card);
  }

  initActivity('sort-practice', initSort);
  initActivity('prompt-practice', initPrompt);
  initActivity('privacy-practice', initPrivacy);
  initActivity('flashcard-practice', initFlashcards);
  initActivity('skills-practice', initSort);
  initActivity('bug-practice', initBug);
})();
