// Standalone Figma plugin runtime. No API key or backend required.
let busy=false;
const post=message=>figma.ui.postMessage(message);
function color(c){return [{type:'SOLID',color:{r:c.r,g:c.g,b:c.b},opacity:c.a===undefined?1:c.a}];}
const cache=new Map();
async function image(src){
 if(cache.has(src))return cache.get(src);
 let result;
 if(src.startsWith('data:image/')){
  const encoded=src.split(',')[1],alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',bytes=[];let buffer=0,bits=0;
  for(const c of encoded){if(c==='=')break;const v=alphabet.indexOf(c);if(v<0)continue;buffer=(buffer<<6)|v;bits+=6;if(bits>=8){bits-=8;bytes.push((buffer>>bits)&255);}}
  result=figma.createImage(new Uint8Array(bytes));
 }else{
  if(!/^https:\/\//.test(src))throw Error('HTTPS gerekli');
  result=await Promise.race([figma.createImageAsync(src),new Promise((_,reject)=>setTimeout(()=>reject(Error('Görsel zaman aşımı')),12000))]);
 }
 cache.set(src,result);return result;
}
figma.ui.onmessage=async message=>{
 try{
  if(message.type==='ready'){post({type:'init',drafts:await figma.clientStorage.getAsync('4tune-drafts-v1')||[]});return;}
  if(message.type==='save'){if(!Array.isArray(message.drafts)||JSON.stringify(message.drafts).length>15000000)throw Error('Taslaklar çok büyük. Yerel görseller yerine HTTPS bağlantılarını kullanın.');await figma.clientStorage.setAsync('4tune-drafts-v1',message.drafts);post({type:'saved'});return;}
  if(message.type==='selection'){
   const selected=figma.currentPage.selection;if(selected.length!==1||!('exportAsync' in selected[0]))throw Error('Figma’da tek bir görsel, katman veya frame seçin.');
   const bytes=await selected[0].exportAsync({format:'PNG',constraint:{type:'SCALE',value:1}});if(bytes.length>5000000)throw Error('Seçim 5 MB’tan büyük. Daha küçük bir görsel seçin.');post({type:'selection',key:message.key,bytes:Array.from(bytes)});return;
  }
  if(message.type==='render'){
   if(busy)throw Error('Önceki taslağın tamamlanmasını bekleyin.');busy=true;
   let frame;
   try{
    const scene=message.scene;if(!scene||!Array.isArray(scene.nodes)||scene.nodes.length>3000||scene.height>30000||scene.width!==600)throw Error('Önizleme boyutu geçersiz.');
    const fonts=await figma.listAvailableFontsAsync(),loaded=new Set(),warnings=new Set();
    async function font(d){const found=fonts.find(f=>f.fontName.family===d.family&&f.fontName.style===(d.bold?'Bold':d.italic?'Italic':'Regular'))||fonts.find(f=>f.fontName.family==='Inter'&&f.fontName.style===(d.bold?'Bold':'Regular'))||fonts[0];if(!found)throw Error('Figma fontu bulunamadı.');const f=found.fontName,key=JSON.stringify(f);if(!loaded.has(key)){await figma.loadFontAsync(f);loaded.add(key);}if(f.family!==d.family)warnings.add('Bazı fontlar Figma’da bulunamadığı için mevcut fontlarla gösterildi.');return f;}
    const sources=[...new Set(scene.nodes.filter(n=>n.type==='image').map(n=>n.src))];
    // Three concurrent image requests; failed images remain explicitly labelled.
    const failures=new Set();let next=0;await Promise.all(Array.from({length:3},async()=>{while(next<sources.length){const src=sources[next++];try{await image(src);}catch{failures.add(src);}}}));
    if(failures.size)warnings.add(failures.size+' görsel yüklenemedi; Figma’da yer tutucu bırakıldı. Görseller sekmesinden bağlantılarını değiştirin.');
    frame=figma.createFrame();frame.name='4tune / '+message.brand+' / '+message.label;frame.resize(600,Math.max(1,scene.height));frame.fills=color({r:1,g:1,b:1});frame.clipsContent=true;frame.x=figma.viewport.center.x-300;frame.y=figma.viewport.center.y;frame.setPluginData('4tune-mail-studio','v1');
    for(const d of scene.nodes){
     if(![d.x,d.y,d.w,d.h].every(Number.isFinite)||d.w<=0||d.h<=0)continue;
     let node;
     if(d.type==='text'){node=figma.createText();node.fontName=await font(d);node.fontSize=Math.max(1,d.size);node.characters=d.text;node.textAutoResize='WIDTH_AND_HEIGHT';node.fills=color(d.color||{r:0,g:0,b:0});}
     else{node=figma.createRectangle();node.resize(Math.max(.01,d.w),Math.max(.01,d.h));if(d.type==='image'){node.fills=failures.has(d.src)?color({r:.92,g:.88,b:.89}):[{type:'IMAGE',imageHash:cache.get(d.src).hash,scaleMode:'FILL'}];}else{node.fills=color(d.color);node.cornerRadius=Math.min(d.radius||0,d.w/2,d.h/2);}}
     node.name=d.name||d.text?.slice(0,30)||'Katman';
     const c=d.clip,clipNeeded=c&&(d.x<c.x||d.y<c.y||d.x+d.w>c.right+.5||d.y+d.h>c.bottom+.5);
     if(clipNeeded){if(c.right<=c.x||c.bottom<=c.y){node.remove();continue;}const group=figma.createFrame();group.name='Kırpılmış / '+node.name;group.fills=[];group.clipsContent=true;group.resize(c.right-c.x,c.bottom-c.y);frame.appendChild(group);group.x=c.x;group.y=c.y;group.appendChild(node);node.x=d.x-c.x;node.y=d.y-c.y;}else{frame.appendChild(node);node.x=d.x;node.y=d.y;}
    }
    figma.currentPage.selection=[frame];figma.viewport.scrollAndZoomIntoView([frame]);figma.commitUndo();post({type:'rendered',warnings:[...warnings]});
   }catch(e){if(frame)frame.remove();throw e;}finally{busy=false;}
  }
 }catch(e){post({type:'error',message:e.message||String(e)});}
};

figma.showUI(__html__,{width:1100,height:780,themeColors:false});
