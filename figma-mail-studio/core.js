(function(root) {
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isURL = value => { try { const u = new URL(value); return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password; } catch { return false; } };
  function compile(template, values) {
    const brand = values.brand.trim() || 'Example Brand';
    const brandText = text => String(text).replace(/Example[ -]Brand/g, () => brand);
    return template.html.replace(/alt="Example Brand"/g, () => 'alt="'+escape(brand)+'"').replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = values[key] ?? template.defaults[key] ?? '';
      if (key.startsWith('image') || key.endsWith('Url')) return escape(value);
      if (Object.hasOwn(template.original, key) && value === template.defaults[key]) {
        // Preserve original inline emphasis when a text block was not edited.
        return template.original[key].replace(/Example[ -]Brand/g, () => escape(brand));
      }
      return escape(brandText(value)).replace(/\r?\n/g, '<br>');
    });
  }
  function validate(template, values) {
    const errors=[];
    if (!values.brand || !values.brand.trim()) errors.push('Marka adını girin.');
    for (const key of ['ctaUrl','secondaryUrl','showcaseUrl']) if(key in template.defaults && !isURL(values[key])) errors.push(key+': geçerli bir HTTPS bağlantısı girin.');
    for (const image of template.images) if(!isURL(values[image.key])) errors.push(image.label+': e-posta için kalıcı HTTPS görsel bağlantısı gerekli.');
    if (!values.cta?.trim()) errors.push('Buton metnini girin.');
    return errors;
  }
  const api={escape,isURL,compile,validate};
  if(typeof module!=='undefined') module.exports=api;
  else root.MailCore=api;
})(typeof window==='undefined'?globalThis:window);
