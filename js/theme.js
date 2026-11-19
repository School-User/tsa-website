// Apply and remember the visitor's light, dark or system theme preference.
(function () {
  'use strict';
  // On phones the module pills scroll sideways: bring the current module into view.
  var current = document.querySelector('.module-nav [aria-current]');
  var row = current && current.closest('ul');
  if (row && row.scrollWidth > row.clientWidth) row.scrollLeft = current.offsetLeft - row.offsetLeft;
  var button = document.querySelector('[data-theme-toggle]');
  if (!button) return;
  var modes = ['auto', 'light', 'dark'];
  var mode = document.documentElement.getAttribute('data-theme') || 'auto';

  function render() {
    var label = mode.charAt(0).toUpperCase() + mode.slice(1);
    var next = modes[(modes.indexOf(mode) + 1) % modes.length];
    if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', mode);
    // Light and dark get a sun or moon; Auto (follow the device) says "Theme: Auto".
    button.textContent = { auto: 'Theme: Auto', light: '☀ Light', dark: '☾ Dark' }[mode];
    button.setAttribute('aria-label', 'Theme: ' + label + '. Activate to switch to ' + next.charAt(0).toUpperCase() + next.slice(1));
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
