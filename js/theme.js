// Apply and remember the visitor's light, dark or system theme preference.
(function () {
  'use strict';
  // On phones the module pills scroll sideways: bring the current module into view.
  var current = document.querySelector('.module-nav [aria-current]');
  if (current && current.parentNode.parentNode.scrollWidth > current.parentNode.parentNode.clientWidth) {
    current.parentNode.parentNode.scrollLeft = current.offsetLeft - 16;
  }
  var button = document.querySelector('[data-theme-toggle]');
  if (!button) return;
  var modes = ['auto', 'light', 'dark'];
  var mode = document.documentElement.getAttribute('data-theme') || 'auto';

  function render() {
    var label = mode.charAt(0).toUpperCase() + mode.slice(1);
    var next = modes[(modes.indexOf(mode) + 1) % modes.length];
    if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', mode);
    // A small symbol shows the current choice: ◐ follows the device, ☀ light, ☾ dark.
    var icon = { auto: '◐', light: '☀', dark: '☾' }[mode];
    button.textContent = icon + ' ' + label;
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
  // "Delete everything" on My data resets the theme to Auto without a reload.
  window.addEventListener('aiportal:theme-reset', function () { mode = 'auto'; render(); });
  render();
})();
