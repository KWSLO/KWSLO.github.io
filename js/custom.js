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