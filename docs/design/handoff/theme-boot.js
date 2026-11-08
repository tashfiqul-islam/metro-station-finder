// theme-boot.js — load in <head> without defer, before the CSS paints. Same-origin, CSP script-src 'self' safe.
(function () {
  try {
    var p = localStorage.getItem('msf-theme');
    if (p === 'light' || p === 'dark') document.documentElement.setAttribute('data-theme', p);
    else document.documentElement.removeAttribute('data-theme');
  } catch (e) { /* storage blocked: follow the OS */ }
})();
