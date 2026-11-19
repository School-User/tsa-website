// Quiz engine for the AI portal. Renders quiz data with accessible markup,
// grades answers locally, and stores the best score in window.Progress.
(function (root) {
  'use strict';

  var mountCount = 0; // keeps radio groups unique when two quizzes share a page

  // Progress may be absent while a page is opened on its own.
  function store() {
    return root.Progress || null;
  }

  // Create an element with an optional class and text.
  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Show or hide with the hidden attribute and inline display, so a rule such
  // as .btn { display:inline-block } cannot leave a hidden button visible.
  function show(node, visible) {
    node.hidden = !visible;
    node.style.display = visible ? '' : 'none';
  }

  // Checked option index for one question, or -1 when none is checked.
  function answerOf(fieldset) {
    var inputs = fieldset.querySelectorAll('input[type="radio"]');
    var i;
    for (i = 0; i < inputs.length; i++) {
      if (inputs[i].checked) return Number(inputs[i].value);
    }
    return -1;
  }

  // Build a question fieldset: legend, labeled radios, empty feedback.
  function buildQuestion(question, groupName) {
    var fieldset = document.createElement('fieldset');
    fieldset.className = 'quiz-q';

    var legend = document.createElement('legend');
    legend.textContent = question.q;
    fieldset.appendChild(legend);

    var list = make('div', 'quiz-options');
    (question.options || []).forEach(function (text, optionIndex) {
      var id = groupName + '-o' + optionIndex;
      var label = document.createElement('label');
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = groupName;
      input.value = String(optionIndex);
      input.id = id;
      label.htmlFor = id;
      label.appendChild(input);
      label.appendChild(document.createTextNode(' ' + text));
      list.appendChild(label);
    });
    fieldset.appendChild(list);

    var feedback = make('p', 'quiz-feedback');
    show(feedback, false);
    fieldset.appendChild(feedback);

    return fieldset;
  }

  // Show whether one answer was right, plus the question's explanation.
  function fillFeedback(feedback, question, chosen) {
    var text;
    if (chosen === question.answer) {
      text = 'Correct. ';
    } else {
      text = 'Not quite. ';
      if (question.options && question.options[question.answer] !== undefined) {
        var right = question.options[question.answer];
        // Add a period only if the answer doesn't already end a sentence ("…paragraphs.”).
        text += 'The correct answer is: ' + right + (/[.!?]["”’]?$/.test(right) ? ' ' : '. ');
      }
    }
    text += question.why || '';
    feedback.textContent = text;
    feedback.className = 'quiz-feedback ' + (chosen === question.answer ? 'right' : 'wrong');
    show(feedback, true);
  }

  // Render and wire one quiz inside a container.
  function mount(container, moduleId, questions) {
    if (!container || !Array.isArray(questions) || questions.length === 0) return;

    while (container.firstChild) container.removeChild(container.firstChild);

    var quiz = make('div', 'quiz');
    var quizId = 'quiz-' + (++mountCount);
    var fieldsets = [];
    var feedbacks = [];
    var inputs = [];

    questions.forEach(function (question, index) {
      var fieldset = buildQuestion(question, quizId + '-q' + index);
      quiz.appendChild(fieldset);
      fieldsets.push(fieldset);
      feedbacks.push(fieldset.querySelector('.quiz-feedback'));
      Array.prototype.push.apply(inputs, fieldset.querySelectorAll('input[type="radio"]'));
    });

    var alertBox = make('p');
    alertBox.setAttribute('role', 'alert');
    show(alertBox, false);
    quiz.appendChild(alertBox);

    var submit = make('button', 'btn', 'Submit');
    submit.type = 'button';
    quiz.appendChild(submit);

    var result = make('div', 'quiz-result');
    result.setAttribute('aria-live', 'polite');
    quiz.appendChild(result);

    var retry = make('button', 'btn', 'Retry');
    retry.type = 'button';
    show(retry, false);
    quiz.appendChild(retry);

    // First unanswered question, or null when every one has an answer.
    function firstUnanswered() {
      var i;
      for (i = 0; i < fieldsets.length; i++) {
        if (answerOf(fieldsets[i]) === -1) return fieldsets[i];
      }
      return null;
    }

    // Disable or re-enable every radio after grading or retrying.
    function lock(disabled) {
      inputs.forEach(function (input) { input.disabled = disabled; });
    }

    // What to do after a quiz: read the lessons still unread, or go to the
    // next module once this one is mastered (all lessons read + quiz passed).
    function nextStep(passed) {
      var progress = store(), read = 0, total = document.querySelectorAll('button[data-lesson]').length;
      try { read = (progress.load().lessons[moduleId] || []).length; } catch (e) { /* no saved progress */ }
      var n = parseInt(moduleId.slice(1), 10);
      var p = make('p', 'quiz-next');
      if (passed && read < total) {
        p.textContent = 'Next: mark ' + (total - read === 1 ? 'the last lesson' : 'the other ' + (total - read) + ' lessons') + ' as read to master this module.';
        return p;
      }
      var link = make('a', passed ? 'btn' : 'btn ghost', passed ? (n < 6 ? 'Next: Module ' + (n + 1) : 'Back to your dashboard') : 'Back to your dashboard');
      link.href = passed && n < 6 ? 'module' + (n + 1) + '.html' : 'index.html';
      if (passed) p.appendChild(make('span', '', 'Module mastered. '));
      p.appendChild(link);
      return p;
    }

    // Score the quiz, reveal feedback, and store the best score.
    function grade() {
      var correct = 0;
      var progress = store();
      var pass = progress && progress.PASS !== undefined ? progress.PASS : 4;
      var i;

      for (i = 0; i < questions.length; i++) {
        var chosen = answerOf(fieldsets[i]);
        if (chosen === questions[i].answer) correct++;
        fillFeedback(feedbacks[i], questions[i], chosen);
        // Outline the right option green, and a wrong pick red.
        var labels = fieldsets[i].querySelectorAll('label');
        if (labels[questions[i].answer]) labels[questions[i].answer].classList.add('is-correct');
        if (chosen !== questions[i].answer && labels[chosen]) labels[chosen].classList.add('is-wrong');
      }

      if (progress && typeof progress.submitQuiz === 'function') {
        progress.submitQuiz(moduleId, correct, questions.length);
      }

      result.textContent = '';
      result.className = 'quiz-result ' + (correct >= pass ? 'passed' : 'failed');
      result.appendChild(make('p', 'quiz-score', correct + ' of ' + questions.length + ' correct'));
      result.appendChild(make('p', '', correct >= pass
        ? 'Passed. You earned this module’s badge.'
        : 'Not passed yet. The passing score is ' + pass + ' of ' + questions.length + '. Check the feedback above, then retry.'));
      result.appendChild(make('p', 'muted',
        'This score is worth ' + (correct * 10) + ' quiz XP (10 per correct answer). Only your best score counts, so a retake adds XP only if it beats your earlier best.'));
      result.appendChild(nextStep(correct >= pass));

      alertBox.textContent = '';
      show(alertBox, false);
      show(submit, false);
      show(retry, true);
      lock(true);
      retry.focus();
    }

    // Block grading until every question is answered.
    submit.addEventListener('click', function () {
      var missing = firstUnanswered();
      if (missing) {
        alertBox.textContent = 'Please answer every question before submitting.';
        show(alertBox, true);
        var firstInput = missing.querySelector('input[type="radio"]');
        if (firstInput) firstInput.focus();
        return;
      }
      grade();
    });

    // Clear everything so the quiz can be taken again.
    retry.addEventListener('click', function () {
      var i;
      for (i = 0; i < fieldsets.length; i++) {
        feedbacks[i].textContent = '';
        show(feedbacks[i], false);
        Array.prototype.forEach.call(fieldsets[i].querySelectorAll('label'), function (label) {
          label.classList.remove('is-correct', 'is-wrong');
        });
      }
      inputs.forEach(function (input) {
        input.checked = false;
        input.disabled = false;
      });
      result.textContent = '';
      alertBox.textContent = '';
      show(alertBox, false);
      show(retry, false);
      show(submit, true);
      if (inputs.length) inputs[0].focus();
    });

    container.appendChild(quiz);
  }

  // Restore and wire every <button data-lesson="..."> for a module.
  function initLessons(moduleId) {
    var progress = store();
    var buttons;
    var completed = [];

    if (!progress || typeof progress.load !== 'function' ||
        typeof progress.completeLesson !== 'function') return;

    try {
      var state = progress.load();
      var list = state && state.lessons ? state.lessons[moduleId] : null;
      if (Array.isArray(list)) completed = list;
    } catch (e) { /* no readable progress: nothing is complete yet */ }

    // Mark one lesson button done and stop it being clicked again.
    function markRead(button) {
      button.disabled = true;
      button.textContent = 'Read ✓';
    }

    buttons = document.querySelectorAll('button[data-lesson]');
    Array.prototype.forEach.call(buttons, function (button) {
      var lessonId = button.getAttribute('data-lesson');
      if (!lessonId) return;

      if (completed.indexOf(lessonId) !== -1) markRead(button);

      button.addEventListener('click', function () {
        if (button.disabled) return;
        progress.completeLesson(moduleId, lessonId);
        markRead(button);
      });
    });
  }

  root.Quiz = { mount: mount, initLessons: initLessons };
})(window);
