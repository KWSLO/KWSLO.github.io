(() => {
  'use strict';
  if (window.bloomDiscovery) return;
  let active, fromHistory = performance.getEntriesByType('navigation')[0]?.type === 'back_forward', lastRead;
  const entries = new Map();
  const entryState = () => {
    const uid = history.state?.uid;
    if (history.state?.bloomDiscovery) return history.state.bloomDiscovery;
    if (entries.has(uid)) return entries.get(uid);
    try {return JSON.parse(sessionStorage.getItem('bloom:discovery:' + uid));} catch (_) {return null;}
  };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const row = post => {
    const a = element('a', 'disc-post-row'); a.href = post.path;
    const copy = element('span');
    copy.append(element('strong', '', post.title), element('small', '', post.date + (post.placeholder ? ' · 待更新' : post.categories.length ? ' · ' + post.categories.join(' / ') : '')));
    const arrow = element('span', 'disc-row-arrow', '↗'); arrow.setAttribute('aria-hidden', 'true');
    a.append(copy, arrow); return a;
  };
  const plainClick = event => event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
  const initBlog = (root, data, restored, save, signal) => {
    const pool = data.posts.filter(p => p.eligible);
    if (!pool.length) return () => {};
    const main = root.querySelector('.disc-reading');
    const choice = exclude => {
      const alternatives = pool.filter(p => p.id !== exclude);
      return (alternatives.length ? alternatives : pool)[Math.floor(Math.random() * (alternatives.length || pool.length))];
    };
    const select = post => {
      lastRead = post.id; main.dataset.selectedPost = post.id;
      root.querySelector('.disc-reading-title').textContent = post.title;
      const meta = element('div', 'disc-meta');
      post.categories.forEach(name => { const t = data.categories.find(t => t.name === name); if (t) {const a = element('a', '', name); a.href = t.path; meta.append(a);} });
      const time = element('time', '', post.date); time.dateTime = post.date; meta.append(time);
      root.querySelector('.disc-reading-meta').replaceChildren(meta);
      const cover = root.querySelector('.disc-reading-cover');
      cover.dataset.coverMode = post.coverMode || 'full'; cover.style.objectPosition = post.coverPosition || 'center';
      cover.hidden = !post.cover;
      if (post.cover) {cover.src = post.cover; cover.alt = post.title + '封面';} else cover.removeAttribute('src');
      root.querySelector('.disc-reading-excerpt').textContent = post.excerpt;
      root.querySelector('[data-reading-link]').href = post.path;
      root.querySelector('[data-reading-link]').setAttribute('aria-label', '阅读全文：' + post.title);
      const taxonomy = root.querySelector('.disc-reading-taxonomy'); taxonomy.replaceChildren();
      for (const kind of ['categories', 'tags']) for (const name of post[kind]) {
        const term = data[kind].find(t => t.name === name); if (!term) continue;
        const a = element('a', '', (kind === 'tags' ? '# ' : '') + name); a.href = term.path; taxonomy.append(a);
      }
      const score = p => (p.tags.some(t => post.tags.includes(t)) ? 100 : 0) + (p.categories.some(c => post.categories.includes(c)) ? 10 : 0);
      const others = pool.filter(p => p.id !== post.id).sort((a, b) => score(b) - score(a));
      root.querySelector('.disc-related-title').textContent = others.some(p => score(p)) ? '相关文章' : '其他文章';
      root.querySelector('.disc-reading-related').replaceChildren(...others.slice(0, 3).map(row));
      root.querySelector('.disc-reading-context').hidden = !others.length && !taxonomy.children.length;
      root.querySelectorAll('[data-choose-post]').forEach(a => {
        const on = a.dataset.choosePost === post.id; a.classList.toggle('selected', on); a.setAttribute('aria-current', on ? 'true' : 'false');
        a.querySelector('.disc-choice-current').hidden = !on;
      });
      const strip = root.querySelector('.disc-cover-strip'), selected = strip.querySelector('.selected');
      if (selected && strip.clientWidth) strip.scrollLeft += selected.getBoundingClientRect().left - strip.getBoundingClientRect().left - 20;
      root.querySelector('.disc-reader-announcement').textContent = '当前选读：' + post.title;
      window.pjax?.parseDOM(root);
      save({selected: post.id});
    };
    root.querySelector('[data-reading-next]').hidden = pool.length < 2;
    root.addEventListener('click', event => {
      const option = event.target.closest('[data-choose-post]');
      if (option && plainClick(event)) {event.preventDefault(); select(pool.find(p => p.id === option.dataset.choosePost));}
      if (event.target.closest('[data-reading-next]')) select(choice(main.dataset.selectedPost));
    }, {signal});
    select(pool.find(p => p.id === restored?.selected) || choice(lastRead));
    return () => {};
  };
  const initTopics = (root, restored, save, signal) => {
    const search = root.querySelector('.disc-topic-search'), input = search.querySelector('input');
    const cards = [...root.querySelectorAll('.disc-topic-panel:not([hidden]) [data-topic-name]')];
    search.hidden = cards.length <= 8;
    const filter = () => {
      const text = input.value.trim().toLocaleLowerCase(); let count = 0;
      cards.forEach(card => {card.hidden = !card.dataset.topicName.toLocaleLowerCase().includes(text); if (!card.hidden) count++;});
      root.querySelector('.disc-topic-empty').hidden = count > 0;
      save({query: input.value});
    };
    input.value = restored?.query || ''; input.addEventListener('input', filter, {signal}); filter();
    return () => {};
  };
  const destroy = () => {
    if (!active) return;
    delete active.root.dataset.discoveryReady;
    active.cleanup?.(); active.abort.abort(); active = null;
  };
  const init = () => {
    const root = document.querySelector('[data-discovery]');
    if (active?.root === root) return;
    destroy();
    if (!root) {fromHistory = false; return;}
    let data;
    try {data = JSON.parse(root.querySelector('#discovery-data').textContent);} catch (_) {fromHistory = false; return;}
    const key = location.pathname + location.search;
    const previousEntry = entryState();
    const restored = fromHistory && previousEntry?.key === key ? previousEntry : null;
    fromHistory = false;
    const abort = new AbortController(); active = {root, abort, key};
    const save = value => {
      if (location.pathname + location.search !== key || !root.isConnected) return;
      const uid = history.state?.uid || Date.now();
      const snapshot = {...entries.get(uid), ...history.state?.bloomDiscovery, key, ...value};
      entries.set(uid, snapshot);
      try {sessionStorage.setItem('bloom:discovery:' + uid, JSON.stringify(snapshot));} catch (_) { /* Storage is optional. */ }
      try {history.replaceState({...history.state, uid, url:location.href, title:document.title, scrollPos:history.state?.scrollPos || [0,0], bloomDiscovery:snapshot}, '', location.href);} catch (_) { /* Reading does not depend on storage. */ }
    };
    if (data.kind === 'blog') active.cleanup = initBlog(root, data, restored, save, abort.signal);
    else if (data.kind === 'topics') active.cleanup = initTopics(root, restored, save, abort.signal);
    else if (data.kind === 'archive' && window.bloomArchive) active.cleanup = window.bloomArchive(root, data, {restored, save, signal: abort.signal, element, row});
    root.dataset.discoveryReady = 'true';
  };
  window.addEventListener('popstate', () => {fromHistory = true;});
  document.addEventListener('pjax:send', destroy);
  document.addEventListener('pjax:complete', init);
  window.addEventListener('pagehide', destroy);
  window.addEventListener('pageshow', event => {if (event.persisted) {fromHistory = true; init();}});
  window.bloomDiscovery = {init};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true}); else init();
})();
