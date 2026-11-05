(function () {
  'use strict';

  var origin = 'https://giscus.app';
  var activeContainer;
  var client;

  function themeFor(container) {
    var configured = container.dataset.theme;
    if (configured !== 'auto') return configured;
    var mode = document.documentElement.dataset.glassTheme;
    return mode === 'dark' ? 'dark' : mode === 'dim' ? 'dark_dimmed' : 'light';
  }

  function syncTheme() {
    if (!activeContainer || !activeContainer.isConnected) return;
    var frame = activeContainer.querySelector('iframe.giscus-frame');
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ giscus: { setConfig: { theme: themeFor(activeContainer) } } }, origin);
    }
  }

  function mount() {
    var container = document.querySelector('#giscus-comments .giscus');
    if (!container || container === activeContainer) return;
    activeContainer = container;
    client = document.createElement('script');
    Object.keys(container.dataset).forEach(function (key) {
      client.dataset[key] = container.dataset[key];
    });
    client.dataset.theme = themeFor(container);
    client.src = origin + '/client.js';
    client.crossOrigin = 'anonymous';
    client.async = true;
    client.onload = function () {
      var frame = container.querySelector('iframe.giscus-frame');
      if (frame) frame.addEventListener('load', syncTheme, { once: true });
    };
    container.parentNode.appendChild(client);
  }

  document.addEventListener('ayer:before-swap', function () {
    if (client) client.remove();
    client = null;
    activeContainer = null;
  });
  document.addEventListener('ayer:page-ready', mount);
  document.addEventListener('ayer:theme-change', syncTheme);
  mount();
})();
