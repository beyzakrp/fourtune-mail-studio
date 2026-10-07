# 4tune Mail Studio — Figma eklentisi

İki mevcut e-posta şablonunu kod yazmadan düzenlemek için hazırlanmış bağımsız Figma Design eklentisi. Sunucu veya API anahtarı gerekmez. Orijinal HTML dosyaları değiştirilmez.

## İlgili projeler

- [Fourtune Agency](https://fourtuneagency.com) — Fourtune ajansının web sitesi.
- [Seagull Trading](https://seagulltrading.me) — İlgili web projesi.

## Kurulum

1. Bu klasördeki **setup.html** dosyasını tarayıcıda açın.
2. Sayfadaki adımlarla Figma masaüstünde **Plugins → Development → New plugin** üzerinden bir eklenti oluşturun. Figma kendi eklenti kimliğini verir.
3. Figma'nın oluşturduğu `manifest.json` dosyasını kurulum sayfasından seçin. Sayfa hazır yapılandırmayı bu kimlikle indirir; kod düzenlemeniz gerekmez.
4. İndirilen manifest dosyasını bu klasördeki `manifest.json` yerine kaydedin. **Plugins → Development → Import plugin from manifest** ile bu dosyayı Figma'ya ekleyin.
5. **4tune Mail Studio** eklentisini çalıştırın.

Depodaki manifest, henüz Figma tarafından verilmiş bir `id` içermeyen yapılandırma şablonudur. İlk kurulumda bu kimlik gerekir. Eklenti hesabınıza otomatik yüklenmiş veya yayınlanmış değildir. Ekip dağıtımı/yayınlama ayrıca Figma hesabında yapılır.

## Kullanım

- **İçerik:** marka, e-posta başlığı, preheader, zarf mesajı, paragraflar, slogan ve bağlantılar.
- **Görseller:** mevcut resim URL'sini değiştirme, bilgisayardan resim seçme veya Figma'daki tek bir seçimi PNG olarak kullanma. PNG/JPEG/WebP; en fazla 5 MB.
- **Taslaklar:** otomatik kayıt, yeni kopya, tekrar açma, JSON dışa/içe aktarma. Kayıtlar kullanıcıya özeldir; ekip ile paylaşmak için JSON kullanın.
- **Canlı önizleme:** mevcut HTML'in tarayıcı görünümü; 600 px masaüstü ve 375 px mobil kontrolü. Mobil mod, şablondaki mevcut taşmaları da gösterir, bunları otomatik düzeltmez.
- **Figma taslağı oluştur:** gerçek HTML önizlemesinin ölçülerinden yeni, düzenlenebilir metin/görsel/zemin katmanları üretir. Her tıklama yeni bir frame oluşturur; eski frame silinmez. Katmanlar Figma'nın Geri Al işlemiyle kaldırılabilir.
- **HTML indir:** mevcut şablonun CSS'ini ve Outlook VML butonunu korur. Metinler HTML açısından güvenli biçimde işlenir. Konu satırını gönderim aracında ayrıca doldurun.

## Görsel bağlantıları

Bilgisayardan veya Figma seçiminden eklenen resimler önizleme ve Figma taslağında kullanılabilir. E-posta HTML'i indirmek için bunları kendi görsel sunucunuza yükleyip kalıcı **HTTPS** URL'lerini girin. Eklenti dosyaları otomatik olarak herhangi bir sunucuya yüklemez.

Public sürümde özgün Figma/S3 görselleri yerine `example.com` görsel yer tutucuları kullanılır; bunlar gerçek görsel sunmaz. Marka örnekleri, iletişim bilgileri ve adresler örnek değerlerle değiştirilmiştir. Görselleri ve hazır menü/sosyal bağlantılarındaki `#` yer tutucularını gönderimden önce tamamlayın. Footer düzeni korunur; bu sürüm footer bağlantıları için ayrı bir yönetim paneli içermez.

## Sınırlar ve doğrulama

- Tarayıcı önizlemesi Gmail/Outlook testi değildir. Mevcut taslakların absolute positioning, harici font ve kırpma özellikleri her e-posta istemcisinde aynı görünmeyebilir.
- Figma katmanlarında yapılan serbest düzenlemeler HTML'e geri aktarılmaz; kaynak paneldeki içeriktir.
- Figma'ya aktarım görsel açıdan yaklaşık bir katman dönüşümüdür. Font bulunamazsa Inter/mevcut font kullanılır; gradyanlar, harf aralıkları, gölgeler ve karmaşık kırpma birebir dönüştürülmez. Yüklenemeyen resimler uyarıyla yer tutucu olur.
- Eklentinin gerçek Figma masaüstü ortamında kurulum ve uçtan uca çalıştırma testi henüz yapılmadı. HTML üretimi, tarayıcı arayüzü ve Plugin API sözleşme testleri yerel ortamda kontrol edildi.

## Geliştirme

`ui.html` tek dosyalık hazır paneldir. Yeniden derleme için Python ve testler için Node kullanılır:

```text
python figma-mail-studio/build.py
node figma-mail-studio/test.cjs
```

Komutları depo kökünden çalıştırın. `build.py`, üst klasördeki iki HTML'in **güncel halini** tekrar paketler. `ui-source.html`, `ui.js`, `core.js` panel kaynakları; `code.js` Figma çalışma kodudur. Tarayıcı otomasyonu için Playwright ve Google Chrome gerekir; ayrıntılar kök README dosyasındadır.

Figma referansı: https://developers.figma.com/docs/plugins/manifest/
