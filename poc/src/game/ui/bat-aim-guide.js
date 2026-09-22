function createBatAimGuide({ $, tiles, stage, batRig, game, isBusy }) {
  const guide=$('bat-aim-guide'), outline=$('bat-aim-outline'), point=$('bat-aim-point');
  let selected=null, touchInput=false;
  function hide(){
    guide.setAttribute('hidden','');
    if(selected)selected.classList.remove('aimed');
    selected=null;
  }
  function show(tile,index){
    if(game.status!=='playing'||isBusy()||tile.disabled||document.querySelector('dialog[open]')){hide();return;}
    const rect=tile.getBoundingClientRect(),field=stage.getBoundingClientRect();
    const preview=batRig.contactPreview({x:rect.left+rect.width/2-field.left,y:rect.top+rect.height/2-field.top},Math.floor(index/5),index%5);
    if(!preview){hide();return;}
    if(selected!==tile){hide();selected=tile;tile.classList.add('aimed');}
    guide.setAttribute('viewBox','0 0 '+field.width+' '+field.height);
    outline.setAttribute('d',preview.outline.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join(' ')+' Z');
    point.setAttribute('transform','translate('+preview.contact.x+' '+preview.contact.y+')');
    guide.dataset.zone=String(index);guide.removeAttribute('hidden');
  }
  tiles.forEach((tile,index)=>{
    tile.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'||event.pointerType==='pen'){touchInput=false;show(tile,index);}});
    tile.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'||event.pointerType==='pen'){touchInput=false;show(tile,index);}});
    tile.addEventListener('pointerleave',hide);
    tile.addEventListener('focus',()=>{if(!touchInput&&tile.matches(':focus-visible'))show(tile,index);});
    tile.addEventListener('blur',hide);
  });
  document.addEventListener('pointerdown',event=>{touchInput=event.pointerType==='touch';hide();},true);
  document.addEventListener('keydown',()=>{touchInput=false;},true);
  document.addEventListener('visibilitychange',hide);
  window.addEventListener('blur',hide);
  window.addEventListener('resize',hide);
  return {hide};
}
