(function () {
if (window.musicInit) return
window.musicInit = true

function hideLrc(){
    const timer=setInterval(()=>{
        const lrcButton=document.querySelector('.aplayer-icon-lrc')
        if(lrcButton){
            lrcButton.click()
            clearInterval(timer)
        }
    },200)
}


function initMusic() {
    const box = document.getElementById('music-player')
    if (!box) return

    const meting = document.createElement('meting-js')

    meting.setAttribute('server', 'netease')
    meting.setAttribute('type', 'playlist')
    meting.setAttribute('id', '12595519825')
    meting.setAttribute('fixed', 'true')

    box.appendChild(meting)

    hideLrc()
}


if (customElements.get('meting-js')) {
    initMusic()
} else {
    window.addEventListener('load', initMusic)
}

})()