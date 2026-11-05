(function () {
  'use strict';

  var origin = 'https://giscus.app';
  var active;

  function themeFor(container) {
    var configured = container.dataset.theme;
    if (configured !== 'auto') return configured;
    var mode = document.documentElement.dataset.glassTheme || 'light';
    // Public HTTPS iframes cannot reliably load styles from a local HTTP server.
    // Keep development previews usable without relaxing browser security.
    if (location.protocol === 'http:' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
      return mode === 'dark' ? 'transparent_dark' : mode === 'dim' ? 'dark_dimmed' : 'light';
    }
    var key = mode === 'dark' ? 'themeDark' : mode === 'dim' ? 'themeDim' : 'themeLight';
    return new URL(container.dataset[key], location.href).href;
  }

  function frameFor(state) { return state.container.querySelector('iframe.giscus-frame'); }

  function syncTheme() {
    if (!active || !active.container.isConnected) return;
    var frame = frameFor(active);
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ giscus: { setConfig: { theme: themeFor(active.container) } } }, origin);
    }
  }

  function status(state, kind, message) {
    if (active !== state) return;
    state.panel.dataset.state = kind;
    state.panel.querySelector('.comments-status').hidden = kind === 'ready';
    state.panel.querySelector('.comments-status-text').textContent = message || '';
    state.panel.querySelector('.comments-retry').hidden = kind !== 'error';
    if (kind !== 'loading') clearTimeout(state.timeout);
  }

  function load(state) {
    if (active !== state || !state.container.isConnected || state.client) return;
    if (state.observer) state.observer.disconnect();
    status(state, 'loading', '正在加载评论…');
    var client = document.createElement('script');
    state.client = client;
    ['repo', 'repoId', 'category', 'categoryId', 'mapping', 'strict', 'reactionsEnabled',
      'emitMetadata', 'inputPosition', 'lang', 'loading'].forEach(function (key) {
      client.dataset[key] = state.container.dataset[key];
    });
    client.dataset.theme = themeFor(state.container);
    client.src = origin + '/client.js';
    client.crossOrigin = 'anonymous';
    client.async = true;
    client.onload = function () {
      if (active !== state) return;
      var frame = frameFor(state);
      if (frame) frame.addEventListener('load', syncTheme, { once: true });
    };
    client.onerror = function () {
      status(state, 'error', '评论暂时无法连接，请重试，或前往 GitHub 讨论。');
    };
    state.timeout = setTimeout(function () {
      status(state, 'error', '评论加载较慢，请检查网络后重试，或前往 GitHub 讨论。');
    }, 20000);
    state.panel.appendChild(client);
  }

  function dispose() {
    if (!active) return;
    clearTimeout(active.timeout);
    if (active.observer) active.observer.disconnect();
    if (active.client) {
      active.client.onload = active.client.onerror = null;
      active.client.remove();
    }
    active = null;
  }

  function mount() {
    var container = document.querySelector('#giscus-comments .giscus');
    if (!container || (active && active.container === container)) return;
    dispose();
    var state = active = { container: container, panel: container.closest('#giscus-comments') };
    state.panel.querySelector('.comments-retry').onclick = function () {
      // A full reload also clears the upstream client's anonymous message listener.
      location.reload();
    };
    if ('IntersectionObserver' in window) {
      state.observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) load(state);
      }, { root: document.querySelector('main[data-ayer-page]'), rootMargin: '240px' });
      state.observer.observe(state.panel);
    } else load(state);
  }

  window.addEventListener('message', function (event) {
    if (!active || event.origin !== origin) return;
    var frame = frameFor(active);
    if (!frame || event.source !== frame.contentWindow || !event.data || !event.data.giscus) return;
    var data = event.data.giscus;
    // A missing discussion is an ordinary empty state, created on first participation.
    if (data.error && !/Discussion not found/i.test(data.error)) {
      active.serviceError = true;
      status(active, 'error', '评论暂时不可用，请稍后重试，或前往 GitHub 讨论。');
    } else if (!active.serviceError && typeof data.resizeHeight === 'number' && data.resizeHeight > 0) {
      if (active.panel.dataset.state !== 'ready') syncTheme();
      status(active, 'ready');
    }
  });
  document.addEventListener('ayer:before-swap', dispose);
  document.addEventListener('ayer:page-ready', mount);
  document.addEventListener('ayer:theme-change', syncTheme);
  mount();
})();
