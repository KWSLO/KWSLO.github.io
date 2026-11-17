(() => {
  'use strict';
  if (window.blogQuotes) return;
  const storageKey = 'bloom:last-home-quote';
  const bagKey = 'bloom:home-quote-shuffle:v1';
  let current = null, last = null, typedPromise = null;
  let bag = null;
  const pools = new Map();
  const valid = q => q && typeof q.id === 'string' && typeof q.text === 'string' && q.text && typeof q.work === 'string' && q.work;
  const loadPool = url => {
    if (pools.has(url)) return pools.get(url);
    const promise = fetch(url, {cache: 'force-cache', signal: AbortSignal.timeout(8000)}).then(response => {
      if (!response.ok) throw Error('quote pool');
      return response.json();
    }).then(data => {
      if (data.version !== 1 || !Array.isArray(data.strings) || !Array.isArray(data.rows)) throw Error('quote format');
      const pool = data.rows.map(row => ({id: row[0], text: row[1], author: data.strings[row[2]], work: data.strings[row[3]], category: data.strings[row[4]], ...row[5]}));
      if (!pool.length || pool.some(q => !valid(q)) || new Set(pool.map(q => q.id)).size !== pool.length) throw Error('quote entries');
      return pool;
    }).catch(error => { pools.delete(url); throw error; });
    pools.set(url, promise);
    return promise;
  };
  try { last = JSON.parse(sessionStorage.getItem(storageKey)); } catch (_) { /* Storage is optional. */ }
  try { bag = JSON.parse(sessionStorage.getItem(bagKey)); } catch (_) { /* Storage is optional. */ }
  const remember = quote => {
    last = {id: quote.id, category: quote.category};
    try { sessionStorage.setItem(storageKey, JSON.stringify(last)); } catch (_) { /* Private mode fallback. */ }
  };
  const destroy = () => {
    if (current?.typed) current.typed.destroy();
    current = null;
  };
  const loadTyped = url => {
    if (window.Typed) return Promise.resolve();
    if (!typedPromise && window.btf?.getScript && url) {
      typedPromise = window.btf.getScript(url).catch(() => { typedPromise = null; });
    }
    return typedPromise || Promise.resolve();
  };
  const update = (state, quote, animate) => {
    const revision = state.revision = (state.revision || 0) + 1;
    state.typed?.destroy();
    state.typed = null;
    const root = state.root;
    root.dataset.quoteId = quote.id;
    root.dataset.quoteLanguage = /[\u3400-\u9fff]/.test(quote.text) ? 'zh' : 'latin';
    root.querySelector('.home-quote-measure').textContent = quote.text;
    const line = root.querySelector('#subtitle');
    line.textContent = quote.text;
    const source = root.querySelector('.home-quote-source');
    source.querySelector('.home-quote-author').textContent = quote.author || '';
    source.querySelector('.home-quote-work').textContent = '《' + quote.work + '》';
    source.setAttribute('aria-label', (quote.kind === 'fiction' ? '影视对白：' : '') + (quote.author || '') + '《' + quote.work + '》');
    source.title = [quote.original_label, quote.translation_note, quote.work].filter(Boolean).join(' · ');
    const original = root.querySelector('.home-quote-original-text');
    original.hidden = !quote.original;
    original.textContent = quote.original || '';
    root.querySelector('#home-quote-next').setAttribute('aria-label', quote.text + (state.pool.length > 1 ? '，点击换一句' : ''));
    root.querySelector('.home-quote-announcement').textContent = quote.text + '——' + (quote.author || '') + '《' + quote.work + '》' + (quote.translation_note ? '（' + quote.translation_note + '）' : '');
    remember(quote);
    if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.typewriter !== 'true') return;
    loadTyped(root.dataset.typedUrl).then(() => {
      if (current !== state || state.revision !== revision || !root.isConnected || !window.Typed || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      line.textContent = '';
      state.typed = new window.Typed(line, {strings: [quote.text], contentType: null, typeSpeed: 42, startDelay: 80, loop: false, showCursor: true, onComplete: self => { if (self.cursor) self.cursor.hidden = true; }});
    }).catch(() => { if (current === state) line.textContent = quote.text; });
  };
  const pick = state => {
    const {ids, signature, byId} = state;
    if (!bag || !Array.isArray(bag.remaining) || !Array.isArray(bag.recent) || bag.signature !== signature) {
      bag = {signature, remaining: [], recent: last?.id ? [last.id] : []};
      state.bagPrepared = false;
    }
    if (!state.bagPrepared) {
      bag.remaining = [...new Set(bag.remaining)].filter(id => byId.has(id));
      state.bagPrepared = true;
    }
    if (!bag.remaining.length) {
      const shuffled = [...ids];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const values = new Uint32Array(1);
        const random = window.crypto?.getRandomValues ? crypto.getRandomValues(values)[0] / 4294967296 : Math.random();
        const j = Math.floor(random * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      // Recent lines stay at the end of the next round, but no line is dropped.
      const recent = new Set(bag.recent.slice(-Math.min(8, Math.max(1, ids.length - 1))));
      bag.remaining = shuffled.filter(id => !recent.has(id)).concat(shuffled.filter(id => recent.has(id)));
    }
    let at = bag.remaining.findIndex(id => id !== last?.id);
    if (at < 0) at = 0;
    const id = bag.remaining.splice(at, 1)[0];
    bag.recent = [...bag.recent, id].slice(-8);
    try {sessionStorage.setItem(bagKey, JSON.stringify(bag));} catch (_) { /* Keep the in-memory bag. */ }
    return byId.get(id);
  };
  const init = () => {
    const root = document.getElementById('home-quote');
    if (current?.root === root) return;
    destroy();
    if (!root) return;
    let pool;
    try { pool = JSON.parse(root.querySelector('#home-quote-data').textContent).filter(valid); } catch (_) { return; }
    if (!pool.length) return;
    const state = current = {root, pool: [], typed: null};
    const button = root.querySelector('#home-quote-next');
    const activate = entries => {
      if (current !== state || !root.isConnected) return;
      state.pool = entries;
      state.ids = entries.map(q => q.id);
      state.signature = state.ids.join('|');
      state.byId = new Map(entries.map(q => [q.id, q]));
      state.bagPrepared = false;
      button.disabled = entries.length < 2;
      button.title = entries.length > 1 ? '点击换一句' : '';
      root.removeAttribute('aria-busy');
      root.dataset.poolState = entries === pool ? 'fallback' : 'ready';
      update(state, pick(state), true);
    };
    if (root.dataset.poolUrl) {
      button.disabled = true;
      root.setAttribute('aria-busy', 'true');
      loadPool(root.dataset.poolUrl).then(activate).catch(() => activate(pool));
    } else activate(pool);
  };
  document.addEventListener('click', event => {
    if (!current || !current.root.contains(event.target)) return;
    if (event.target.closest('#home-quote-next, .home-quote-original-text') && current.pool.length > 1) update(current, pick(current), false);
  });
  document.addEventListener('pjax:send', destroy);
  document.addEventListener('pjax:complete', init);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion.addEventListener('change', event => {
    if (!event.matches || !current?.typed) return;
    const text = current.root.querySelector('.home-quote-measure').textContent;
    current.typed.destroy(); current.typed = null;
    current.root.querySelector('#subtitle').textContent = text;
  });
  window.blogQuotes = {init};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
