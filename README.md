# CoinBar - Kripto Para Takip Uygulaması

Modern ve kullanıcı dostu kripto para takip uygulaması. CoinGecko API kullanarak gerçek zamanlı veriler ve teknik analiz göstergeleri sunar.

## 🌟 Özellikler

- **Gerçek Zamanlı Veriler**: CoinGecko API ile güncel fiyatlar
- **Teknik Analiz**: RSI, MACD, MA, Bollinger Bands, Williams %R, OBV
- **Al-Sat Sinyalleri**: Otomatik sinyal üretimi ve güven skorları
- **Grafik Analizi**: TradingView entegrasyonu ile mum grafikleri
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu
- **Türkçe Arayüz**: Tam Türkçe dil desteği
- **TRY Fiyatları**: Türk Lirası cinsinden gösterim

## 🚀 Canlı Demo

[CoinBar Uygulaması](https://kullaniciadi.github.io/coinbar/)

## 📱 Ekran Görüntüleri

- Ana sayfa: Coin listesi ve piyasa genel bakış
- Detay modalı: Teknik analiz ve grafik
- Sinyal sayfası: Al-sat önerileri

## 🛠️ Teknolojiler

- **HTML5**: Modern semantik yapı
- **CSS3**: Glassmorphism ve responsive tasarım
- **JavaScript (ES6+)**: Dinamik içerik ve API entegrasyonu
- **CoinGecko API**: Kripto para verileri
- **TradingView Widget**: Grafik analizi
- **Font Awesome**: İkonlar

## 📊 Teknik Göstergeler

### Desteklenen Göstergeler:
- **RSI (14)**: Aşırı alım/satım seviyeleri
- **MA Trend**: 7, 14, 30 günlük hareketli ortalamalar
- **MACD**: Momentum göstergesi
- **Bollinger Bands**: Volatilite analizi
- **Williams %R**: Momentum osilatörü
- **OBV**: Hacim bazlı trend analizi
- **Destek/Direnç**: Fiyat seviyeleri

### Sinyal Algoritması:
- **Fiyat değişimi** analizi
- **Teknik göstergeler** kombinasyonu
- **Güven skoru** hesaplaması
- **Risk yönetimi** önerileri

## 🔧 Kurulum

### Yerel Geliştirme:
```bash
# Repository'yi klonlayın
git clone https://github.com/kullaniciadi/coinbar.git

# Klasöre gidin
cd coinbar

# index.html dosyasını tarayıcıda açın
# veya local server başlatın
python -m http.server 8000
```

### GitHub Pages:
1. Repository'yi fork edin
2. Settings > Pages > Source: Deploy from a branch
3. Branch: main seçin
4. Save'e tıklayın

## 📈 API Kullanımı

### CoinGecko API:
- **Ücretsiz Plan**: 50 istek/dakika
- **Endpoint**: `/coins/markets`
- **Para Birimi**: TRY (Türk Lirası)
- **Veri**: Fiyat, hacim, piyasa değeri

### Rate Limiting:
- Hızlı tıklamalar engellenir
- Debouncing uygulanır
- Hata yönetimi mevcuttur

## 🎨 Tasarım Özellikleri

### Renk Paleti:
- **Arka Plan**: Koyu mavi (#0a0e1a)
- **Kartlar**: Glassmorphism efekti
- **Vurgular**: Altın sarısı (#ffd700)
- **Pozitif**: Yeşil (#00ff00)
- **Negatif**: Kırmızı (#ff4444)

### Responsive Breakpoints:
- **Mobil**: < 768px
- **Tablet**: 768px - 1024px
- **Masaüstü**: > 1024px

## 🔮 Gelecek Özellikler

- [ ] Portföy takibi
- [ ] Fiyat alarmları
- [ ] Daha fazla teknik gösterge
- [ ] Sosyal medya entegrasyonu
- [ ] PWA desteği
- [ ] Dark/Light tema seçeneği

## 🤝 Katkıda Bulunma

1. Repository'yi fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Branch'inizi push edin (`git push origin feature/AmazingFeature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## ⚠️ Yasal Uyarı

Bu uygulama sadece bilgilendirme amaçlıdır. Yatırım kararları için profesyonel finansal danışmanlık alın. Kripto para yatırımları yüksek risk içerir.

## 📞 İletişim

- **GitHub**: [@kullaniciadi](https://github.com/kullaniciadi)
- **Proje Linki**: [https://github.com/kullaniciadi/coinbar](https://github.com/kullaniciadi/coinbar)

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın! 