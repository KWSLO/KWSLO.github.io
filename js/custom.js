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

function fixCategoryBarDisplay() {
    const path = window.location.pathname;

    // 判断是否为首页（兼容 '/' 和 '/index.html'）
    // ⚠️ 如果你的博客部署在子目录（例如 https://xxx.github.io/blog/），
    // 请把 '/' 改为 '/blog/'，'/index.html' 改为 '/blog/index.html'
    const isHomePage = (path === '/' || path === '/index.html' || path.endsWith('/index.html'));

    const categoryBar = document.getElementById('categoryBar');
    if (categoryBar) {
        categoryBar.style.display = isHomePage ? 'block' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', fixCategoryBarDisplay);
document.addEventListener('pjax:complete', fixCategoryBarDisplay);

fixCategoryBarDisplay();