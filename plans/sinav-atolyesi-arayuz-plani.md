# Sınav Atölyesi — Etkileşimli Arayüz Prototipi Planı

## 1. Amaç

Öğretmenlerin bir sınav kâğıdını hızlıca oluşturabildiği, elle veya PDF’den soru ekleyebildiği ve sonucu A4 üzerinde anlık görebildiği, Türkçe ve masaüstü odaklı bir etkileşimli prototip hazırlamak.

Prototipin ana başarı ölçütü: Kullanıcı, ilk bakışta nereden soru ekleyeceğini anlamalı; örnek soruları sınava ekleyip sıralayabilmeli; sınav başlığı ve soru ayarlarını değiştirebilmeli; cevap anahtarı ve çıktı kontrollerine ulaşabilmelidir.

## 2. Mevcut Teknik Zemin

- Proje React 19 + TypeScript + Vite 8 kullanıyor.
- Stil altyapısı Tailwind CSS v4; global tema ve özel stiller `src/index.css` içinde tutulacak.
- `src/App.tsx` boş bir başlangıç bileşeni; mevcut korunması gereken ürün akışı veya tasarım sistemi yok.
- Backend, yönlendirme, ikon kütüphanesi veya kalıcı veri katmanı bulunmuyor.
- Geliştirme sunucusu ortam tarafından çalıştırılıyor; ayrıca sunucu başlatılmayacak.

## 3. Kararlaştırılan Ürün Kapsamı

### Hedef kullanıcı

- Öncelikli kullanıcı: Öğretmenler.
- Demo içeriği: 7. sınıf Matematik, “Oran ve Orantı”.
- Marka adı: **Sınav Atölyesi**.

### İlk sürüm

- Gerçekçi, etkileşimli frontend prototipi.
- Gerçek kullanıcı hesabı, veri saklama, AI üretimi ve PDF ayrıştırma olmayacak.
- Uygulama yenilendiğinde örnek başlangıç durumuna dönebilir.

### Ana deneyim

- Üç panelli sınav editörü:
  1. Sol tarafta gezinme ve soru ekleme araçları.
  2. Ortada A4 sınav önizlemesi.
  3. Sağda sınav veya seçili soru ayarları.
- Dört soru tipi:
  - Çoktan seçmeli
  - Doğru / yanlış
  - Boşluk doldurma
  - Klasik
- PDF’den soru ekleme akışı gerçekçi biçimde simüle edilecek.
- A4 önizleme, cevap anahtarı kontrolü, yazdırma ve PDF indirme kontrolleri gösterilecek.

## 4. Bilgi Mimarisi ve Ekran Yapısı

Tek React ekranı içinde ürün kabuğu ve sınav editörü oluşturulacak. Ayrı route eklenmeyecek.

### 4.1. Sol ürün navigasyonu

- Marka işareti ve “Sınav Atölyesi” adı.
- “Yeni sınav” ana aksiyonu.
- Navigasyon seçenekleri:
  - Sınavlarım
  - Soru bankası
  - Şablonlar
- Aktif alan “Sınavlarım / Yeni sınav” olarak belirgin gösterilecek.
- Alt bölümde sade yardım bağlantısı ve örnek öğretmen profili yer alacak.
- Navigasyon öğeleri prototipte tıklandığında sayfa değiştirmek yerine kısa bilgi bildirimi gösterebilir; ana görev editörden ayrılmayacak.

### 4.2. Üst araç çubuğu

- Geri dönüş / breadcrumb: “Sınavlarım / Yeni sınav”.
- Düzenlenebilir sınav adı: “7. Sınıf Matematik — Oran ve Orantı”.
- Otomatik kayıt hissi veren “Kaydedildi” durumu; gerçek kalıcılık iddia edilmeyecek.
- İkincil “Önizle” düğmesi.
- Birincil “PDF indir” düğmesi.

### 4.3. Sol soru araçları paneli

- “Soru ekle” başlığı ve kısa yönlendirme.
- Dört soru tipini temsil eden kompakt ekleme kartları/düğmeleri.
- Ayrıştırıcıdan sonra güçlü ama sade “PDF’den soru aktar” çağrısı.
- “Soru havuzu” altında sınava eklenebilecek 2–3 hazır 7. sınıf Matematik örneği.
- Eklenen hazır soru, havuzda “Eklendi” durumuna geçecek veya tekrar eklemeyi engelleyecek.

### 4.4. Orta A4 önizleme alanı

- Açık gri çalışma yüzeyi üzerinde beyaz, gerçek kâğıt oranına yakın A4 kart.
- Kâğıt üst bilgisi:
  - Okul adı
  - Ders / konu
  - Ad soyad, sınıf, numara ve tarih alanları
  - Sınav süresi ve toplam puan
- Soru listesi:
  - Numara
  - Soru tipi etiketi
  - Soru metni
  - Seçenekler veya cevap alanı
  - Puan bilgisi
- Seçili soru, kâğıt üzerinde ince vurgu çerçevesi ve tutamaç/eylem alanı ile gösterilecek.
- Sorular için:
  - Seçme
  - Yukarı/aşağı taşıma
  - Çoğaltma
  - Silme
  işlevleri bulunacak.
- Alt kısımda toplam soru ve toplam puan özeti.
- “Cevap anahtarı” açık olduğunda aynı kâğıdın altında veya devam sayfasında kompakt cevap listesi gösterilecek.

### 4.5. Sağ ayarlar paneli

Seçim durumuna göre iki görünüm:

#### Sınav ayarları

- Sınav başlığı
- Okul adı
- Sınıf
- Ders / konu
- Süre
- Tarih
- Cevap anahtarını göster anahtarı

#### Soru ayarları

- Soru tipi
- Soru metni
- Çoktan seçmelide seçenek metinleri ve doğru cevap
- Diğer tiplerde örnek cevap / cevap anahtarı
- Puan
- Zorluk etiketi: Kolay / Orta / Zor
- “Soruyu sil” ikincil tehlike aksiyonu

Form değişiklikleri A4 önizlemesine anlık yansıyacak.

## 5. PDF’den Soru Aktarma Akışı

PDF işlemi ayrı bir modal/drawer üzerinden simüle edilecek:

1. Kullanıcı “PDF’den soru aktar” düğmesine basar.
2. Modal içinde sürükle-bırak alanı ve “Dosya seç” düğmesi görünür.
3. Yalnızca `.pdf` kabul eden dosya input’u kullanılır.
4. Dosya seçilince kısa bir “Sorular taranıyor” yükleme durumu gösterilir.
5. Gerçek dosya içeriği okunmadan, önceden tanımlı üç örnek “algılanmış soru” listelenir.
6. Her soruda:
   - Önizleme
   - Algılanan soru tipi
   - Seçim kutusu
   - Sayfa numarası etiketi
   bulunur.
7. “Seçilenleri ekle” ile seçili sorular sınava eklenir, modal kapanır ve başarı bildirimi gösterilir.
8. Dosya seçilmeden ilerlenemez; PDF dışı seçimde kullanıcı dostu hata metni gösterilir.

Arayüz, işlemin gerçek PDF ayrıştırması olduğu yönünde yanıltıcı kalıcı bir iddia taşımayacak; prototip davranışı örnek veri üzerinden yürütülecek.

## 6. Etkileşim ve Durum Modeli

`App.tsx` içinde tipli örnek veri ve yerel React state kullanılacak:

- `examMeta`: sınav üst bilgileri.
- `questions`: soru dizisi.
- `selectedQuestionId`: seçili soru.
- `showAnswerKey`: cevap anahtarı görünürlüğü.
- `pdfImportStep`: kapalı / yükleme / tarama / seçim.
- `toast`: kullanıcı geri bildirimi.

Her soru en az şu alanları taşıyacak:

- `id`
- `type`
- `prompt`
- `points`
- `difficulty`
- tipe göre `options`, `correctAnswer` veya `answer`

### Davranışlar

- Soru tipi düğmesine basınca o tipe uygun başlangıç şablonu listeye eklenir ve seçilir.
- Soru seçilince sağ panel soru ayarlarına geçer.
- Boş A4 alanına veya sınav üst bilgisine basınca sağ panel sınav ayarlarına döner.
- Silme sonrası en yakın kalan soru seçilir; hiç soru kalmazsa boş durum gösterilir.
- Taşıma düğmeleri sınırda pasif olur.
- Toplam puan soruların puanlarından hesaplanır.
- Önizle düğmesi yan panelleri gizleyen odaklı önizleme katmanı açar.
- Yazdır düğmesi `window.print()` kullanabilir.
- PDF indir düğmesi gerçek dosya üretmek yerine “PDF çıktısı prototipte simüle edildi” benzeri açık bir bildirim verir.
- Bildirimler kısa süre sonra kapanır ve ekran okuyucu için canlı bölge kullanır.

## 7. Görsel Tasarım Yönü

### Genel karakter

- Minimal, sakin, profesyonel ve öğretmen odaklı.
- Oyunlaştırma, yoğun gradient, parlak neon renkler veya çocuk uygulaması estetiği kullanılmayacak.
- Yoğun editör yapısına rağmen belirgin hiyerarşi ve ferah boşluk korunacak.

### Renk sistemi

- Zemin: sıcak kırık beyaz / açık taş tonu.
- Paneller ve A4: beyaz.
- Ana metin: koyu lacivert-gri.
- İkincil metin: nötr gri.
- Ana vurgu: sakin mavi veya petrol mavisi.
- Destek vurgu: çok açık mavi yüzey.
- Başarı: düşük doygunluklu yeşil.
- Tehlike: ölçülü kırmızı.
- Kenarlıklar: ince, açık nötr ton.

### Tipografi ve biçim

- Kamuya açık bir Google fontu olan **Inter** veya **Manrope** CSS importuyla kullanılacak; Türkçe karakter desteği sağlanacak.
- Başlıklar kontrollü ağırlıkta, arayüz metinleri yüksek okunabilirlikte olacak.
- 8 px tabanlı boşluk sistemi.
- Panellerde 12–16 px köşe yarıçapı; A4 üzerinde daha düşük yarıçap.
- Gölgeler çok hafif; panel ayrımı esas olarak zemin ve kenarlıkla yapılacak.
- İkonlar için mevcut sistem olmadığı için `lucide-react` bağımlılığı eklenecek; metin yerine emoji kullanılmayacak.

### Mikro etkileşimler

- Hover, focus, selected ve disabled durumları açıkça ayrılacak.
- Modal ve toast için kısa, dikkat dağıtmayan geçişler.
- `prefers-reduced-motion` durumunda animasyonlar azaltılacak.

## 8. Responsive Davranış

### Geniş masaüstü

- Tam üç panelli düzen.
- Sol navigasyon sabit dar sütun; soru araçları ve sağ ayarlar ayrı paneller.
- A4 orta alanda kaydırılabilir ve merkezlenmiş.

### Dizüstü / tablet yatay

- Sol ürün navigasyonu ikon ağırlıklı daraltılır.
- Soru araçları genişliği küçülür.
- Sağ ayarlar gerektiğinde açılıp kapanan drawer olur.

### Mobil

- Tam A4 düzenini küçük ekrana sıkıştırmak yerine görev odaklı görünüm:
  - Üstte kompakt araç çubuğu.
  - Alt sekmeler: Sorular / Kâğıt / Ayarlar.
  - Paneller tek tek tam genişlikte gösterilir.
- Modal tam ekran sheet’e dönüşür.
- Dokunma hedefleri en az 44 px olur.

## 9. Erişilebilirlik

- Tüm kontroller gerçek `button`, `input`, `select`, `textarea` elemanlarıyla kurulacak.
- İkon düğmelerinde Türkçe `aria-label` bulunacak.
- Modal odak yönetimi, `Escape` ile kapanma ve semantik dialog özellikleri içerecek.
- Form alanlarında görünür etiket kullanılacak.
- Renk tek başına durum anlatmayacak; metin/ikon desteği olacak.
- Klavye focus halkaları belirgin olacak.
- Metin ve kontrol kontrastları WCAG AA hedefleyecek.

## 10. Dosya ve Bileşen Planı

Kapsam küçük tutulduğu için gereksiz mimari katman eklenmeyecek:

- `src/App.tsx`
  - Veri tipleri ve örnek sınav/soru verileri
  - Ürün kabuğu
  - Navigasyon
  - Üst araç çubuğu
  - Soru araç paneli
  - A4 sınav önizlemesi
  - Ayarlar paneli
  - PDF içe aktarma modalı
  - Önizleme katmanı ve toast
  - Yerel state ve tüm prototip etkileşimleri
- `src/index.css`
  - Tailwind importu
  - Google font importu
  - Tema değişkenleri ve base stilleri
  - A4/print stilleri
  - Kaydırma, modal ve azaltılmış hareket gibi az sayıdaki global yardımcı stil
- `package.json` ve `pnpm-lock.yaml`
  - `lucide-react` ikon bağımlılığı

Bileşenler `App.tsx` içinde anlamlı yerel fonksiyon bileşenlerine ayrılacak; ayrı dosyalar ancak dosya okunabilirliği belirgin biçimde bozulursa oluşturulacak.

## 11. Uygulama Sırası

1. İkon bağımlılığını ekle ve temel tema/font değişkenlerini kur.
2. Tipleri, örnek 7. sınıf Matematik verisini ve state modelini oluştur.
3. Masaüstü ürün kabuğu, navigasyon ve üst araç çubuğunu uygula.
4. Soru araçları, A4 önizleme ve sağ ayarlar panelini oluştur.
5. Soru ekleme, seçme, düzenleme, taşıma, çoğaltma ve silme etkileşimlerini bağla.
6. PDF yükleme/tarama/seçim simülasyonunu uygula.
7. Önizleme, cevap anahtarı, yazdırma ve simüle PDF indirme geri bildirimlerini ekle.
8. Tablet/mobil düzeni ve klavye erişilebilirliğini tamamla.
9. Print stillerini ekleyip yalnızca sınav kâğıdının yazdırılmasını sağla.
10. Format ve build doğrulamalarını çalıştır.

## 12. Doğrulama ve Kabul Kriterleri

### Fonksiyonel kontrol

- Dört soru tipinin her biri sınava eklenebiliyor.
- Eklenen soru otomatik seçiliyor ve sağ panelden düzenlenebiliyor.
- Soru metni, puanı ve tipe özel cevap bilgisi A4 üzerinde güncelleniyor.
- Sorular taşınabiliyor, çoğaltılabiliyor ve silinebiliyor.
- Toplam puan doğru hesaplanıyor.
- Cevap anahtarı açılıp kapanabiliyor.
- PDF modalı yalnızca PDF seçimine izin veriyor; tarama ve soru seçme adımları tamamlanabiliyor.
- Seçilen örnek PDF soruları sınava ekleniyor.
- Önizleme katmanı açılıp kapanıyor.
- Yazdırma kontrolü tarayıcı yazdırma akışını çağırıyor.
- PDF indir kontrolü, gerçek indirme yapmadığını anlaşılır bildirimle belirtiyor.

### Görsel ve responsive kontrol

- Geniş ekranda üç panel çakışmadan çalışıyor.
- 1024 px civarında sağ panel drawer davranışına geçiyor.
- Mobilde Sorular / Kâğıt / Ayarlar arasında geçiş yapılabiliyor.
- A4 görünümü okunabilir ve çalışma yüzeyinde merkezli.
- Uzun soru metinleri ve çok sayıda seçenek taşma yaratmıyor.

### Erişilebilirlik kontrolü

- Tüm ana akış yalnızca klavyeyle tamamlanabiliyor.
- Modal `Escape` ile kapanıyor.
- Focus göstergeleri görünür.
- Form etiketleri ve ikon düğmelerinin erişilebilir adları var.

### Teknik doğrulama

- Depo komutu ile formatlama: `pnpm format`
- Üretim derlemesi: `pnpm build`
- Derlemede TypeScript veya JSX hatası olmamalı.
- Geliştirme sunucusu ayrıca başlatılmamalı.

## 13. Kapsam Dışı

- Gerçek AI ile soru veya konu anlatımı üretimi
- Gerçek PDF metin/OCR ayrıştırma
- Sunucu, veritabanı veya Payload CMS
- Kullanıcı hesabı, rol ve oturum yönetimi
- Kalıcı sınav kaydı ve bulut senkronizasyonu
- Gerçek PDF dosyası oluşturma/indirme
- Paylaşım bağlantıları, ortak çalışma ve öğretmenler arası soru bankası
- Optik form, A/B kitapçık ve otomatik değerlendirme

Bu maddeler ileride ürünleştirilecekse ayrı bir backend ve veri modeli planı gerektirir.
