(() => {
  function feedback(element, message, correct) {
    element.className = 'quiz-feedback ' + (correct ? 'right' : 'wrong');
    element.textContent = message;
  }

  function initPrivacy(card) {
    const parts = card.querySelectorAll('button[aria-pressed]');
    const choice = card.querySelector('#privacy-choice');
    const detailFeedback = card.querySelector('#private-feedback');
    const choiceFeedback = card.querySelector('#privacy-choice-feedback');

    // Use the accessible pressed state to track which parts are selected.
    parts.forEach(part => {
      part.addEventListener('click', () => {
        const selected = part.getAttribute('aria-pressed') === 'true';
        part.setAttribute('aria-pressed', String(!selected));
      });
    });

    card.querySelector('#check-private').addEventListener('click', () => {
      const missed = [];
      const extra = [];
      parts.forEach(part => {
        const selected = part.getAttribute('aria-pressed') === 'true';
        const privateDetail = part.hasAttribute('data-private');
        if (privateDetail && !selected) missed.push(part.textContent);
        if (!privateDetail && selected) extra.push(part.textContent);
      });

      const notes = [];
      if (missed.length) notes.push('Also select: ' + missed.join(', ') + '.');
      if (extra.length) notes.push('Deselect these general details: ' + extra.join(', ') + '.');
      const correct = notes.length === 0;
      feedback(detailFeedback, correct
        ? 'You found the name, email, phone number, and medical detail. Try step 2.'
        : notes.join(' '), correct);
      if (correct) choice.hidden = false;
    });

    card.querySelector('#check-privacy-choice').addEventListener('click', () => {
      const answer = choice.querySelector('input:checked');
      if (!answer) {
        feedback(choiceFeedback, 'Choose an answer first.', false);
        return;
      }
      const correct = answer.value === 'general';
      const tryAgain = answer.value === 'name'
        ? 'The draft still has contact information and a medical detail. Try again.'
        : 'Disclosing AI use does not replace removing private information or following class rules. Try again.';
      feedback(choiceFeedback, correct ? 'Correct. See the safer prompt and example disclosure below.' : tryAgain, correct);
      if (correct) card.querySelector('#privacy-example').hidden = false;
    });
  }

  function averageScore(scores) {
    const total = scores.reduce((sum, score) => sum + score, 0);
    return total / 3;
  }

  function fixedAverageScore(scores) {
    const total = scores.reduce((sum, score) => sum + score, 0);
    return total / scores.length;
  }

  function initBug(card) {
    const cases = [
      { scores: [3, 6, 9], expected: 6 },
      { scores: [6, 12], expected: 9 },
      { scores: [0, 3, 3], expected: 2 }
    ];
    const status = card.querySelector('#bug-feedback');

    // Show the same functions we actually run.
    // toString() keeps the source's 2-space file indent on inner lines; remove it.
    const source = fn => fn.toString().replace(/\n  /g, '\n');
    card.querySelector('#bug-code').textContent = source(averageScore);
    card.querySelector('#fixed-code').textContent = source(fixedAverageScore);
    card.querySelectorAll('.quiz-options span').forEach((label, index) => {
      const test = cases[index];
      label.textContent = `Test ${index + 1} · Input [${test.scores.join(', ')}] · Expected ${test.expected}`;
    });

    // Run each case and rebuild the list so repeated clicks don't add duplicates.
    function runTests(fn, list) {
      const failures = [];
      list.textContent = '';
      cases.forEach((test, index) => {
        const actual = fn(test.scores);
        const passed = actual === test.expected;
        if (!passed) failures.push(index + 1);
        const item = document.createElement('li');
        feedback(item, `${passed ? 'Pass' : 'Fail'} · Expected ${test.expected}, got ${actual}.`, passed);
        list.appendChild(item);
      });
      return failures;
    }

    card.querySelector('#run-bug-tests').addEventListener('click', () => {
      const prediction = card.querySelector('input:checked');
      if (!prediction) {
        feedback(status, 'Predict which test will fail first.', false);
        return;
      }
      const failures = runTests(averageScore, card.querySelector('#original-results'));
      const fixedFailures = runTests(fixedAverageScore, card.querySelector('#fixed-results'));
      const correct = failures.includes(Number(prediction.value));
      const fixSummary = `${cases.length - fixedFailures.length} of ${cases.length} tests passed after the fix.`;
      const result = `Test ${failures.join(', ')} failed. ${fixSummary}`;
      card.querySelector('#bug-results').hidden = false;
      feedback(status, (correct ? 'Correct prediction. ' : 'Check your prediction. ') + result, correct);
    });
  }

  const privacy = document.getElementById('privacy-practice');
  if (privacy) initPrivacy(privacy);

  const bug = document.getElementById('bug-practice');
  if (bug) initBug(bug);
})();
