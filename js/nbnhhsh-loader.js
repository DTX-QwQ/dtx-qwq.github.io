/* The upstream userscript supports mouse/keyboard selection, not touch selection. */
(function () {
  'use strict';

  var loader = document.currentScript;
  var desktop = window.matchMedia('(min-width: 769px) and (hover: hover) and (pointer: fine)');
  if (!loader || !desktop.matches || window.AyerNbnhhshLoading) return;
  window.AyerNbnhhshLoading = true;

  function loadScript(src, onload) {
    var script = document.createElement('script');
    script.src = src;
    script.onload = onload;
    script.onerror = function () {
      // Translation is optional; a failed dependency must not affect reading.
      console.warn('[nbnhhsh] Failed to load:', src);
    };
    document.body.appendChild(script);
  }

  // Do not execute the userscript (which inserts Vue templates) until Vue is ready.
  loadScript(loader.dataset.vueSrc, function () {
    if (typeof window.Vue === 'function' && desktop.matches) {
      loadScript(loader.dataset.nbnhhshSrc);
    }
  });
})();
