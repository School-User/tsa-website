// Apply and remember the visitor's light, dark or system theme preference.
(function () {
  'use strict';
  var button = document.querySelector('[data-theme-toggle]');
  if (!button) return;
  var modes = ['auto', 'light', 'dark'];
  var mode = document.documentElement.getAttribute('data-theme') || 'auto';

  function render() {
    var label = mode.charAt(0).toUpperCase() + mode.slice(1);
    var next = modes[(modes.indexOf(mode) + 1) % modes.length];
    if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', mode);
    button.textContent = 'Theme: ' + label;
    button.setAttribute('aria-label', 'Theme: ' + label + '. Activate to switch to ' + next.charAt(0).toUpperCase() + next.slice(1));
    button.setAttribute('aria-pressed', mode === 'auto' ? 'false' : 'true');
  }
  button.addEventListener('click', function () {
    mode = modes[(modes.indexOf(mode) + 1) % modes.length];
    try {
      if (mode === 'auto') localStorage.removeItem('aiPortal.theme');
      else localStorage.setItem('aiPortal.theme', mode);
    } catch (e) { /* Theme still works for this page when storage is blocked. */ }
    render();
  });
  render();
})();
