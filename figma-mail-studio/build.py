"""Bundle the current email templates into a dependency-free Figma plugin."""
from pathlib import Path
import re, json, html

ROOT = Path(__file__).resolve().parent
data = {}
for key, filename, label in [('creative','fourtune-pitch-email.html','Creative Content'),('website','fourtune-website-review-email.html','Website Review')]:
    source = (ROOT.parent / filename).read_text(encoding='utf-8')
    source = source[source.index('<!DOCTYPE html>'):]
    defaults, original = {}, {}
    def tokenize(pattern, field, text=True, flags=re.S):
        global source
        match = re.search(pattern, source, flags)
        if not match: raise ValueError(f'{filename}: missing {field}')
        value = match.group(1)
        original[field] = value
        defaults[field] = html.unescape(re.sub('<[^>]+>', '', re.sub(r'<br\s*/?>', '\n', value, flags=re.I))).strip() if text else value
        source = source[:match.start(1)] + '{{'+field+'}}' + source[match.end(1):]
    tokenize(r'<title>(.*?)</title>', 'subject')
    tokenize(r'<!-- preheader.*?-->\s*<div[^>]*>(.*?)</div>', 'preheader')
    tokenize(r'<!-- el yazısı alıntı.*?-->\s*<div[^>]*>(.*?)</div>', 'quote')
    tokenize(r'<!-- =+ PARAGRAF 1.*?-->.*?<p[^>]*>(.*?)</p>', 'intro')
    tokenize(r'<!-- =+ PARAGRAF 2.*?-->.*?<p[^>]*>(.*?)</p>', 'body')
    tokenize(r'<!-- =+ ETİKET.*?-->.*?<p[^>]*>(.*?)</p>', 'tagline')
    tokenize(r'<!-- =+ CTA BUTONU.*?-->.*?<a[^>]*>(.*?)</a>', 'cta')
    # Keep the Outlook VML and browser CTA synchronized.
    source = re.sub(r'(<v:roundrect\b[^>]*href=")[^"]*', r'\g<1>{{ctaUrl}}', source)
    source = re.sub(r'(<v:roundrect\b.*?<center[^>]*>).*?(</center>)', r'\g<1>{{cta}}\2', source, flags=re.S)
    source = re.sub(r'(<a\b[^>]*href=")[^"]*("[^>]*>\s*\{\{cta\}\})', r'\g<1>{{ctaUrl}}\2', source, flags=re.S)
    defaults['ctaUrl'] = 'https://example.com'
    tokenize(r'<!-- =+ İKİNCİL LİNK.*?-->.*?<a[^>]*>(.*?)</a>', 'secondary')
    tokenize(r'<!-- =+ İKİNCİL LİNK.*?-->.*?<a href="([^"]+)"', 'secondaryUrl', False)
    if key == 'website':
        tokenize(r'<!-- =+ "KİLİTLİ".*?-->.*?<a href="([^"]+)"', 'showcaseUrl', False)
    images = []
    for i, url in enumerate(dict.fromkeys(re.findall(r'<img\b[^>]*src="([^"]+)"', source))):
        field = 'image'+str(i)
        tag = re.search(r'<img\b[^>]*src="'+re.escape(url)+r'"[^>]*>',source).group()
        alt = re.search(r'alt="([^"]*)"',tag)
        name = alt.group(1) if alt and alt.group(1) else ('Zarf görseli' if i == 0 else 'Dekoratif görsel '+str(i+1))
        if '3eed61b8' in url: name='Marka logosu'
        if '66112542' in url or 'envelop.png' in url: name='Zarf görseli'
        defaults[field]=url
        images.append({'key':field,'label':name})
        source=source.replace('src="'+url+'"','src="{{'+field+'}}"')
    defaults['brand']='Example Brand'
    data[key]={'label':label,'html':source,'defaults':defaults,'original':original,'images':images}
(ROOT/'templates.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
page=(ROOT/'ui-source.html').read_text(encoding='utf-8')
bundle='window.MAIL_TEMPLATES='+json.dumps(data,ensure_ascii=False).replace('</','<\\/')+';\n'+(ROOT/'core.js').read_text(encoding='utf-8')+'\n'+(ROOT/'ui.js').read_text(encoding='utf-8')
page=page.replace('/* BUNDLE */',bundle.replace('</script','<\\/script'))
(ROOT/'ui.html').write_text(page,encoding='utf-8')
print('Built ui.html with both current templates.')
