(() => {
  'use strict'
  const image = new Image()
  image.src = '/image/optimized/petal-64.webp'
  const media = matchMedia('(min-width: 769px) and (prefers-reduced-motion: no-preference)')
  let canvas, context, frame = 0, petals = []
  function stop() {
    cancelAnimationFrame(frame)
    frame = 0
    canvas?.remove()
    canvas = null
  }
  function resize() {
    if (!canvas) return
    canvas.width = innerWidth
    canvas.height = innerHeight
  }
  function tick() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    for (const p of petals) {
      p.x -= .5; p.y += p.speed; p.angle += .01
      if (p.y > canvas.height || p.x < -30) { p.y = -30; p.x = Math.random() * canvas.width }
      context.save(); context.translate(p.x, p.y); context.rotate(p.angle)
      context.drawImage(image, 0, 0, p.size, p.size); context.restore()
    }
    frame = requestAnimationFrame(tick)
  }
  function sync() {
    stop()
    const supportedPage = document.getElementById('categoryBar') || document.getElementById('post')
    if (!media.matches || document.hidden || document.body.classList.contains('read-mode') || !supportedPage || !image.complete || !image.naturalWidth) return
    canvas = document.createElement('canvas')
    canvas.id = 'canvas_sakura'
    canvas.setAttribute('aria-hidden', 'true')
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1;opacity:.6'
    document.body.appendChild(canvas)
    context = canvas.getContext('2d')
    if (!context) { stop(); return }
    resize()
    petals = Array.from({length: 6}, () => ({x: Math.random()*innerWidth, y: Math.random()*innerHeight, size: 12+Math.random()*10, speed: .6+Math.random()*.5, angle: Math.random()*6}))
    tick()
  }
  image.addEventListener('load', sync)
  window.addEventListener('resize', resize, {passive: true})
  document.addEventListener('visibilitychange', sync)
  document.addEventListener('DOMContentLoaded', sync)
  document.addEventListener('pjax:send', stop)
  document.addEventListener('pjax:complete', sync)
  media.addEventListener('change', sync)
  let reading = document.body.classList.contains('read-mode')
  new MutationObserver(() => {
    const next = document.body.classList.contains('read-mode')
    if (next !== reading) { reading = next; sync() }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] })
})()
