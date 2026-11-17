(() => {
  'use strict';
  if (window.bloomArchive) return;
  window.bloomArchive = (page, data, {restored, save, signal, element, row}) => {
    const root = page.querySelector('[data-archive-root]');
    if (!root || !data.posts.length) return () => {};
    const on = (node, type, handler, options = {}) => node.addEventListener(type, handler, {...options, signal});
    const posts = new Map(data.posts.map(p => [p.id, p]));
    const state = {selected: posts.has(restored?.selected) ? restored.selected : data.initial, view: 'time',
      focus: '', related: matchMedia('(max-width:900px)').matches || posts.size > 40, scale: 1, x: 0, y: 0, timeZoom: restored?.timeZoom || 1};
    state.focus = 'p:' + state.selected;
    const track = root.querySelector('.disc-timeline'), svg = root.querySelector('svg'), world = svg.querySelector('g');
    const viewport = root.querySelector('.disc-network-viewport'), dialog = page.querySelector('#disc-day-dialog');
    const picker = root.querySelector('[data-net-picker]'), related = root.querySelector('[data-net-related]');
    const tabs = [...page.querySelectorAll('[data-archive-view]')];
    let trigger, frame = 0, labelFrame = 0, graphPointer, timePointer, ignoreClickUntil = 0;
    const persist = () => save({selected: state.selected, view: state.view, timeZoom: state.timeZoom, scroll: track.scrollLeft});
    page.querySelector('.disc-archive-tabs').hidden = false;
    root.querySelectorAll('.disc-timeline-controls,.disc-date-jump').forEach(n => {n.hidden = false;});
    root.querySelectorAll('.disc-day-fallback').forEach(n => {n.hidden = true;});
    root.querySelectorAll('[data-more-day]').forEach(n => {n.hidden = false;});
    root.querySelectorAll('[data-archive-post]').forEach(n => {n.disabled = false;});
    const sameDay = date => data.posts.filter(p => p.date === date);
    const updateTimeline = () => {
      root.dataset.selectedPost = state.selected;
      root.style.setProperty('--disc-timeline-zoom', state.timeZoom);
      root.querySelector('[data-time-scale]').textContent = Math.round(state.timeZoom * 100) + '%';
      root.querySelector('.disc-date-jump select').value = posts.get(state.selected).date;
      root.querySelector('.disc-timeline-period').textContent = posts.get(state.selected).date.slice(0, 4) + ' 年';
      root.querySelector('[data-time-action="out"]').disabled = state.timeZoom <= .8;
      root.querySelector('[data-time-action="in"]').disabled = state.timeZoom >= 1.4;
      for (const day of track.querySelectorAll('[data-date]')) {
        const members = sameDay(day.dataset.date);
        const lead = members.find(p => p.id === state.selected) || members.find(p => p.eligible) || members[0];
        day.classList.toggle('selected', lead.id === state.selected);
        const button = day.querySelector('.disc-day-select'); button.dataset.archivePost = lead.id;
        button.setAttribute('aria-label', '选中：' + lead.title); button.setAttribute('aria-pressed', String(lead.id === state.selected));
        button.replaceChildren();
        if (lead.cover) {const img = element('img'); img.src = lead.cover; img.alt = lead.title + '封面'; img.width = 320; img.height = 166; img.loading = 'lazy'; img.onerror = () => {img.hidden = true;}; button.append(img);}
        button.append(element('span', 'disc-day-word' + (lead.cover ? ' disc-image-fallback' : ''), lead.title));
        const link = day.querySelector('.disc-day-read'); link.href = lead.path; link.textContent = lead.title;
        day.querySelector('.disc-day-category').textContent = lead.placeholder ? '待更新' : lead.categories.join(' / ');
      }
      window.pjax?.parseDOM(track);
    };
    const updateTimeControls = () => {
      const days = [...track.querySelectorAll('[data-date]')], index = days.findIndex(day => day.dataset.date === posts.get(state.selected).date);
      root.querySelector('[data-time-action="prev"]').disabled = index <= 0;
      root.querySelector('[data-time-action="next"]').disabled = index >= days.length - 1;
    };
    const locateDay = day => {
      if (!day) return;
      const r = day.getBoundingClientRect(), t = track.getBoundingClientRect();
      track.scrollLeft += r.left - t.left - Math.max(0, (track.clientWidth - r.width) / 2);
      updateTimeControls(); persist();
    };
    const revealSelected = () => locateDay(track.querySelector('.disc-day.selected'));
    // Nodes and edges come only from the current archive's actual metadata.
    const nodes = new Map(), edges = [], adjacency = new Map();
    const canvas = document.createElement('canvas').getContext('2d');
    canvas.font = '15px Microsoft YaHei, sans-serif';
    const addNode = (id, type, label, post) => {
      if (nodes.has(id)) return;
      nodes.set(id, {id, type, label, post, w: Math.min(214, Math.max(type === 'post' ? 170 : 100, canvas.measureText(label).width + 28)), h: type === 'post' ? 54 : 38});
      adjacency.set(id, new Set());
    };
    data.posts.forEach(p => addNode('p:' + p.id, 'post', p.title, p));
    data.posts.forEach(p => {
      for (const [kind, prefix, type] of [['categories','c:','category'],['tags','t:','tag']]) for (const name of p[kind]) {
        const id = prefix + name; addNode(id, type, name);
        const from = 'p:' + p.id; edges.push({from, to: id, type}); adjacency.get(from).add(id); adjacency.get(id).add(from);
      }
    });
    const NS = 'http://www.w3.org/2000/svg';
    const make = (tag, attrs = {}) => {const node = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value)); return node;};
    const edgeLayer = make('g', {'aria-hidden':'true'}), nodeLayer = make('g'); world.append(edgeLayer, nodeLayer);
    edges.forEach(edge => {edge.el = make('path', {class:'disc-net-edge ' + edge.type, 'data-from':edge.from, 'data-to':edge.to}); edgeLayer.append(edge.el);});
    const elements = new Map();
    nodes.forEach(n => {
      const g = make('g', {class:'disc-net-node ' + n.type, tabindex:'0', role:'button', 'data-net-node':n.id, 'aria-label':(n.type === 'post' ? '文章：' : n.type === 'category' ? '分类：' : '标签：') + n.label});
      const title = make('title'); title.textContent = n.label;
      const rect = make('rect', {x:-n.w / 2, y:-n.h / 2, width:n.w, height:n.h, rx:n.type === 'post' ? 12 : 19});
      const text = make('text', {y:n.post ? -2 : 5});
      let label = (n.type === 'tag' ? '# ' : '') + n.label;
      while (canvas.measureText(label).width > n.w - 20 && label.length > 2) label = label.replace(/…$/, '').slice(0, -1) + '…';
      text.textContent = label; g.append(title, rect, text);
      if (n.post) {const detail = make('text', {y:17, class:'disc-node-detail'}); detail.textContent = n.post.placeholder ? '待更新' : n.post.date; g.append(detail);}
      const activate = () => {if (n.post) selectPost(n.post.id); else {state.focus = n.id; renderGraph();}};
      on(g, 'click', () => {if (performance.now() >= ignoreClickUntil) activate();});
      on(g, 'keydown', event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); activate();}});
      nodeLayer.append(g); elements.set(n.id, g);
    });
    let visible = new Set(), positions = new Map();
    const dimensions = () => ({w: viewport.clientWidth, h: viewport.clientHeight - 74});
    const calculateLayout = () => {
      visible = new Set(nodes.keys());
      if (state.related) {
        const id = 'p:' + state.selected; visible = new Set([id]);
        adjacency.get(id).forEach(t => {visible.add(t); adjacency.get(t).forEach(p => visible.add(p));});
      }
      const components = [], seen = new Set();
      visible.forEach(id => {
        if (seen.has(id)) return;
        const group = [], queue = [id]; seen.add(id);
        for (let i = 0; i < queue.length; i++) {const current = queue[i]; group.push(nodes.get(current)); adjacency.get(current).forEach(next => {if (visible.has(next) && !seen.has(next)) {seen.add(next); queue.push(next);}});}
        components.push(group);
      });
      positions = new Map();
      const cols = Math.min(components.length, viewport.clientWidth > 800 ? 3 : viewport.clientWidth > 500 ? 2 : 1);
      const pitch = Math.max(360, ...components.map(group => Math.max(...group.filter(n => n.post).map(n => n.w / 2), 85) + 215 + Math.max(...group.filter(n => !n.post).map(n => n.w / 2), 50) + 32));
      let top = 0;
      for (let start = 0; start < components.length; start += cols) {
        let rowHeight = 0;
        components.slice(start, start + cols).forEach((group, column) => {
          const articles = group.filter(n => n.type === 'post'), terms = group.filter(n => n.type !== 'post');
          const height = Math.max(articles.length * 74, terms.length * 55, 95);
          rowHeight = Math.max(rowHeight, height);
          articles.forEach((n, i) => positions.set(n.id, {x:column * pitch, y:top + (height - (articles.length - 1) * 74) / 2 + i * 74}));
          terms.forEach((n, i) => positions.set(n.id, {x:column * pitch + 215, y:top + (height - (terms.length - 1) * 55) / 2 + i * 55}));
        });
        top += rowHeight + 72;
      }
    };
    const transform = () => {
      world.setAttribute('transform', `translate(${state.x} ${state.y}) scale(${state.scale})`);
      const overview = state.scale < .2;
      nodeLayer.querySelectorAll('text').forEach(text => {text.style.display = overview ? 'none' : '';});
      root.querySelector('.disc-network-caption > span').textContent = overview ? '放大或定位文章可查看标题' : '拖动平移 · 点击节点看关联';
      root.querySelector('[data-net-scale]').textContent = Math.round(state.scale * 100) + '%';
      root.querySelector('[data-net-action="out"]').disabled = state.scale <= .15;
      root.querySelector('[data-net-action="in"]').disabled = state.scale >= 2.5;
    };
    const fitLabels = () => {
      visible.forEach(id => {
        const text = elements.get(id).querySelector('text'), node = nodes.get(id);
        while (text.getBBox().width > node.w - 20 && Array.from(text.textContent).length > 2) {
          text.textContent = Array.from(text.textContent.replace(/…$/, '')).slice(0, -1).join('') + '…';
        }
      });
    };
    const fit = () => {
      if (!viewport.clientWidth || !visible.size) return;
      const {w,h} = dimensions(), list = [...nodes.values()].filter(n => visible.has(n.id));
      const left = Math.min(...list.map(n => positions.get(n.id).x - n.w / 2)), right = Math.max(...list.map(n => positions.get(n.id).x + n.w / 2));
      const top = Math.min(...list.map(n => positions.get(n.id).y - n.h / 2)), bottom = Math.max(...list.map(n => positions.get(n.id).y + n.h / 2));
      state.scale = Math.min(1, (w - 24) / (right - left + 12), (h - 20) / (bottom - top + 12));
      state.x = w / 2 - (left + right) / 2 * state.scale; state.y = h / 2 - (top + bottom) / 2 * state.scale; transform(); fitLabels();
      cancelAnimationFrame(labelFrame); labelFrame = requestAnimationFrame(fitLabels);
    };
    const renderGraph = () => {
      calculateLayout();
      const neighbors = adjacency.get(state.focus) || new Set();
      nodes.forEach(n => {
        const g = elements.get(n.id), pos = positions.get(n.id), shown = visible.has(n.id);
        g.style.display = shown ? '' : 'none'; g.setAttribute('tabindex', shown ? '0' : '-1'); g.setAttribute('aria-hidden', String(!shown));
        if (pos) g.setAttribute('transform', `translate(${pos.x} ${pos.y})`);
        g.classList.toggle('selected', n.id === 'p:' + state.selected); g.classList.toggle('neighbor', neighbors.has(n.id));
        g.classList.toggle('focused', n.id === state.focus && !n.post); g.setAttribute('aria-pressed', String(n.id === state.focus));
      });
      edges.forEach(edge => {
        const shown = visible.has(edge.from) && visible.has(edge.to); edge.el.style.display = shown ? '' : 'none';
        if (shown) {const a = positions.get(edge.from), b = positions.get(edge.to), mid = (a.x + b.x) / 2; edge.el.setAttribute('d', `M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`);}
        edge.el.classList.toggle('active', edge.from === state.focus || edge.to === state.focus);
      });
      picker.value = state.selected; related.checked = state.related;
      const selectedPost = posts.get(state.selected), readAction = selectedPost.placeholder ? '查看条目' : '阅读全文';
      root.querySelector('[data-net-read]').href = selectedPost.path;
      root.querySelector('[data-net-read]').textContent = readAction + ' ↗';
      root.querySelector('[data-net-read]').setAttribute('aria-label', readAction + '：' + selectedPost.title);
      const focus = nodes.get(state.focus);
      root.querySelector('[data-net-status]').textContent = focus.post ? focus.label + ' · ' + focus.post.categories.join(' / ') : focus.label + ' · ' + adjacency.get(focus.id).size + ' 篇文章';
      transform();
    };
    function selectPost(id, locate = false) {
      if (!posts.has(id)) return;
      state.selected = id; state.focus = 'p:' + id; updateTimeline();
      if (state.view === 'network') {renderGraph(); if (state.related) fit(); else if (locate) graphAction('focus');} else revealSelected();
      persist();
    }
    const setView = view => {
      const previous = state.view;
      state.view = view; root.dataset.view = view;
      tabs.forEach(tab => {const on = tab.dataset.archiveView === view; tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1; page.querySelector('#' + tab.getAttribute('aria-controls')).hidden = !on;});
      if (view === 'network') {renderGraph(); fit();} else {if (previous === 'network') revealSelected(); else if (restored?.scroll !== undefined) track.scrollLeft = restored.scroll; updateTimeControls();}
      persist();
    };
    const zoom = (factor, x, y) => {
      const {w,h} = dimensions(); x ??= w / 2; y ??= h / 2;
      const scale = Math.min(2.5, Math.max(.15, state.scale * factor)), ratio = scale / state.scale;
      state.x = x - (x - state.x) * ratio; state.y = y - (y - state.y) * ratio; state.scale = scale; transform(); fitLabels();
    };
    const graphAction = action => {
      if (action === 'fit') {state.related = false; renderGraph(); fit();}
      else if (action === 'focus') {const p = positions.get('p:' + state.selected), {w,h} = dimensions(); state.scale = Math.max(.85, state.scale); state.x = w / 2 - p.x * state.scale; state.y = h / 2 - p.y * state.scale; transform(); fitLabels();}
      else if (action === 'in' || action === 'out') zoom(action === 'in' ? 1.2 : 1 / 1.2);
      else {state.x += action === 'left' ? 70 : action === 'right' ? -70 : 0; state.y += action === 'up' ? 70 : action === 'down' ? -70 : 0; transform();}
    };
    on(page, 'click', event => {
      const tab = event.target.closest('[data-archive-view]'); if (tab) setView(tab.dataset.archiveView);
      const select = event.target.closest('[data-archive-post]'); if (select && performance.now() >= ignoreClickUntil) {selectPost(select.dataset.archivePost); if (dialog.open) dialog.close();}
      const time = event.target.closest('[data-time-action]');
      if (time) {
        const action = time.dataset.timeAction;
        if (action === 'prev' || action === 'next') {
          const days = [...track.querySelectorAll('[data-date]')], index = days.findIndex(day => day.dataset.date === posts.get(state.selected).date);
          const target = days[index + (action === 'prev' ? -1 : 1)];
          if (target) {const members = sameDay(target.dataset.date); selectPost((members.find(post => post.eligible) || members[0]).id, true);}
        }
        else {state.timeZoom = Math.max(.8, Math.min(1.4, +(state.timeZoom + (action === 'in' ? .1 : -.1)).toFixed(1))); updateTimeline(); revealSelected();}
        updateTimeControls(); persist();
      }
      const more = event.target.closest('[data-more-day]');
      if (more) {
        trigger = more; const day = more.closest('[data-date]'), selected = day.querySelector('[data-archive-post]').dataset.archivePost;
        const remaining = sameDay(day.dataset.date).filter(p => p.id !== selected);
        dialog.querySelector('h2').textContent = day.dataset.date + ' · 另有 ' + remaining.length + ' 篇';
        dialog.querySelector('.disc-day-list').replaceChildren(...remaining.map(p => {
          const wrap = element('div','disc-modal-row'), a = row(p), button = element('button','', '定位');
          button.type = 'button'; button.dataset.archivePost = p.id; button.setAttribute('aria-label','在时间轴选中：' + p.title); wrap.append(a,button); return wrap;
        })); window.pjax?.parseDOM(dialog); dialog.showModal();
      }
      if (event.target.closest('[data-close-day]')) dialog.close();
      const action = event.target.closest('[data-net-action]'); if (action) graphAction(action.dataset.netAction);
    });
    tabs.forEach(tab => on(tab, 'keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault(); setView(event.key === 'Home' ? 'time' : event.key === 'End' ? 'network' : state.view === 'time' ? 'network' : 'time');
      tabs.find(t => t.dataset.archiveView === state.view).focus();
    }));
    on(picker, 'change', () => selectPost(picker.value, true));
    on(related, 'change', () => {state.related = related.checked; state.focus = 'p:' + state.selected; renderGraph(); fit();});
    on(root.querySelector('.disc-date-jump select'), 'change', event => {
      const members = sameDay(event.target.value), lead = members.find(post => post.eligible) || members[0];
      if (lead) selectPost(lead.id, true);
    });
    on(track, 'scroll', () => {updateTimeControls(); persist();}, {passive:true});
    on(track, 'keydown', event => {if (event.target !== track || !['ArrowLeft','ArrowRight'].includes(event.key)) return; event.preventDefault(); track.scrollLeft += event.key === 'ArrowLeft' ? -270 : 270;});
    on(track, 'pointerdown', event => {if (event.pointerType === 'mouse' && event.button === 0) timePointer = {id:event.pointerId, x:event.clientX, scroll:track.scrollLeft};});
    on(track, 'pointermove', event => {
      if (!timePointer || event.pointerId !== timePointer.id) return;
      if (Math.abs(event.clientX - timePointer.x) > 7) {track.setPointerCapture(event.pointerId); track.scrollLeft = timePointer.scroll - event.clientX + timePointer.x; ignoreClickUntil = performance.now() + 180;}
    });
    const finishTime = () => {timePointer = null;}; on(track,'pointerup',finishTime); on(track,'pointercancel',finishTime); on(track,'lostpointercapture',finishTime);
    on(dialog, 'close', () => {trigger?.focus({preventScroll:true});});
    on(dialog, 'click', event => {const r = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();});
    on(svg, 'pointerdown', event => {if (event.button === 0) graphPointer = {id:event.pointerId, type:event.pointerType, x:event.clientX, y:event.clientY, initialX:state.x, initialY:state.y, dragging:false};});
    on(svg, 'pointermove', event => {
      if (!graphPointer || graphPointer.id !== event.pointerId) return;
      const dx = event.clientX - graphPointer.x, dy = event.clientY - graphPointer.y;
      if (!graphPointer.dragging) {
        if (Math.hypot(dx,dy) < 7) return;
        if (graphPointer.type === 'touch' && Math.abs(dy) > Math.abs(dx)) {graphPointer = null; return;}
        graphPointer.dragging = true; svg.setPointerCapture(event.pointerId); svg.classList.add('dragging');
      }
      event.preventDefault(); state.x = graphPointer.initialX + dx; state.y = graphPointer.initialY + dy;
      if (!frame) frame = requestAnimationFrame(() => {frame = 0; transform();});
    }, {passive:false});
    const finishGraph = event => {if (graphPointer?.id === event.pointerId) {if (graphPointer.dragging) ignoreClickUntil = performance.now() + 200; graphPointer = null; svg.classList.remove('dragging');}};
    on(svg, 'pointerup', finishGraph); on(svg, 'pointercancel', finishGraph); on(svg, 'lostpointercapture', finishGraph);
    on(svg, 'wheel', event => {if (!event.ctrlKey && !event.metaKey) return; event.preventDefault(); const r = svg.getBoundingClientRect(); zoom(Math.exp(-event.deltaY * .004), event.clientX - r.left, event.clientY - r.top);}, {passive:false});
    on(svg, 'keydown', event => {
      if (event.target !== svg) return;
      const action = {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down','+':'in','=':'in','-':'out',Home:'fit'}[event.key];
      if (action) {event.preventDefault(); graphAction(action);}
    });
    const observer = new ResizeObserver(() => {if (state.view === 'network') {renderGraph(); fit();} updateTimeControls();}); observer.observe(root);
    Object.defineProperty(root, 'networkState', {get: () => ({...state, visible:[...visible], nodes:[...nodes.keys()], edges:edges.map(({from,to}) => ({from,to}))})});
    updateTimeline(); setView(restored?.view || (new URLSearchParams(location.search).get('view') === 'network' ? 'network' : 'time'));
    if (restored?.scroll !== undefined) track.scrollLeft = restored.scroll;
    else if (state.view === 'time') revealSelected();
    return () => {observer.disconnect(); cancelAnimationFrame(frame); cancelAnimationFrame(labelFrame); if (dialog.open) dialog.close();};
  };
})();
