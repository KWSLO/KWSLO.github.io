(function () {
    if (window.musicInit) return
    window.musicInit = true

    function initMusic() {
        const box = document.getElementById('music-player')
        if (!box) return

        const meting = document.createElement('meting-js')

        meting.setAttribute('server', 'netease')
        meting.setAttribute('type', 'playlist')
        meting.setAttribute('id', '12595519825')
        meting.setAttribute('fixed', 'true')
        meting.setAttribute('lrc', '0')

        box.appendChild(meting)
    }

    if (customElements.get('meting-js')) {
        initMusic()
    } else {
        window.addEventListener('load', initMusic)
    }
})()