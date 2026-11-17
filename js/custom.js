(() => {
  'use strict'
  let cleanCategoryScroll = () => {}
  function syncSidebarNavigation() {
    const current = document.querySelector('#nav .menus_items a[aria-current="page"]')?.getAttribute('href')
    document.querySelectorAll('#sidebar-menus .menus_items a').forEach(link => {
      if (current && link.getAttribute('href') === current) link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')
    })
  }
  function initCategoryScroll() {
    cleanCategoryScroll()
    const list = document.getElementById('categoryBar-list')
    const controls = document.querySelector('.categoryBar-controls')
    if (!list || !controls) return
    let frame = 0
    const update = () => {
      frame = 0
      const maximum = list.scrollWidth - list.clientWidth
      controls.hidden = maximum < 2
      controls.querySelector('[data-category-scroll="-1"]').disabled = list.scrollLeft < 2
      controls.querySelector('[data-category-scroll="1"]').disabled = list.scrollLeft > maximum - 2
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const resize = new ResizeObserver(schedule)
    resize.observe(list)
    list.addEventListener('scroll', schedule, { passive: true })
    update()
    cleanCategoryScroll = () => { cancelAnimationFrame(frame); resize.disconnect(); list.removeEventListener('scroll', schedule) }
  }
  document.addEventListener('DOMContentLoaded', initCategoryScroll)
  document.addEventListener('pjax:complete', initCategoryScroll)
  document.addEventListener('DOMContentLoaded', syncSidebarNavigation)
  document.addEventListener('pjax:complete', syncSidebarNavigation)
  document.addEventListener('pjax:send', () => cleanCategoryScroll())
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-category-scroll]')
    const list = document.getElementById('categoryBar-list')
    if (button && list) list.scrollBy({ left: Number(button.dataset.categoryScroll) * list.clientWidth * .9, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  })
  // One delegated handler survives PJAX without per-card listeners.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    if (event.target.closest('a, button, input, textarea, select') || window.getSelection().toString()) return
    const card = event.target.closest('#recent-posts .recent-post-items > .recent-post-item')
    const link = card?.querySelector('a.article-title')
    if (!link) return
    if (window.pjax) window.pjax.loadUrl(link.href)
    else window.location.assign(link.href)
  })
})()
