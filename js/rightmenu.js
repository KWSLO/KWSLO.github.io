(() => {
  'use strict'
  let target = null
  const menu = () => document.getElementById('rightMenu')
  const close = () => { if (menu()) menu().hidden = true }
  function notify(text) {
    if (window.btf?.snackbarShow && window.Snackbar) window.btf.snackbarShow(text)
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); notify('已复制') }
    catch (_) { notify('复制失败，请使用浏览器复制功能') }
  }
  function navigate(url) {
    if (window.pjax && new URL(url, location.href).origin === location.origin) window.pjax.loadUrl(url)
    else location.assign(url)
  }
  window.rmf = {
    scrollToTop: () => window.scrollToTop(),
    copySelect: () => copy(window.getSelection().toString()),
    copyWordsLink: () => copy(location.href),
    copyLink: () => copy(target?.href || target?.src || ''),
    open: () => target?.href && navigate(target.href),
    openWithNewTab: () => {
      const url = target?.href || target?.src
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    },
    click: () => target?.click(),
    saveAs: () => {
      if (!target?.src) return
      const a = document.createElement('a')
      a.href = target.src
      a.download = new URL(target.src).pathname.split('/').pop()
      a.click()
    },
    paste: async () => {
      const input = target
      if (!input || !('setRangeText' in input)) return
      try {
        const text = await navigator.clipboard.readText()
        input.setRangeText(text, input.selectionStart ?? 0, input.selectionEnd ?? 0, 'end')
        input.dispatchEvent(new Event('input', { bubbles: true }))
      } catch (_) { notify('无法读取剪贴板，请使用系统粘贴') }
    },
    searchinThisPage: () => {
      const text = window.getSelection().toString().trim()
      if (!text) return
      document.querySelector('#search-button .search')?.click()
      const input = document.querySelector('.local-search-input input')
      if (input) { input.value = text; input.dispatchEvent(new Event('input', { bubbles: true })) }
    },
    fullScreen: () => {
      const promise = document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.()
      promise?.catch(() => notify('当前浏览器无法进入全屏'))
    },
    switchReadMode: () => document.getElementById('readmode')?.click(),
    musicPlay: () => {
      const player = window.blogMusic?.player
      if (player) player.play()
      else window.blogMusic?.load()
    },
    musicPause: () => window.blogMusic?.player?.pause(),
    musicPrev: () => window.blogMusic?.player?.skipBack(),
    musicNext: () => window.blogMusic?.player?.skipForward(),
    musicLrc: () => window.blogMusic?.player?.lrc?.toggle()
  }
  document.addEventListener('contextmenu', event => {
    const panel = menu()
    if (!panel || event.ctrlKey || matchMedia('(max-width: 900px), (pointer: coarse)').matches) return
    event.preventDefault()
    target = event.target.closest('img, a, textarea, input') || event.target
    const selected = window.getSelection().toString().trim()
    const groups = {
      'menu-text': !!selected,
      'menu-too': /^https?:\/\/\S+$/.test(selected),
      'menu-post': !!document.getElementById('post-comment'),
      'menu-to': target.matches('a'),
      'menu-img': target.matches('img'),
      'menu-paste': target.matches('textarea, input:not([type=password])')
    }
    for (const [id, show] of Object.entries(groups)) {
      const group = document.getElementById(id)
      if (group) group.hidden = !show
    }
    panel.hidden = false
    panel.style.left = Math.max(4, Math.min(event.clientX, innerWidth - panel.offsetWidth - 4)) + 'px'
    panel.style.top = Math.max(4, Math.min(event.clientY, innerHeight - panel.offsetHeight - 4)) + 'px'
  })
  document.addEventListener('click', close)
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close() })
  document.addEventListener('pjax:send', close)
  window.addEventListener('scroll', close, { passive: true })
  window.addEventListener('resize', close, { passive: true })
})()
