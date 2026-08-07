document.querySelectorAll('#recent-posts .recent-post-item').forEach(card=>{
 let img=card.querySelector('.post_cover img');
 if(img){
  card.style.setProperty('--post-cover',`url(${img.src})`);
 }
});

function initCardClick(){
document.querySelectorAll('#recent-posts .recent-post-items>.recent-post-item').forEach(card=>{

    if(card.dataset.clickBind){
        return;
    }

    let link=card.querySelector('a');

    if(link && link.href){

        card.dataset.clickBind='true';

        card.style.cursor='pointer';

        card.addEventListener('click',e=>{

            if(e.target.closest('a')){
                return;
            }

            if(typeof pjax !== 'undefined'){

                pjax.loadUrl(link.href);

            }else{

                window.location.href=link.href;

            }

        });

    }

});

}

document.addEventListener('DOMContentLoaded',initCardClick);
document.addEventListener('pjax:complete',initCardClick);

// ========== 强制修复：分类磁贴只在首页显示 (强力版) ==========
function forceHideCategoryBar() {
    const path = window.location.pathname;
    const isHomePage = (path === '/' || path === '/index.html' || path.endsWith('/index.html') || path === '');

    const styleId = 'kill-category-bar-style';
    let styleTag = document.getElementById(styleId);

    if (!isHomePage) {
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }
        styleTag.innerHTML = `
            #categoryBar { display: none !important; }
            .recent-post-item:has(#categoryBar) { display: none !important; padding: 0 !important; height: 0 !important; margin: 0 !important; }
        `;
        
        const bar = document.getElementById('categoryBar');
        if (bar) {
            const wrapper = bar.closest('.recent-post-item') || bar.parentElement;
            if (wrapper) wrapper.remove();
            else bar.remove();
        }
    } else {
        if (styleTag) styleTag.remove();
    }
}

forceHideCategoryBar();

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(forceHideCategoryBar, 50);
    setTimeout(forceHideCategoryBar, 300);
});

document.addEventListener('pjax:complete', () => {
    setTimeout(forceHideCategoryBar, 50);
    setTimeout(forceHideCategoryBar, 300);
    setTimeout(forceHideCategoryBar, 1000); // 终极保险
});