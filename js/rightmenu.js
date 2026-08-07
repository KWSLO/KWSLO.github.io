// 22.12.8 update：add mask
// 22.12.9 updated: add search in this page

// 【修复1】：将 rmf 挂载到全局 window，防止 HTML 的 onclick 找不到它
window.rmf = window.rmf || {};
let rmf = window.rmf;

function setMask() {
    if (document.getElementsByClassName("rmMask")[0] != undefined) {
        return document.getElementsByClassName("rmMask")[0];
    }
    let mask = document.createElement('div');
    mask.className = "rmMask";
    mask.style.width = window.innerWidth + 'px';
    mask.style.height = window.innerHeight + 'px';
    mask.style.background = '#fff';
    mask.style.opacity = '.0';
    mask.style.position = 'fixed';
    mask.style.top = '0';
    mask.style.left = '0';
    mask.style.zIndex = 99;
    document.body.appendChild(mask);
    return mask;
}

function insertAtCursor(myField, myValue) {
    if (document.selection) {
        myField.focus();
        let sel = document.selection.createRange();
        sel.text = myValue;
        sel.select();
    } else if (myField.selectionStart || myField.selectionStart == '0') {
        let startPos = myField.selectionStart;
        let endPos = myField.selectionEnd;
        let restoreTop = myField.scrollTop;
        myField.value = myField.value.substring(0, startPos) + myValue + myField.value.substring(endPos, myField.value.length);
        if (restoreTop > 0) myField.scrollTop = restoreTop;
        myField.focus();
        myField.selectionStart = startPos + myValue.length;
        myField.selectionEnd = startPos + myValue.length;
    } else {
        myField.value += myValue;
        myField.focus();
    }
}

rmf.showRightMenu = function (isTrue, top = 0, left = 0) {
    let $rightMenu = $('#rightMenu');
    $rightMenu.css('top', top + 'px').css('left', left + 'px');
    if (isTrue) $rightMenu.show();
    else $rightMenu.hide();
}

rmf.switchDarkMode = function () {
    const nowMode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    
    if (typeof btf !== 'undefined' && typeof btf.switchDarkMode === 'function') {
        btf.switchDarkMode();
    } else {
        if (nowMode === 'light') {
            if (typeof activateDarkMode === 'function') activateDarkMode();
            if (typeof saveToLocal !== 'undefined') saveToLocal.set('theme', 'dark', 2);
        } else {
            if (typeof activateLightMode === 'function') activateLightMode();
            if (typeof saveToLocal !== 'undefined') saveToLocal.set('theme', 'light', 2);
        }
    }
    
    if (typeof GLOBAL_CONFIG !== 'undefined' && GLOBAL_CONFIG.Snackbar !== undefined && typeof btf !== 'undefined' && btf.snackbarShow) {
        btf.snackbarShow(nowMode === 'light' ? GLOBAL_CONFIG.Snackbar.day_to_night : GLOBAL_CONFIG.Snackbar.night_to_day);
    }
    
    typeof utterancesTheme === 'function' && utterancesTheme();
    typeof FB === 'object' && window.loadFBComment && window.loadFBComment();
    window.DISQUS && document.getElementById('disqus_thread') && document.getElementById('disqus_thread').children.length && setTimeout(() => window.disqusReset(), 200);
};

rmf.fullScreen = function () {
    const el = document.documentElement;
    const rfs = el.requestFullScreen || el.webkitRequestFullScreen || el.mozRequestFullScreen || el.msRequestFullScreen;
    if (rfs) {
        rfs.call(el);
    } else if (typeof window.ActiveXObject !== "undefined") {
        let wscript = new ActiveXObject("WScript.Shell");
        if (wscript !== null) wscript.SendKeys("{F11}");
    }
};

// 博客设置（通常指阅读模式/简繁切换）
rmf.switchReadMode = function () {
    const $body = document.body;
    $body.classList.add('read-mode');
    const newEle = document.createElement('button');
    newEle.type = 'button';
    newEle.className = 'fas fa-sign-out-alt exit-readmode';
    $body.appendChild(newEle);

    function clickFn() {
        $body.classList.remove('read-mode');
        newEle.remove();
        newEle.removeEventListener('click', clickFn);
    }
    newEle.addEventListener('click', clickFn);
}

rmf.yinyong = function () {
    let e = document.getElementsByClassName("el-textarea__inner")[0];
    if (!e) return;
    let t = document.createEvent("HTMLEvents");
    t.initEvent("input", !0, !0);
    e.value = "> " + getSelection().toString() + "\n\n";
    e.dispatchEvent(t);
    if (typeof Snackbar !== 'undefined') Snackbar.show({ text: '为保证最佳评论阅读体验，建议不要删除空行', pos: 'top-center', showAction: false });
}

rmf.copyWordsLink = function () {
    let url = window.location.href;
    let txa = document.createElement("textarea");
    txa.value = url;
    document.body.appendChild(txa);
    txa.select();
    document.execCommand("Copy");
    document.body.removeChild(txa);
    if (typeof Snackbar !== 'undefined') Snackbar.show({ text: '链接复制成功！', pos: 'top-right', showAction: false });
}

rmf.copySelect = function () { document.execCommand('Copy', false, null); }

rmf.scrollToTop = function () {
    let menusItems = document.getElementsByClassName("menus_items")[1];
    if (menusItems) menusItems.setAttribute("style", "");
    let nameContainer = document.getElementById("name-container");
    if (nameContainer) nameContainer.setAttribute("style", "display:none");
    if (typeof btf !== 'undefined' && btf.scrollToDest) btf.scrollToDest(0, 500);
}

rmf.translate = function () {
    let translateLink = document.getElementById("translateLink");
    if (translateLink) translateLink.click();
}

rmf.searchinThisPage = () => {
    let input = document.getElementsByClassName("local-search-box--input")[0];
    let searchBtn = document.getElementsByClassName("search")[0];
    if (!input || !searchBtn) return;
    if (mask && mask.parentNode) document.body.removeChild(mask);
    input.value = window.getSelection().toString();
    searchBtn.click();
    let evt = document.createEvent("HTMLEvents");
    evt.initEvent("input", false, false);
    input.dispatchEvent(evt);
}

document.body.addEventListener('touchmove', function (e) { }, { passive: false });

function popupMenu() {
    window.oncontextmenu = function (event) {
        if (event.ctrlKey || document.body.clientWidth < 900) return true;
        $('.rightMenu-group.hide').hide();
        if (document.getSelection().toString()) $('#menu-text').show();
        if (document.getElementById('post') || document.getElementById('page')) $('#menu-post').show();
        
        let el = event.target;
        let a = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\*\+,;=.]+$/
        if (a.test(window.getSelection().toString()) && el.tagName != "A") $('#menu-too').show();
        
        if (el.tagName == 'A') {
            $('#menu-to').show()
            rmf.open = function () {
                if (el.href.indexOf("http://") == -1 && el.href.indexOf("https://") == -1) pjax.loadUrl(el.href)
                else location.href = el.href
            }
            rmf.openWithNewTab = function () { window.open(el.href); }
            rmf.copyLink = function () {
                let txa = document.createElement("textarea");
                txa.value = el.href;
                document.body.appendChild(txa);
                txa.select();
                document.execCommand("Copy");
                document.body.removeChild(txa);
            }
        }
        if (el.tagName == 'IMG') {
            $('#menu-img').show()
            rmf.openWithNewTab = function () { window.open(el.src); }
            rmf.click = function () { el.click() }
            rmf.copyLink = function () {
                let txa = document.createElement("textarea");
                txa.value = el.src;
                document.body.appendChild(txa);
                txa.select();
                document.execCommand("Copy");
                document.body.removeChild(txa);
            }
            rmf.saveAs = function () {
                let a = document.createElement('a');
                let url = el.src;
                let filename = url.split("/").pop(); 
                a.href = url;
                a.download = filename;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } else if (el.tagName == "TEXTAREA" || el.tagName == "INPUT") {
            $('#menu-paste').show();
            rmf.paste = function () {
                navigator.permissions.query({ name: 'clipboard-read' }).then(result => {
                    if (result.state == 'granted' || result.state == 'prompt') {
                        navigator.clipboard.readText().then(text => insertAtCursor(el, text))
                    }
                })
            }
        }
        
        let pageX = event.clientX + 10;
        let pageY = event.clientY;
        let rmWidth = $('#rightMenu').width();
        let rmHeight = $('#rightMenu').height();
        if (pageX + rmWidth > window.innerWidth) pageX -= rmWidth + 10;
        if (pageY + rmHeight > window.innerHeight) pageY -= pageY + rmHeight - window.innerHeight;

        mask = setMask();
        window.onscroll = () => {
            rmf.showRightMenu(false);
            window.onscroll = () => { }
            if (mask && mask.parentNode) document.body.removeChild(mask);
        }
        $(".rightMenu-item").click(() => {
            if (mask && mask.parentNode) document.body.removeChild(mask);
        })
        $(window).resize(() => {
            rmf.showRightMenu(false);
            if (mask && mask.parentNode) document.body.removeChild(mask);
        })
        mask.onclick = () => {
            if (mask && mask.parentNode) document.body.removeChild(mask);
        }
        rmf.showRightMenu(true, pageY, pageX);
        return false;
    };
    window.addEventListener('click', function () { rmf.showRightMenu(false); });
}

if (!(navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i))) {
    popupMenu()
}

const box = document.documentElement
function addLongtabListener(target, callback) {
    let timer = 0
    target.ontouchstart = () => {
        timer = 0
        timer = setTimeout(() => { callback(); timer = 0 }, 380)
    }
    target.ontouchmove = () => { clearTimeout(timer); timer = 0 }
    target.ontouchend = () => { if (timer) clearTimeout(timer) }
}
addLongtabListener(box, popupMenu)

// ========== APlayer 音乐控制 ==========
rmf.getAPlayer = function () {
    const meting = document.querySelector('meting-js');
    return (meting && meting.aplayer) ? meting.aplayer : null;
}

// 播放音乐
rmf.musicPlay = function () {
    const ap = rmf.getAPlayer();
    if (ap) ap.play();
    else Snackbar.show({ text: '音乐播放器未加载', pos: 'top-center', showAction: false });
}

// 暂停音乐
rmf.musicPause = function () {
    const ap = rmf.getAPlayer();
    if (ap) ap.pause();
}

// 上一首
rmf.musicPrev = function () {
    const ap = rmf.getAPlayer();
    if (ap) ap.skipBack();
}

// 下一首
rmf.musicNext = function () {
    const ap = rmf.getAPlayer();
    if (ap) ap.skipForward();
}

// 开启/关闭歌词
rmf.musicLrc = function () {
    const ap = rmf.getAPlayer();
    if (ap && ap.lrc) ap.lrc.toggle();
}