(() => {
  'use strict'
  let cleanup = () => {}
  const panelMode = matchMedia('(max-width: 1319px)')
  const syncTocButton = () => {
    const toc = document.getElementById('card-toc')
    const button = document.getElementById('mobile-toc-button')
    if (!toc || !button) return
    const expanded = panelMode.matches ? toc.classList.contains('open') : toc.open
    button.setAttribute('aria-controls', 'card-toc')
    button.setAttribute('aria-expanded', String(expanded))
    button.title = expanded ? '收起目录' : '展开目录'
    button.setAttribute('aria-label', button.title)
  }
  const syncWidthButton = () => {
    const button = document.getElementById('hide-aside-btn')
    if (!button) return
    const wide = document.documentElement.classList.contains('hide-aside')
    button.setAttribute('aria-pressed', String(wide))
    button.title = wide ? '恢复标准阅读宽度' : '展开正文，收起侧栏'
    button.setAttribute('aria-label', button.title)
  }
  const closePanel = () => {
    document.getElementById('card-toc')?.classList.remove('open')
    syncTocButton()
  }
  window.blogReading = {
    preservePosition(change) {
      const anchor = [...(document.getElementById('article-container')?.children || [])].find(node => {
        const rect = node.getBoundingClientRect()
        return rect.bottom > 96 && rect.top < innerHeight
      })
      const top = anchor?.getBoundingClientRect().top
      change()
      if (anchor?.isConnected) window.scrollBy({ top: anchor.getBoundingClientRect().top - top, behavior: 'instant' })
    },
    toggleToc() {
      const toc = document.getElementById('card-toc')
      if (!toc) return
      const wasHidden = document.documentElement.classList.contains('hide-aside')
      this.preservePosition(() => document.documentElement.classList.remove('hide-aside'))
      if (panelMode.matches) {
        toc.open = true
        toc.classList.toggle('open')
        if (toc.classList.contains('open')) requestAnimationFrame(() => toc.querySelector('.toc-link')?.focus({ preventScroll: true }))
      } else toc.open = wasHidden || !toc.open
      syncTocButton()
    }
  }
  function init() {
    cleanup()
    const toc = document.getElementById('card-toc')
    document.documentElement.classList.remove('hide-aside')
    if (toc) { toc.open = true; toc.classList.remove('open') }
    document.getElementById('rightside-config-hide')?.classList.remove('show', 'status')
    const onModeChange = () => { closePanel(); if (toc) toc.open = true; syncTocButton() }
    syncTocButton()
    syncWidthButton()
    const observer = new MutationObserver(() => { syncTocButton(); syncWidthButton() })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    toc?.addEventListener('toggle', syncTocButton)
    panelMode.addEventListener('change', onModeChange)
    cleanup = () => {
      toc?.removeEventListener('toggle', syncTocButton)
      panelMode.removeEventListener('change', onModeChange)
      observer.disconnect()
    }
  }
  document.addEventListener('DOMContentLoaded', init)
  document.addEventListener('pjax:complete', init)
  document.addEventListener('pjax:send', () => cleanup())
  document.addEventListener('click', event => {
    if (!panelMode.matches) return
    if (event.target.closest('#card-toc summary')) {
      event.preventDefault()
      closePanel()
      document.getElementById('mobile-toc-button')?.focus({ preventScroll: true })
    } else if (event.target.closest('#card-toc .toc-link')) closePanel()
    else if (!event.target.closest('#card-toc, #mobile-toc-button, [data-tool="mobile-toc-button"]')) closePanel()
  })
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !document.getElementById('card-toc')?.classList.contains('open')) return
    closePanel()
    document.getElementById('mobile-toc-button')?.focus({ preventScroll: true })
  })
})()
