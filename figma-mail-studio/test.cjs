const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('./core.js');
const templates=require('./templates.json');
for(const [name,t] of Object.entries(templates)){
 const v={...t.defaults},original=core.compile(t,v);
 assert(!/\{\{\w+\}\}/.test(original));
 assert(original.includes('<v:roundrect'));
 v.brand='Acme <script>alert(1)</script>';
 v.cta='Birlikte <başlayalım> & konuşalım';
 v.ctaUrl='https://example.com/?a=1&b=2';
 v.quote='Yeni mesaj\nİkinci satır';
 const html=core.compile(t,v);
 assert(!html.includes('<script>alert(1)</script>'));
 assert(html.includes('Acme &lt;script&gt;'));
 assert.equal((html.match(/Birlikte &lt;başlayalım&gt; &amp; konuşalım/g)||[]).length,2);
 assert(html.includes('Yeni mesaj<br>İkinci satır'));
 assert(html.includes('href="https://example.com/?a=1&amp;b=2"'));
 assert(html.includes('mso'));
 const malicious={...t.defaults,ctaUrl:'javascript:alert(1)'};
 assert(core.validate(t,malicious).some(x=>x.includes('ctaUrl')));
 const local={...t.defaults,[t.images[0].key]:'data:image/png;base64,AA=='};
 assert(core.validate(t,local).some(x=>x.includes('HTTPS')));
 assert(!core.isURL('https://user:pass@example.com'));
 console.log(name+': compiler, escaping, VML and export validation passed');
}
// Validate Figma message flow against a minimal Plugin API contract.
const messages=[],stored={};
const api={showUI(){},ui:{postMessage(m){messages.push(m);}},clientStorage:{async getAsync(k){return stored[k];},async setAsync(k,v){stored[k]=v;}},currentPage:{selection:[]}};
vm.runInNewContext(fs.readFileSync(__dirname+'/code.js','utf8'),{figma:api,__html__:'',Uint8Array,Map,Set,Promise,setTimeout,Error,Array,Number,JSON,String});
(async()=>{await api.ui.onmessage({type:'ready'});assert.equal(messages.pop().type,'init');await api.ui.onmessage({type:'save',drafts:[{id:'one'}]});assert.equal(messages.pop().type,'saved');await api.ui.onmessage({type:'selection',key:'image0'});assert.equal(messages.pop().type,'error');await api.ui.onmessage({type:'render',scene:{width:2,height:2,nodes:[]}});assert.equal(messages.pop().type,'error');console.log('Figma message storage and error handling passed');})().catch(e=>{console.error(e);process.exitCode=1;});
