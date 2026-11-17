(() => {
  'use strict'
  let previousY = window.scrollY
  let scheduled = false
  let drawerObserver
  function reset() {
    drawerObserver?.disconnect()
    const scene = document.getElementById('web_bg')
    if (scene) document.getElementById('nav')?.style.setProperty('--bloom-nav-scene', getComputedStyle(scene).backgroundImage)
    previousY = window.scrollY
    document.getElementById('nav')?.classList.remove('nav-show-title')
    const title = document.getElementById('page-name')
    if (title) title.textContent = document.title.replace(/ \| Bloom Isle$/, '')
    document.querySelectorAll('.mobile-tools [data-tool]').forEach(button => {
      const tool = button.dataset.tool
      button.hidden = ['readmode', 'mobile-toc-button'].includes(tool) && !document.getElementById(tool)
    })
    const drawer = document.getElementById('sidebar-menus')
    const trigger = document.querySelector('#toggle-menu button')
    if (drawer && trigger) {
      const syncDrawer = () => {
        const open = drawer.classList.contains('open')
        trigger.setAttribute('aria-expanded', String(open))
        trigger.setAttribute('aria-label', open ? '收起侧边栏' : '打开侧边栏')
      }
      syncDrawer()
      drawerObserver = new MutationObserver(syncDrawer)
      drawerObserver.observe(drawer, { attributes: true, attributeFilter: ['class'] })
    }
  }
  window.scrollToTop = () => {
    document.getElementById('nav')?.classList.remove('nav-show-title')
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  document.addEventListener('click', event => {
    if (event.target.closest('#page-name')) window.scrollToTop()
    const button = event.target.closest('.mobile-tools [data-tool]')
    if (!button) return
    const tool = button.dataset.tool
    if (tool === 'music') window.blogMusic?.togglePlayback()
    else if (tool === 'music-prev') window.blogMusic?.previous()
    else if (tool === 'music-next') window.blogMusic?.next()
    else if (tool === 'music-retry') window.blogMusic?.retry()
    else {
      document.getElementById('menu-mask')?.click()
      document.getElementById(tool)?.click()
    }
  })
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !document.getElementById('sidebar-menus')?.classList.contains('open')) return
    document.getElementById('menu-mask')?.click()
    document.querySelector('#toggle-menu button')?.focus({ preventScroll: true })
  })
  window.addEventListener('scroll', () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      const y = window.scrollY
      const isPost = !!document.getElementById('post')
      document.getElementById('nav')?.classList.toggle('nav-show-title', isPost && y > 100 && y > previousY)
      previousY = y
      scheduled = false
    })
  }, { passive: true })
  document.addEventListener('DOMContentLoaded', reset)
  document.addEventListener('pjax:complete', reset)
})()
