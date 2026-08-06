/**
 * 导航栏滚动切换：向下滚动显示页面标题，向上滚动恢复菜单
 * 通过 CSS class 控制状态，避免内联样式污染
 */
;(() => {
  'use strict'

  const NAV_STATE_CLASS = 'nav-show-title' // 向下滚动时添加到 #nav
  const SCROLL_THRESHOLD = 50

  let lastScrollTop = 0
  let ticking = false
  let scrollHandler = null

  function updateNav () {
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const nav = document.getElementById('nav')
    if (!nav) return

    if (scrollTop > lastScrollTop && scrollTop > SCROLL_THRESHOLD) {
      // 向下滚动：显示标题，隐藏菜单
      nav.classList.add(NAV_STATE_CLASS)
    } else {
      // 向上滚动：恢复菜单，隐藏标题
      nav.classList.remove(NAV_STATE_CLASS)
    }

    lastScrollTop = scrollTop
    ticking = false
  }

  function onScroll () {
    if (!ticking) {
      window.requestAnimationFrame(updateNav)
      ticking = true
    }
  }

  function init () {
    // 设置页面标题文字
    const pageName = document.getElementById('page-name')
    if (pageName) {
      const titleParts = document.title.split(" | Bloom Isle")
      pageName.innerText = titleParts[0] || document.title
    }

    // 清理旧监听器，避免 PJAX 切换后重复绑定
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler)
    }

    // 重置状态
    lastScrollTop = window.scrollY || document.documentElement.scrollTop
    const nav = document.getElementById('nav')
    if (nav) nav.classList.remove(NAV_STATE_CLASS)

    scrollHandler = onScroll
    window.addEventListener('scroll', scrollHandler, { passive: true })
  }

  // 全局方法：回到顶部时重置 nav 状态
  window.scrollToTop = () => {
    const nav = document.getElementById('nav')
    if (nav) nav.classList.remove(NAV_STATE_CLASS)
    if (typeof btf !== 'undefined') {
      btf.scrollToDest(0, 500)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  document.addEventListener('DOMContentLoaded', init)
  document.addEventListener('pjax:complete', init)
})()