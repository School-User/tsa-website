// "My data" page: see, download (zip), reset or delete everything this site stores.
// There are no accounts: all data is in this browser only (localStorage).
(function () {
  'use strict';
  var KEYS = ['aiPortal.v1', 'aiPortal.theme'];
  var $ = function (id) { return document.getElementById(id); };

  // Zip with no compression ("store") so no library is needed.
  var table = (function () {
    var t = [], c, n, k;
    for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = table[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function u16(n) { return [n & 255, (n >>> 8) & 255]; }
  function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
  function zip(files) { // files: [{name, text}]
    var enc = new TextEncoder(), out = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      var head = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
        u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      out.push(new Uint8Array(head), name, data);
      central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
        u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset))), name);
      offset += head.length + name.length + data.length;
    });
    var csize = central.reduce(function (n, p) { return n + p.length; }, 0);
    var end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(csize), u32(offset), u16(0)));
    return new Blob(out.concat(central, [end]), { type: 'application/zip' });
  }

  function show() {
    var s = Progress.load();
    var lessons = Object.keys(s.lessons).reduce(function (n, m) { return n + s.lessons[m].length; }, 0);
    // "1 lesson" but "2 lessons".
    var count = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
    $('summary').textContent = Progress.xp(s) + ' XP, ' + count(lessons, 'lesson', 'lessons') + ' read, ' +
      count(Object.keys(s.quiz).length, 'quiz', 'quizzes') + ' taken, ' + count(s.practice.length, 'practice card', 'practice cards') + ' finished, ' + count(s.demos.length, 'demo', 'demos') + ' tried.';
    // A brand-new visitor has nothing to move yet, so no code is shown.
    $('code').textContent = Progress.xp(s) > 0 || Object.keys(s.quiz).length ? Progress.exportCode() : 'none yet';
  }

  $('download').addEventListener('click', function () {
    var s = Progress.load();
    var theme = ''; try { theme = localStorage.getItem('aiPortal.theme') || 'auto'; } catch (e) { theme = 'auto'; }
    var blob = zip([
      { name: 'progress.json', text: JSON.stringify({ exported: new Date().toISOString(), progress: s, xp: Progress.xp(s), theme: theme, progressCode: Progress.exportCode() }, null, 2) },
      { name: 'README.txt', text: 'AI Lab data export.\nprogress.json is everything this site saved in your browser.\nTo restore it on any device, paste the progressCode into Switch devices on the home page.\n' }
    ]);
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'ai-lab-my-data.zip';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    $('msg').textContent = 'Downloaded ai-lab-my-data.zip.';
  });

  $('restart').addEventListener('click', function () {
    if (!window.confirm('Delete your XP, badges and quiz scores and start over?')) return;
    Progress.reset(); show(); $('msg').textContent = 'Progress deleted. You are starting fresh.';
  });

  $('wipe').addEventListener('click', function () {
    if (!window.confirm('Delete everything this site stored in this browser, including your theme choice?')) return;
    Progress.reset();
    KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) { /* blocked */ } });
    window.dispatchEvent(new Event('aiportal:theme-reset'));
    show(); $('msg').textContent = 'All of your data on this site was deleted from this browser.';
  });
  show();
})();
