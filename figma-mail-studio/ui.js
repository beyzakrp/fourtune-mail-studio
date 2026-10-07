const $=id=>document.getElementById(id);
const templates=window.MAIL_TEMPLATES;
const clone=value=>JSON.parse(JSON.stringify(value));
let idSequence=0;
function newId(){return globalThis.crypto && typeof globalThis.crypto.randomUUID==='function' ? globalThis.crypto.randomUUID() : 'draft-'+Date.now().toString(36)+'-'+(++idSequence)+'-'+Math.random().toString(36).slice(2);}
let handshakeTimer;

let active='creative',tab='content',values=clone(templates.creative.defaults),drafts=[],connected=false,currentId=null,dirty=false;
let timer,saveTimer,renderVersion=0,frameReady=Promise.resolve();
const send=message=>parent.postMessage({pluginMessage:message},'*');
const status=text=>{$('message').textContent=text;};
const fields=[['brand','Marka adı'],['subject','E-posta başlığı'],['preheader','Gelen kutusu önizleme metni'],['quote','Zarf mesajı'],['intro','Giriş metni'],['body','Ana metin'],['tagline','Slogan'],['cta','Buton metni'],['ctaUrl','Buton bağlantısı'],['secondary','İkincil bağlantı metni'],['secondaryUrl','İkincil bağlantı'],['showcaseUrl','Kilitli çalışma bağlantısı']];
function el(tag,attrs={},text){const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function renderFields(){
 const panel=$('fields');panel.replaceChildren();
 document.querySelectorAll('[data-template]').forEach(b=>b.classList.toggle('active',b.dataset.template===active));
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 if(tab==='content')for(const [key,label] of fields){if(!(key in values))continue;const wrap=el('label',{class:'field'});wrap.append(el('span',{},label));const input=el(['preheader','quote','intro','body'].includes(key)?'textarea':'input',{'data-key':key});input.value=values[key];input.addEventListener('input',()=>{values[key]=input.value;changed();});wrap.append(input);panel.append(wrap);}
 if(tab==='images')for(const item of templates[active].images){
  const card=el('section',{class:'image-card'});card.append(el('strong',{},item.label));const img=el('img',{src:values[item.key],alt:item.label});card.append(img);
  const url=el('input',{placeholder:'Kalıcı HTTPS görsel bağlantısı','aria-label':item.label+' bağlantısı'});url.value=values[item.key].startsWith('data:')?'':values[item.key];
  url.addEventListener('change',()=>{if(!MailCore.isURL(url.value)){status('Görsel için geçerli bir HTTPS bağlantısı girin.');return;}values[item.key]=url.value;img.src=url.value;changed();});card.append(url);
  const row=el('div',{class:'actions'}),file=el('input',{type:'file',accept:'image/png,image/jpeg,image/webp',class:'hidden'}),upload=el('button',{},'Bilgisayardan seç'),selection=el('button',{},'Figma seçimini kullan');
  selection.disabled=!connected;selection.onclick=()=>{status('Figma seçimi alınıyor…');send({type:'selection',key:item.key});};upload.onclick=()=>file.click();file.onchange=async()=>{const f=file.files[0];if(!f)return;if(f.size>5*1024*1024||!['image/png','image/jpeg','image/webp'].includes(f.type)){status('En fazla 5 MB PNG, JPEG veya WebP seçin.');return;}const reader=new FileReader();reader.onload=()=>{values[item.key]=reader.result;changed();renderFields();status('Görsel önizlemeye eklendi. HTML indirmeden önce bu görselin kalıcı HTTPS bağlantısını girin.');};reader.readAsDataURL(f);};row.append(upload,selection,file);card.append(row);
  if(values[item.key].startsWith('data:')){const save=el('button',{},'Görseli indir');save.onclick=()=>{const a=el('a',{href:values[item.key],download:item.key+'.png'});a.click();};card.append(save,el('p',{class:'muted'},'Figma / yerel görsel: e-posta için kalıcı bağlantı bekleniyor.'));}
  panel.append(card);
 }
 if(tab==='drafts'){
  const save=el('button',{class:'primary'},'Yeni taslak olarak kaydet');save.onclick=()=>{currentId=null;persist();renderFields();};panel.append(save);
  const backup=el('button',{},'Taslakları dışa aktar');backup.onclick=()=>download(JSON.stringify({version:1,drafts},null,2),'4tune-taslaklar.json','application/json');panel.append(backup);
  const file=el('input',{type:'file',accept:'.json',class:'hidden'}),restore=el('button',{},'Taslak içe aktar');restore.onclick=()=>file.click();file.onchange=async()=>{try{const f=file.files[0];if(!f)return;if(f.size>20*1024*1024)throw Error('Dosya çok büyük.');const json=JSON.parse(await f.text());if(json.version!==1||!Array.isArray(json.drafts))throw Error('Geçersiz taslak dosyası.');const incoming=json.drafts.map(d=>sanitizeDraft(d)).filter(Boolean);drafts=[...drafts,...incoming.map(d=>({...d,id:newId()}))];saveLibrary();renderFields();status(incoming.length+' taslak içe aktarıldı.');}catch(e){status(e.message);}};panel.append(restore,file);
  panel.append(el('p',{class:'muted'},'Taslaklar bu kullanıcının eklenti deposunda saklanır. JSON dosyasıyla ekibe aktarabilirsiniz.'));
  for(const d of drafts){const row=el('div',{class:'draft'}),name=el('div',{},d.values.brand);name.append(el('small',{},templates[d.template].label));const open=el('button',{},'Aç');open.onclick=()=>{persist();active=d.template;values=clone(d.values);currentId=d.id;tab='content';renderFields();renderPreview();};row.append(name,open);panel.append(row);}
 }
}
function sanitizeDraft(d){if(!d||!templates[d.template]||!d.values)return null;const v=clone(templates[d.template].defaults);for(const k of Object.keys(v))if(typeof d.values[k]==='string')v[k]=d.values[k];return {id:String(d.id||newId()),template:d.template,values:v,updated:d.updated||Date.now()};}
function changed(){dirty=true;$('save').textContent='Kaydediliyor…';clearTimeout(timer);timer=setTimeout(renderPreview,180);clearTimeout(saveTimer);saveTimer=setTimeout(persist,700);}
function saveLibrary(){if(connected)send({type:'save',drafts});else{try{localStorage.setItem('4tune-demo-drafts',JSON.stringify(drafts));$('save').textContent='Bu tarayıcıda kaydedildi';}catch{$('save').textContent='Kayıt başarısız';status('Depolama dolu. Taslakları JSON olarak dışa aktarın.');}}}
function persist(){clearTimeout(saveTimer);if(!dirty&&currentId)return;if(!currentId)currentId=newId();const draft={id:currentId,template:active,values:clone(values),updated:Date.now()};const i=drafts.findIndex(d=>d.id===currentId);if(i<0)drafts.unshift(draft);else drafts[i]=draft;dirty=false;saveLibrary();}
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=el('a',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function sizePreview(){const frame=$('preview'),scale=Number($('zoom').value),width=Number($('viewport').value);const doc=frame.contentDocument;const height=Math.max(800,doc?.documentElement.scrollHeight||0,doc?.body.scrollHeight||0);frame.style.width=width+'px';frame.style.height=height+'px';frame.style.transform=`scale(${scale})`;$('preview-holder').style.width=width*scale+'px';$('preview-holder').style.height=height*scale+'px';}
function renderPreview(){
 clearTimeout(timer);const version=++renderVersion,frame=$('preview');frame.style.width=$('viewport').value+'px';frame.style.height='800px';
 frameReady=new Promise(resolve=>{frame.onload=async()=>{const doc=frame.contentDocument;doc.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault();});await Promise.race([Promise.all([...doc.images].map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r;}))),new Promise(r=>setTimeout(r,3500))]);if(version!==renderVersion){resolve();return;}sizePreview();resolve();};});
 frame.srcdoc=MailCore.compile(templates[active],values);
}
$('viewport').onchange=renderPreview;$('zoom').onchange=sizePreview;
document.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>{if(b.dataset.template===active)return;persist();active=b.dataset.template;values=clone(templates[active].defaults);currentId=null;dirty=false;renderFields();renderPreview();status('');});
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;renderFields();});
$('download').onclick=()=>{const errors=MailCore.validate(templates[active],values);if(errors.length){status(errors.join('\n'));return;}persist();download(MailCore.compile(templates[active],values),values.brand.replace(/[^\p{L}\p{N}-]/gu,'-')+'-'+active+'.html','text/html;charset=utf-8');status('HTML indirildi. Konu satırını gönderim uygulamanıza ayrıca girin. Mevcut # bağlantıları ve geçici Figma görsel URL’lerini gönderimden önce kontrol edin.');};
function rgba(value){const n=value.match(/[\d.]+/g);return n&&n.length>=3?{r:+n[0]/255,g:+n[1]/255,b:+n[2]/255,a:n[3]===undefined?1:+n[3]}:null;}
function snapshot(){
 const doc=$('preview').contentDocument,root=doc.querySelector('.email-container'),origin=root.getBoundingClientRect(),nodes=[];
 const intersect=(a,b)=>({x:Math.max(a.x,b.x),y:Math.max(a.y,b.y),right:Math.min(a.right,b.right),bottom:Math.min(a.bottom,b.bottom)});
 function walk(element,clip){
  const s=doc.defaultView.getComputedStyle(element),r=element.getBoundingClientRect();if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return;
  const box={x:r.x-origin.x,y:r.y-origin.y,w:r.width,h:r.height};if(box.w<.1||box.h<.1)return;
  const common={...box,clip,name:element.getAttribute('alt')||element.tagName};const bg=rgba(s.backgroundColor);
  if(bg?.a>0)nodes.push({...common,type:'rect',color:bg,radius:parseFloat(s.borderTopLeftRadius)||0});
  if(['hidden','clip','scroll','auto'].includes(s.overflow))clip=intersect(clip,{x:box.x,y:box.y,right:box.x+box.w,bottom:box.y+box.h});
  if(element.tagName==='IMG'){nodes.push({...common,clip,type:'image',src:element.src});return;}
  for(const child of element.childNodes){
   if(child.nodeType===1)walk(child,clip);
   else if(child.nodeType===3&&child.textContent.trim()){
    const text=child.textContent,range=doc.createRange();let line=null;
    for(let i=0;i<text.length;i++){range.setStart(child,i);range.setEnd(child,i+1);const c=range.getBoundingClientRect();if(!c.width||!c.height)continue;const y=c.y-origin.y,x=c.x-origin.x;if(line&&Math.abs(line.y-y)<1){line.text+=text[i];line.w=Math.max(line.w,x+c.width-line.x);}else{line={type:'text',text:text[i],x,y,w:c.width,h:c.height,clip,color:rgba(s.color),size:parseFloat(s.fontSize),family:s.fontFamily.split(',')[0].replace(/["']/g,''),bold:Number(s.fontWeight)>=600,italic:s.fontStyle==='italic',name:'Metin'};nodes.push(line);}}
   }
  }
 }
 walk(root,{x:0,y:0,right:600,bottom:origin.height});
 return {width:600,height:Math.ceil(origin.height),nodes};
}
$('figma').onclick=async()=>{if(!connected)return;const btn=$('figma');btn.disabled=true;try{$('viewport').value='600';renderPreview();await frameReady;const scene=snapshot();if(scene.nodes.length>3000)throw Error('İçerik çok uzun. Metinleri kısaltın.');send({type:'render',scene,brand:values.brand,label:templates[active].label});status('Figma katmanları oluşturuluyor…');}catch(e){btn.disabled=false;status(e.message);}};
window.addEventListener('message',event=>{if(event.source && event.source!==parent)return;const msg=event.data && event.data.pluginMessage;if(!msg)return;
 if(msg.type==='init'){if(connected)return;connected=true;clearInterval(handshakeTimer);$('standalone').textContent='';$('figma').disabled=false;drafts=(msg.drafts||[]).map(sanitizeDraft).filter(Boolean);if(drafts.length&&!dirty){const d=drafts[0];active=d.template;values=clone(d.values);currentId=d.id;}renderFields();renderPreview();}
 if(msg.type==='saved')$('save').textContent='✓ Kaydedildi';
 if(msg.type==='error'){status(msg.message);$('figma').disabled=false;$('save').textContent='Kontrol gerekli';}
 if(msg.type==='rendered'){status('Figma taslağı oluşturuldu.'+(msg.warnings.length?'\n'+msg.warnings.join('\n'):'')+'\nHTML çıktısı paneldeki içerikten üretilir.');$('figma').disabled=false;}
 if(msg.type==='selection'){let binary='';for(const b of msg.bytes)binary+=String.fromCharCode(b);values[msg.key]='data:image/png;base64,'+btoa(binary);changed();renderFields();status('Seçim görsel olarak eklendi. E-posta için görseli indirip kalıcı HTTPS bağlantısını ekleyin.');}
});
$('figma').disabled=true;renderFields();renderPreview();send({type:'ready'});let handshakeAttempts=0;handshakeTimer=setInterval(()=>{if(connected||++handshakeAttempts>10){clearInterval(handshakeTimer);return;}send({type:'ready'});},1000);
setTimeout(()=>{if(!connected){$('standalone').textContent=window.parent===window?'Tarayıcı önizlemesi':'Figma bağlantısı bekleniyor…';try{drafts=JSON.parse(localStorage.getItem('4tune-demo-drafts')||'[]').map(sanitizeDraft).filter(Boolean);}catch{}}},1000);
