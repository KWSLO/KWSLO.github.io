(() => {
  'use strict'
  const box = document.getElementById('music-player')
  const button = document.getElementById('music-toggle')
  const status = document.getElementById('music-status')
  const panel = document.getElementById('music-panel')
  const mount = document.getElementById('music-mount')
  const retry = document.getElementById('music-retry')
  const collapse = document.getElementById('music-collapse')
  if (!box || !button || window.blogMusic) return
  let player = null
  let loading = null
  let library = null
  let expanded = false
  let state = 'idle'
  let trackFailed = false
  let pendingPlayback = false
  let playWatch = 0
  let blockedCheck = 0
  let footer = null
  let footerVisible = false
  let dockFrame = 0
  let toolbar = null
  const footerObserver = new IntersectionObserver(entries => {
    footerVisible = entries.some(entry => entry.isIntersecting)
    scheduleDock()
  })
  const layoutObserver = new ResizeObserver(() => scheduleDock())
  const toolObserver = new MutationObserver(() => scheduleDock())
  function scheduleDock() {
    if (dockFrame) return
    dockFrame = requestAnimationFrame(() => {
      dockFrame = 0
      if (matchMedia('(max-width: 900px)').matches) {
        box.style.removeProperty('--music-dock-bottom')
        return
      }
      const height = window.innerHeight
      const buttonHeight = button.getBoundingClientRect().height
      const f = footer?.getBoundingClientRect()
      const tools = toolbar?.getBoundingClientRect()
      const toolsVisible = tools && (toolbar.classList.contains('rightside-show') || Number(getComputedStyle(toolbar).opacity) > .5)
      const visibleTools = toolbar ? [...toolbar.querySelectorAll('#rightside-config-show > button, #rightside-config-show > a, #rightside-config-hide.show > button, #rightside-config-hide.show > a')].filter(node => getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().height) : []
      const toolsTop = visibleTools.length ? Math.min(...visibleTools.map(node => node.getBoundingClientRect().top)) : tools?.top
      const anchor = toolbar?.querySelector('#rightside-config-show > button')?.getBoundingClientRect()
      const right = toolsVisible && anchor ? Math.max(0, innerWidth - anchor.left - anchor.width / 2 - button.getBoundingClientRect().width / 2) : 10
      let bottom = toolsVisible ? Math.max(24, height - toolsTop + 10) : 24
      if (f && f.top < height && f.bottom > height - buttonHeight - 16) {
        bottom = Math.max(bottom, height - f.top + 12)
      }
      bottom = Math.min(bottom, height - buttonHeight - 110)
      box.style.setProperty('--music-dock-bottom', bottom + 'px')
      box.style.setProperty('--music-dock-right', right + 'px')
      box.style.setProperty('--music-panel-room', Math.max(80, height - bottom - buttonHeight - 100) + 'px')
    })
  }
  function watchFooter() {
    footerObserver.disconnect()
    layoutObserver.disconnect()
    toolObserver.disconnect()
    footer = document.getElementById('footer')
    if (footer) footerObserver.observe(footer)
    layoutObserver.observe(box)
    const body = document.getElementById('body-wrap')
    if (body) layoutObserver.observe(body)
    toolbar = document.getElementById('rightside')
    if (toolbar) {
      layoutObserver.observe(toolbar)
      toolObserver.observe(toolbar, {attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true})
    }
    scheduleDock()
  }
  window.addEventListener('scroll', () => { if (footerVisible) scheduleDock() }, {passive: true})
  window.addEventListener('resize', scheduleDock, {passive: true})
  document.addEventListener('transitionend', event => { if (toolbar?.contains(event.target)) scheduleDock() }, {passive: true})
  window.addEventListener('pageshow', watchFooter)
  const refreshButton = () => {
    button.setAttribute('aria-expanded', String(expanded))
    button.title = expanded ? '收起音乐面板' : '展开音乐面板'
    button.setAttribute('aria-label', button.title + (player && !player.audio.paused ? '，正在播放' : ''))
    button.classList.toggle('is-playing', state === 'playing')
    button.querySelector('span').textContent = expanded ? '收起音乐' : (player && !player.audio.paused ? '音乐 · 播放中' : '音乐')
    const busy = state === 'loading' || state === 'buffering'
    if (busy) button.setAttribute('aria-busy', 'true')
    else button.removeAttribute('aria-busy')
    const failed = state === 'list-error' || state === 'track-error'
    retry.hidden = !failed
    retry.textContent = player ? '重试当前歌曲' : '重试加载'
    document.querySelector('.music-transport').hidden = !player
    document.getElementById('music-list-toggle').textContent = player ? '歌单 · ' + player.list.audios.length : '歌单'
    const mobilePlay = document.querySelector('[data-tool="music"]')
    if (mobilePlay) {
      mobilePlay.textContent = state === 'loading' ? '加载歌单…' : player && !player.audio.paused ? '暂停音乐' : '播放音乐'
      mobilePlay.setAttribute('aria-busy', String(busy))
    }
    document.querySelectorAll('[data-tool="music-prev"], [data-tool="music-next"]').forEach(node => { node.disabled = !player })
    const mobileRetry = document.querySelector('[data-tool="music-retry"]')
    if (mobileRetry) { mobileRetry.hidden = !failed; mobileRetry.textContent = player ? '重试当前歌曲' : '重新加载歌单' }
    const mobileTrack = document.querySelector('[data-music-track]')
    if (mobileTrack) {
      const track = player?.list.audios[player.list.index]
      mobileTrack.hidden = !track
      mobileTrack.textContent = track ? [track.name, track.artist].filter(Boolean).join(' · ') : ''
    }
  }
  const setExpanded = value => {
    expanded = value
    panel.hidden = !value
    refreshButton()
    scheduleDock()
  }
  const message = (text, nextState = state) => {
    state = nextState
    status.textContent = text
    const mobileStatus = document.querySelector('[data-music-status]')
    if (mobileStatus) mobileStatus.textContent = text
    refreshButton()
  }
  const clearPlaybackChecks = () => { clearTimeout(playWatch); clearTimeout(blockedCheck); playWatch = blockedCheck = 0 }
  const failTrack = text => {
    if (!player) return
    clearPlaybackChecks()
    trackFailed = true
    player.pause()
    message(text, 'track-error')
  }
  const watchPlayback = () => {
    clearTimeout(playWatch)
    playWatch = setTimeout(() => { if (player && state === 'buffering') failTrack('当前歌曲加载超时，可重试或播放下一首。') }, 12000)
  }
  const step = direction => {
    if (!player) return
    const resume = !player.audio.paused || trackFailed
    player.pause()
    player.list.switch((player.list.index + direction + player.list.audios.length) % player.list.audios.length)
    if (resume) player.play()
  }
  function loadLibrary() {
    if (library) return library
    library = new Promise((resolve, reject) => {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = '/vendor/aplayer/APlayer.min.css'
      const script = document.createElement('script')
      script.src = '/vendor/aplayer/APlayer.min.js'
      script.async = true
      let cssReady = false
      let scriptReady = false
      let settled = false
      const timer = setTimeout(() => finish(new Error('timeout')), 8000)
      function finish(error) {
        if (settled || (!error && (!cssReady || !scriptReady))) return
        settled = true
        clearTimeout(timer)
        script.onload = script.onerror = css.onload = css.onerror = null
        if (error) { library = null; css.remove(); script.remove(); reject(error) }
        else resolve()
      }
      css.onerror = () => finish(new Error('stylesheet'))
      css.onload = () => { cssReady = true; finish() }
      script.onerror = () => finish(new Error('script'))
      script.onload = () => { scriptReady = !!window.APlayer; finish(scriptReady ? null : new Error('player')) }
      document.head.append(css, script)
    })
    return library
  }
  async function load() {
    if (player) return player
    if (loading) return loading
    message('正在加载歌单…', 'loading')
    loading = (async () => {
      try {
        const [, response] = await Promise.all([
          loadLibrary(),
          fetch('https://api.i-meto.com/meting/api?server=netease&type=playlist&id=12595519825', { signal: AbortSignal.timeout(8000) })
        ])
        if (!response.ok) throw new Error('playlist')
        const data = await response.json()
        const audio = Array.isArray(data) ? data.filter(track => track && /^https?:\/\//.test(track.url)) : []
        if (!audio.length) throw new Error('empty playlist')
        const container = document.createElement('div')
        mount.appendChild(container)
        player = new APlayer({ container, audio, fixed: false, autoplay: false, preload: 'none', lrcType: audio.some(track => track.lrc) ? 3 : 0, theme: '#E76F51', listFolded: true })
        // Own media failures before APlayer schedules automatic skipping; retain the original queue.
        player.audio.addEventListener('error', event => {
          event.stopImmediatePropagation()
          if (player.audio.error) failTrack('当前歌曲暂时无法播放，可重试或播放下一首。')
        }, true)
        const originalPlay = player.play.bind(player)
        player.play = () => {
          if (trackFailed || player.audio.error) player.audio.load()
          trackFailed = false
          clearPlaybackChecks()
          message('正在准备播放…', 'buffering')
          watchPlayback()
          originalPlay()
          blockedCheck = setTimeout(() => {
            if (state === 'buffering' && player.audio.paused) {
              clearPlaybackChecks()
              message('歌单已准备好，请再次点击播放。', 'ready')
            }
          }, 350)
        }
        player.on('play', () => { message('正在缓冲…', 'buffering'); watchPlayback() })
        player.on('playing', () => { clearPlaybackChecks(); message('正在播放', 'playing') })
        player.on('waiting', () => { if (!player.audio.paused) { message('正在缓冲…', 'buffering'); watchPlayback() } })
        player.on('pause', () => { if (!player.audio.paused) return; clearPlaybackChecks(); if (!trackFailed) message('已暂停', 'paused') })
        player.on('listswitch', () => { clearPlaybackChecks(); trackFailed = false; message('已切换歌曲，点击播放。', 'ready') })
        message('歌单已加载，点击播放。', 'ready')
        return player
      } catch (_) {
        message('歌单暂时无法加载，请稍后重试。', 'list-error')
        return null
      } finally {
        loading = null
        refreshButton()
      }
    })()
    return loading
  }
  window.blogMusic = {
    load,
    async togglePlayback() {
      if (player) player.toggle()
      else if (!pendingPlayback) {
        pendingPlayback = true
        try { const loaded = await load(); if (loaded) loaded.play() } finally { pendingPlayback = false }
      }
    },
    previous: () => step(-1),
    next: () => step(1),
    retry: () => player ? player.play() : load(),
    get player() { return player }
  }
  button.addEventListener('click', () => {
    setExpanded(!expanded)
    if (expanded && !player) load()
  })
  collapse.addEventListener('click', () => { setExpanded(false); button.focus({ preventScroll: true }) })
  retry.addEventListener('click', () => window.blogMusic.retry())
  document.getElementById('music-prev').addEventListener('click', () => step(-1))
  document.getElementById('music-next').addEventListener('click', () => step(1))
  document.getElementById('music-list-toggle').addEventListener('click', () => player?.list.toggle())
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded && box.contains(document.activeElement)) {
      setExpanded(false)
      button.focus({ preventScroll: true })
    }
  })
  document.addEventListener('pjax:complete', () => {
    watchFooter()
    const mobileStatus = document.querySelector('[data-music-status]')
    if (mobileStatus) mobileStatus.textContent = status.textContent
    refreshButton()
  })
  refreshButton()
  watchFooter()
})()
