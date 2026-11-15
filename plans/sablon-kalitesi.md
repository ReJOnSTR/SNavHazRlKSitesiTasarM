# Şablon kalitesini araştırmaya dayalı yükseltme

## Amaç
Yedi kâğıt şablonunun (MEB yazılı, LGS test, Sade, Zarif, Kurumsal, Etkinlik, Akademik) hepsini ortak bir tipografi ve boşluk sistemine oturtmak. Gerçek sınav kâğıtlarında bulunan öğeleri (dönem/yazılı numarası, soru bazlı puan tablosu, öğretmen adı ve imza alanı, kitapçık türü) şablona özel ayarlarla eklemek. MEB ve LGS şablonlarını resmî yapıdan esinlenen ama modern bir **serbest yorumla** yeniden tasarlamak. CSS mevcut `src/index.css` içinde **yerinde** düzenlenecek.

## Araştırmadan çıkan ilkeler (tasarıma girdi)
- **MEB yazılı kâğıdı:** üstte "20xx–20xx Eğitim-Öğretim Yılı · Okul · X. Sınıf · Ders · N. Dönem M. Yazılı" başlığı, Ad/No/Sınıf bilgi tablosu, puan kutusu, soru bazlı puan tablosu (1…n sütunları + Toplam) ve altta "Ders Öğretmeni" adı ile imza alanı yer alır. Cevaplar sorunun altındaki boşluğa yazılır.
- **LGS kitapçığı:** her sayfanın üstünde ders adı bandı, kitapçık türü (A/B) rozeti, ortada dikey çizgiyle ayrılmış iki sütun, kalın soru numaraları, alt alta A) B) C) D) şıkları ve altta ortalı sayfa numarası ile sayfa sonunda "Diğer sayfaya geçiniz." yazısı bulunur.
- **Genel ilkeler:** gövde metni 10,5–11,5 pt ve satır aralığı yaklaşık 1,4 olmalı; en fazla 3 başlık kademesi kullanılmalı; boşluklar 4 px ızgarasına oturmalı; fotokopiye dayanıklı olması için renk tek vurguyla sınırlı kalmalı ve %8'den açık tonlarla bilgi taşınmamalı; tüm şablonlarda çizgi kalınlıkları 0,75 / 1,5 px kademelerinden seçilmeli; öğrenci alanları yazı yazmaya yetecek yükseklikte (≥ 22 px) olmalı.

## 1. Veri modeli
`src/App.tsx` içindeki `ExamMeta` tipine şu alanlar eklenecek (varsayılanlar `useState` başlangıcında tanımlanacak):
- `academicYear: string` (varsayılan "2024–2025"; şablonlardaki sabit yazılmış yılın yerine kullanılacak)
- `term: "1" | "2"` (Dönem, varsayılan "2")
- `examNo: "1" | "2" | "3"` (Yazılı no, varsayılan "1")
- `teacher: string` (Öğretmen adı, varsayılan "")

`TemplateDesign` tipine (`src/pages/TemplatesPage.tsx`) şu alanlar eklenecek ve `baseDesign` içinde varsayılan değerleri verilecek:
- `showScoreTable: boolean` (soru bazlı puan tablosu; varsayılan true, LGS ön ayarında false)
- `showSignature: boolean` (öğretmen adı + imza alanı; varsayılan true, LGS'de false)
- `booklet: "none" | "A" | "B"` (kitapçık türü; varsayılan "none", LGS ön ayarında "A")

Kaydedilmiş "Şablonlarım" kayıtları yeni alanları içermeyebilir. Bu yüzden tasarımın kullanıldığı her yerde `{ ...baseDesign, ...saved }` birleştirmesi yapılacak; mevcut yükleme noktası kontrol edilip gerekirse eklenecek.

## 2. Ayar arayüzü
- **`ExamInspector` (Bilgi sekmesi):** "Öğretim yılı" metin alanı, "Dönem" ve "Yazılı" için mevcut `Dropdown` bileşeni ve "Öğretmen adı" alanı eklenecek. Mevcut `FormField` deseni kullanılacak.
- **`DesignInspector` (Tasarım sekmesi):** mevcut anahtar (toggle) deseniyle "Puan tablosu" ve "Öğretmen imzası" anahtarları, "Kitapçık türü" için Yok/A/B segment seçimi eklenecek. Her ayar kâğıda doğrudan yansımalı; bağlantısız kontrol olmamalı.

## 3. Ortak kâğıt bileşenleri (App.tsx, `ExamPaper` içinde)
- `scoreTable`: sorular `numbering` üzerinden okunarak satırları "Soru | 1 | 2 | … | Toplam", "Puan | p1 | … | totalPoints" ve boş "Aldığı" olan bir tablo oluşturulacak. 12'den fazla soru varsa tablo iki satır bloğuna bölünecek. Tablo yalnızca son sayfada, altbilginin üstünde görünecek. Sayfa bölme hesabına dahil edilmesi için `data-m` ölçümünde yükseklik ayrılacak; mevcut sayfalama mantığı incelenip son sayfanın kapasitesinden bu yükseklik düşülecek.
- `signature`: "Ders Öğretmeni" etiketi, `teacher` adı (boşsa sadece çizgi) ve imza çizgisi. Konumu son sayfanın sağ alt köşesi; ayrıca son sayfada `footerNote` ("Başarılar dilerim.") metninin yanında da görünecek.
- `bookletBadge`: `booklet !== "none"` olduğunda kare bir rozet gösterilecek. LGS'de bant içinde, diğer şablonlarda başlığın sağ üst köşesinde yer alacak.
- `examLabel` yardımcısı: `${term}. Dönem ${examNo}. Yazılı` metnini üretecek ve tüm şablonların alt başlıklarında `· Yazılı Sınavı` metninin yerini alacak.
- LGS'de son sayfa dışındaki sayfaların altbilgisinde "Diğer sayfaya geçiniz." yazacak; son sayfada `footerNote` gösterilecek.

## 4. Şablon bazında tasarım (serbest yorum)
Her şablon için başlık JSX'i `ExamPaper` içinde güncellenecek ve stiller `index.css` içinde yerinde düzenlenecek.

1. **MEB yazılı (classic):** Başlıkta logo solda, üç satırlık ortalı başlık (yıl+okul / sınıf+ders / dönem+yazılı) ve sağda kitapçık rozeti ya da boşluk olacak. Altında 0,75 px çizgili ince bilgi tablosu yer alacak: Ad Soyad, No, Sınıf, Tarih/Süre ve çift satır yüksekliğinde PUAN kutusu. Yönerge italik ve küçük, sol kenarında vurgu rengiyle ince bir çizgi taşıyacak. Sorular arasında cevap boşluğu korunacak. Son sayfada puan tablosu ve imza bulunacak. Siyah-beyaz baskıya uygun olacak; vurgu sadece çizgilerde kullanılacak.
2. **LGS test:** Üstte tam genişlikte, vurgu renginde ders bandı olacak. Sol tarafında sınıf/tarih, ortada büyük harfli ders adı, sağda soru sayısı/süre ve kitapçık rozeti bulunacak. Bandın altında ince bir okul/konu satırı ve tek satırlık öğrenci alanı yer alacak. Sütun ayırıcısı her zaman açık olacak; soru numaraları kalın ve vurgu renginde, şıklar daire içinde harflerle gösterilecek. Devam sayfalarında ince bant tekrar edecek (runningHead'in LGS varyantı). Altbilgide ortalı sayfa numarası ve "Diğer sayfaya geçiniz." yazacak.
3. **Sade (minimal):** Çalışma kâğıdı düzeninde olacak. Solda büyük, hafif ağırlıklı ders başlığı ve altında konu yer alacak; sağda logo bulunacak. Tek bir 0,75 px çizgiden oluşan Ad/Sınıf/Tarih satırı kullanılacak. Kutu olmayacak; hiyerarşi yalnızca tipografi ve boşlukla sağlanacak.
4. **Zarif (elegant):** Serif yazı tipi, ortalı arma ve süs ayırıcı korunacak. Başlık boyutu ve harf aralığı (okul adı büyük harf, 0,14 em aralık) rafine edilecek. Meta satırı ince ayraçlarla ayrılacak. Öğrenci alanları alt çizgi şeklinde olacak. Puan tablosu ince çizgili ve serif rakamlı olacak.
5. **Kurumsal (bold):** Tam taşan koyu bant içinde logo, başlık ve sağda sıkı bir `dl` grid yer alacak. Altında açık gri bir öğrenci şeridi bulunacak. Bölüm başlıkları vurgu renginde sol çubuklu olacak. Devam sayfası başlığındaki (runningHead) sabit `margin: -50px -55px` değeri `--pad` değişkenine bağlanacak; bu sayede kenar boşluğu ayarı doğru çalışacak.
6. **Etkinlik (playful):** Yuvarlatılmış kart, yuvarlak yazı tipi ve renkli noktalar korunacak. Öğrenci alanları hap biçiminde etiketlerle gösterilecek. Soru numaraları vurgu renginde daire içinde olacak. Puan tablosu yuvarlak köşeli olacak. Renk kullanımı fotokopiye uygun tutulacak: dolgular %10 ton.
7. **Akademik:** Logo, ortalanmış kurum bloğu ve bilgi tablosundan oluşan üç sütunlu düzen korunacak. Tablo çizgileri 0,75 px'e çekilecek, numaralandırma kutulu olacak. Bölüm başlıkları büyük harf ve alt çizgili olacak. Puan tablosu ve imza varsayılan olarak açık olacak.

**Ortak tipografi:** Yazı boyutu kademeleri için `.exam-paper` düzeyinde CSS değişkenleri (`--fs-body`, `--fs-h1`, `--fs-meta`, `--lh`) tanımlanacak. `size-*` sınıfları sadece bu değişkenleri değiştirecek. Şablonlar sabit px yerine bu değişkenleri kullanacak.

## 5. CSS yaklaşımı (yerinde)
- Değiştirilen her seçici için dosyada **son kazanan** kural bulunacak (`grep`) ve düzenleme orada yapılacak. Aynı seçicinin daha önceki, çakışan ve artık etkisiz tekrarları yalnızca o özellik için silinecek. Toplu taşıma yapılmayacak.
- Yeni bileşenler (`.paper-score-table`, `.paper-signature`, `.booklet-badge`) ilgili şablon bloklarının yanına eklenecek.
- Karanlık tema kâğıdı etkilememeli; kâğıt içi renkler sabit kalacak.
- Yazdırma (`@media print`) kuralları korunacak; puan tablosu ve imza kırılmayacak (`break-inside: avoid`).

## 6. Şablon kartları ve ön ayarlar
- `TemplatesPage.tsx` içindeki ön ayarlara yeni alanlar eklenecek (LGS: booklet "A", showScoreTable/showSignature false). Kart özellik listeleri güncellenecek (ör. MEB: "Soru bazlı puan tablosu", "Öğretmen imza alanı").
- `.thumb-*` küçük önizlemeleri yeni başlık düzenlerini yansıtacak şekilde güncellenecek.

## 7. Kenar durumları
- Soru yoksa puan tablosu gösterilmeyecek.
- 30'dan fazla soru varsa tablo bloklara bölünecek.
- Uzun okul adları en fazla iki satıra sarılacak (`text-wrap: balance`).
- Öğretmen adı boşsa sadece imza çizgisi kalacak.
- İki sütunlu düzende puan tablosu tam genişlikte, sütunların altında yer alacak.
- Logo boyut ve çerçeve seçenekleri tüm şablonlarda çalışmaya devam edecek (önceki düzeltmeler korunacak).

## 8. Doğrulama
- `pnpm build` (tsc + vite) hatasız tamamlanmalı.
- Çalışan önizlemede her şablon için şunlar kontrol edilecek: başlık, devam sayfası, son sayfadaki puan tablosu ve imza; kitapçık A/B/Yok seçenekleri; Dönem/Yazılı/Yıl/Öğretmen değişikliklerinin başlığa yansıması; büyük/küçük yazı boyutu; tek/çift sütun; logo yüklü ve yüksüz durumlar; kenar boşluğu 10/25 mm; karanlık tema; telefon genişliği.
- Sayfalamanın taşmadığı (puan tablosunun altbilgiyle çakışmadığı) en az 15 soruluk bir sınavla doğrulanacak.
