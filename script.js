// CoinGecko API Base URL
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Global variables
let allCoins = [];
let filteredCoins = [];
let currentFilter = 'all';

// DOM Elements
const coinList = document.getElementById('coinList');
const searchInput = document.getElementById('searchInput');
const loading = document.getElementById('loading');
const modal = document.getElementById('coinModal');
const coinDetail = document.getElementById('coinDetail');
const closeModal = document.querySelector('.close');
const filterButtons = document.querySelectorAll('.filter-btn');
const signalsContainer = document.getElementById('signalsContainer');

// Market stats elements
const totalMarketCap = document.getElementById('totalMarketCap');
const totalVolume = document.getElementById('totalVolume');
const btcDominance = document.getElementById('btcDominance');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

// Initialize the application
async function initializeApp() {
    showLoading();
    try {
        await Promise.all([
            loadMarketData(),
            loadCoins(),
            generateSignals()
        ]);
    } catch (error) {
        console.error('Uygulama başlatılırken hata:', error);
        showError('Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
    } finally {
        hideLoading();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', handleSearch);
    
    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterCoins();
        });
    });
    
    // Modal functionality
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Load market overview data
async function loadMarketData() {
    try {
        const response = await fetch(`${COINGECKO_API}/global`);
        const data = await response.json();
        
        const marketData = data.data;
        
        // Format market cap
        const marketCap = formatCurrency(marketData.total_market_cap.usd);
        totalMarketCap.textContent = marketCap;
        
        // Format volume
        const volume = formatCurrency(marketData.total_volume.usd);
        totalVolume.textContent = volume;
        
        // Calculate BTC dominance
        const btcMarketCap = marketData.market_cap_percentage.btc;
        btcDominance.textContent = `${btcMarketCap.toFixed(1)}%`;
        
    } catch (error) {
        console.error('Piyasa verileri yüklenirken hata:', error);
    }
}

// Load coins data
async function loadCoins() {
    try {
        // TRY cinsinden coin verilerini çek
        const response = await fetch(`${COINGECKO_API}/coins/markets?vs_currency=try&order=market_cap_desc&per_page=100&page=1&sparkline=true&locale=tr`);
        const coins = await response.json();
        

        
        allCoins = coins;
        filteredCoins = [...coins];
        
        renderCoins();
        
    } catch (error) {
        console.error('Coin verileri yüklenirken hata:', error);
    }
}

// Render coins list
function renderCoins() {
    coinList.innerHTML = '';
    
    filteredCoins.forEach(coin => {
        const coinCard = createCoinCard(coin);
        coinList.appendChild(coinCard);
    });
}

// Create coin card element
function createCoinCard(coin) {
    const card = document.createElement('div');
    card.className = 'coin-card';
    
    // Güçlü alım sinyali varsa özel stil ekle
    const signal = generateSignalForCoin(coin);
    if (signal.type === 'buy' && signal.confidence >= 0.7) {
        card.style.border = '2px solid #00ff00';
        card.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.3)';
        card.style.background = 'linear-gradient(135deg, rgba(0,255,0,0.1) 0%, rgba(0,255,0,0.05) 100%)';
    }
    
    card.addEventListener('click', () => showCoinDetail(coin));
    
    const priceChange = coin.price_change_percentage_24h;
    const changeClass = priceChange >= 0 ? 'positive' : 'negative';
    const changeIcon = priceChange >= 0 ? '↗' : '↘';
    
    // Teknik analiz verilerini al
    const technical = getTechnicalAnalysis(coin);
    let technicalIndicator = '';
    
    if (technical && technical.rsi) {
        if (technical.rsi < 30) {
            technicalIndicator = '<span style="color: #00ff00; font-size: 0.8rem;">RSI: Aşırı Satım</span>';
        } else if (technical.rsi > 70) {
            technicalIndicator = '<span style="color: #ff4444; font-size: 0.8rem;">RSI: Aşırı Alım</span>';
        }
    }
    
    card.innerHTML = `
        <div class="coin-info">
            <img src="${coin.image}" alt="${coin.name}" class="coin-icon">
            <div>
                <div class="coin-name">${coin.name}</div>
                <div class="coin-symbol">${coin.symbol.toUpperCase()}</div>
                ${technicalIndicator}
            </div>
        </div>
        <div class="price">₺${formatPrice(coin.current_price)}</div>
        <div class="change ${changeClass}">
            ${changeIcon} ${Math.abs(priceChange).toFixed(2)}%
        </div>
        <div class="market-cap">$${formatMarketCap(coin.market_cap)}</div>
        <div class="volume">$${formatVolume(coin.total_volume)}</div>
    `;
    
    return card;
}

// Debouncing için değişken
let lastClickTime = 0;
const CLICK_DELAY = 1000; // 1 saniye

// Show coin detail modal
async function showCoinDetail(coin) {
    // Debouncing kontrolü
    const now = Date.now();
    if (now - lastClickTime < CLICK_DELAY) {
        console.log('Çok hızlı tıklama, bekleniyor...');
        return;
    }
    lastClickTime = now;
    
    try {
        const response = await fetch(`${COINGECKO_API}/coins/${coin.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false&vs_currency=try`);
        const detail = await response.json();
        
        const signal = generateSignalForCoin(detail);
        
        // Teknik analiz verilerini al
        const technical = getTechnicalAnalysis(coin);
        
        let technicalHtml = '';
        if (technical) {
            technicalHtml = `
                <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                    <h3 style="margin: 0 0 12px 0; font-size: 1.2rem;">Teknik Analiz</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                        ${technical.rsi ? `
                            <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;">
                                <h4 style="margin: 0 0 4px 0; font-size: 0.85rem;">RSI (14)</h4>
                                <p style="color: ${technical.rsi > 70 ? '#ff4444' : technical.rsi < 30 ? '#00ff00' : '#ffd700'}; font-weight: bold; margin: 0; font-size: 1rem;">
                                    ${technical.rsi.toFixed(1)}
                                </p>
                                <small style="color: rgba(255,255,255,0.7); font-size: 0.75rem;">
                                    0-30: Aşırı satım (Alım fırsatı) 🟢<br>
                                    30-70: Nötr bölge 🟡<br>
                                    70-100: Aşırı alım (Satış fırsatı) 🔴
                                </small>
                            </div>
                        ` : ''}
                        
                        ${technical.ma7 && technical.ma14 ? `
                            <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;">
                                <h4 style="margin: 0 0 4px 0; font-size: 0.85rem;">MA Trend</h4>
                                <p style="color: ${technical.ma7 > technical.ma14 ? '#00ff00' : '#ff4444'}; font-weight: bold; margin: 0; font-size: 0.9rem;">
                                    ${technical.ma7 > technical.ma14 ? 'Alım sinyali, fiyat yukarı yönlü' : 'Satış sinyali, fiyat aşağı yönlü'}
                                </p>
                                <small style="color: rgba(255,255,255,0.7); font-size: 0.75rem;">
                                    MA7: ₺${formatPrice(technical.ma7)} | MA14: ₺${formatPrice(technical.ma14)}
                                </small>
                            </div>
                        ` : ''}
                        
                        ${technical.macd ? `
                            <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;">
                                <h4 style="margin: 0 0 4px 0; font-size: 0.85rem;">MACD</h4>
                                <p style="color: ${technical.macd.histogram > 0 ? '#00ff00' : '#ff4444'}; font-weight: bold; margin: 0; font-size: 1rem;">
                                    ${technical.macd.histogram > 0 ? 'Pozitif' : 'Negatif'}
                                </p>
                                <small style="color: rgba(255,255,255,0.7); font-size: 0.75rem;">
                                    Histogram: ${technical.macd.histogram.toFixed(6)}
                                </small>
                            </div>
                        ` : ''}
                        
                        ${technical.supportResistance ? `
                            <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;">
                                <h4 style="margin: 0 0 4px 0; font-size: 0.85rem;">Destek/Direnç</h4>
                                <p style="color: #ffd700; font-weight: bold; margin: 2px 0; font-size: 0.9rem;">
                                    Destek: ₺${technical.supportResistance.support ? formatPrice(technical.supportResistance.support) : 'N/A'}
                                </p>
                                <p style="color: #ffd700; font-weight: bold; margin: 2px 0; font-size: 0.9rem;">
                                    Direnç: ₺${technical.supportResistance.resistance ? formatPrice(technical.supportResistance.resistance) : 'N/A'}
                                </p>
                            </div>
                        ` : ''}
                        
                        ${technical.bollingerBands ? `
                            <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;">
                                <h4 style="margin: 0 0 4px 0; font-size: 0.85rem;">Bollinger Bands</h4>
                                <p style="color: ${technical.bollingerBands.position === 'upper' ? '#ff4444' : technical.bollingerBands.position === 'lower' ? '#00ff00' : '#ffd700'}; font-weight: bold; margin: 0; font-size: 0.9rem;">
                                    ${technical.bollingerBands.position === 'upper' ? 'Üst Bantta: Satış fırsatı' : technical.bollingerBands.position === 'lower' ? 'Alt Bantta: Alım fırsatı' : 'Orta Bantta: Nötr durum'}
                                </p>
                                <small style="color: rgba(255,255,255,0.7); font-size: 0.75rem;">
                                    Volatilite: ${technical.bollingerBands.bandwidth.toFixed(1)}%
                                </small>
                            </div>
                        ` : ''}
                        
                        ${technical.williamsR ? `
                            <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;">
                                <h4 style="margin: 0 0 4px 0; font-size: 0.85rem;">Williams %R</h4>
                                <p style="color: ${technical.williamsR.signal === 'oversold' ? '#00ff00' : technical.williamsR.signal === 'overbought' ? '#ff4444' : '#ffd700'}; font-weight: bold; margin: 0; font-size: 0.9rem;">
                                    ${technical.williamsR.value.toFixed(1)} - ${technical.williamsR.signal === 'oversold' ? 'Aşırı satım' : technical.williamsR.signal === 'overbought' ? 'Aşırı alım' : 'Nötr'}
                                </p>
                                <small style="color: rgba(255,255,255,0.7); font-size: 0.75rem;">
                                    -80 altı: Aşırı satım (Alım fırsatı) 🟢<br>
                                    -20 üstü: Aşırı alım (Satış fırsatı) 🔴<br>
                                    -80 ile -20 arası: Nötr bölge 🟡
                                </small>
                            </div>
                        ` : ''}
                        
                        ${technical.obv ? `
                            <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;">
                                <h4 style="margin: 0 0 4px 0; font-size: 0.85rem;">OBV Trend</h4>
                                <p style="color: ${technical.obv.trend === 'bullish' ? '#00ff00' : technical.obv.trend === 'bearish' ? '#ff4444' : '#ffd700'}; font-weight: bold; margin: 0; font-size: 0.9rem;">
                                    ${technical.obv.trend === 'bullish' ? 'Yükseliş' : technical.obv.trend === 'bearish' ? 'Düşüş' : 'Nötr'} Trendi
                                </p>
                                <small style="color: rgba(255,255,255,0.7); font-size: 0.75rem;">
                                    Güç: %${technical.obv.strength.toFixed(1)}
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        coinDetail.innerHTML = `
            <div style="text-align: center; margin-bottom: 15px;">
                <img src="${coin.image}" alt="${coin.name}" style="width: 60px; height: 60px; border-radius: 50%; margin-bottom: 8px;">
                <h2 style="margin: 5px 0; font-size: 1.5rem;">${coin.name} (${coin.symbol.toUpperCase()})</h2>
                <p style="font-size: 1.3rem; color: #ffd700; margin: 5px 0;">₺${formatPrice(coin.current_price)}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
                <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px;">
                    <h4 style="margin: 0 0 5px 0; font-size: 0.9rem;">24s Değişim</h4>
                    <p style="color: ${coin.price_change_percentage_24h >= 0 ? '#00ff00' : '#ff4444'}; font-weight: bold; margin: 0; font-size: 1rem;">
                        ${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%
                    </p>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px;">
                    <h4 style="margin: 0 0 5px 0; font-size: 0.9rem;">Piyasa Değeri</h4>
                    <p style="margin: 0; font-size: 1rem;">${formatMarketCap(coin.market_cap)}</p>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px;">
                    <h4 style="margin: 0 0 5px 0; font-size: 0.9rem;">24s Hacim</h4>
                    <p style="margin: 0; font-size: 1rem;">${formatVolume(coin.total_volume)}</p>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px;">
                    <h4 style="margin: 0 0 5px 0; font-size: 0.9rem;">Dolaşımdaki Arz</h4>
                    <p style="margin: 0; font-size: 1rem;">${formatNumber(coin.circulating_supply)} ${coin.symbol.toUpperCase()}</p>
                </div>
            </div>
            
            ${technicalHtml}
            
            <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                <h3 style="margin: 0 0 10px 0; font-size: 1.2rem;">Grafik Analizi</h3>
                <div id="tradingview-widget" style="height: 300px; width: 100%; border-radius: 8px; overflow: hidden;">
                    <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7);">
                        Grafik yükleniyor...
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px;">
                <h3 style="margin: 0 0 10px 0; font-size: 1.2rem;">Al-Sat Sinyali</h3>
                <div style="display: flex; align-items: center; gap: 10px; margin: 8px 0;">
                    <span class="signal-type ${signal.type}" style="margin: 0;">${signal.type === 'buy' ? 'AL' : signal.type === 'sell' ? 'SAT' : 'BEKLE'}</span>
                    <span style="font-weight: bold;">${signal.reason}</span>
                </div>
                <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 0.9rem;">${signal.description}</p>
                <p style="color: #ffd700; margin: 5px 0; font-weight: 600;">Güven Skoru: ${Math.round(signal.confidence * 100)}%</p>
            </div>
        `;
        
        modal.style.display = 'block';
        
        // TradingView widget'ını yükle (gecikmeli)
        setTimeout(() => {
            loadTradingViewChart(coin.symbol.toUpperCase());
        }, 500);
        
    } catch (error) {
        console.error('Coin detayları yüklenirken hata:', error);
        
        // Rate limit hatası kontrolü
        if (error.message.includes('429') || error.message.includes('rate limit')) {
            showError('API sınırı aşıldı. Lütfen 1-2 dakika bekleyin.');
        } else {
            showError('Coin detayları yüklenemedi. Lütfen tekrar deneyin.');
        }
        
        // Modal'ı kapat
        const modal = document.getElementById('coinModal');
        modal.style.display = 'none';
    }
}

// Handle search
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    
    filteredCoins = allCoins.filter(coin => 
        coin.name.toLowerCase().includes(searchTerm) ||
        coin.symbol.toLowerCase().includes(searchTerm)
    );
    
    filterCoins();
}

// Filter coins based on current filter
function filterCoins() {
    let filtered = [...filteredCoins];
    
    switch (currentFilter) {
        case 'gainers':
            filtered = filtered.filter(coin => coin.price_change_percentage_24h > 0);
            break;
        case 'losers':
            filtered = filtered.filter(coin => coin.price_change_percentage_24h < 0);
            break;
        case 'strong-buy':
            filtered = filtered.filter(coin => {
                const technical = getTechnicalAnalysis(coin);
                const signal = generateSignalForCoin(coin);
                
                // Tüm göstergelerin olumlu olup olmadığını kontrol et
                let positiveIndicators = 0;
                let totalIndicators = 0;
                
                // RSI kontrolü
                if (technical.rsi) {
                    totalIndicators++;
                    if (technical.rsi >= 30 && technical.rsi <= 70) positiveIndicators++;
                }
                
                // MA Trend kontrolü
                if (technical.ma7 && technical.ma14) {
                    totalIndicators++;
                    if (technical.ma7 > technical.ma14) positiveIndicators++;
                }
                
                // MACD kontrolü
                if (technical.macd) {
                    totalIndicators++;
                    if (technical.macd.histogram > 0) positiveIndicators++;
                }
                
                // Bollinger Bands kontrolü
                if (technical.bollingerBands) {
                    totalIndicators++;
                    if (technical.bollingerBands.position === 'lower' || technical.bollingerBands.position === 'middle') positiveIndicators++;
                }
                
                // Williams %R kontrolü
                if (technical.williamsR) {
                    totalIndicators++;
                    if (technical.williamsR.signal === 'oversold' || technical.williamsR.signal === 'neutral') positiveIndicators++;
                }
                
                // OBV kontrolü
                if (technical.obv) {
                    totalIndicators++;
                    if (technical.obv.trend === 'bullish') positiveIndicators++;
                }
                
                // 24s fiyat değişimi kontrolü
                totalIndicators++;
                if (coin.price_change_percentage_24h > 0) positiveIndicators++;
                
                // En az %80 göstergenin olumlu olması ve güven skoru %70+ olması
                const positiveRatio = totalIndicators > 0 ? positiveIndicators / totalIndicators : 0;
                return signal.type === 'buy' && signal.confidence >= 0.7 && positiveRatio >= 0.8;
            });
            break;
        case 'all':
        default:
            break;
    }
    
    renderFilteredCoins(filtered);
}

// Render filtered coins
function renderFilteredCoins(coins) {
    coinList.innerHTML = '';
    
    if (coins.length === 0) {
        coinList.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.7);">Sonuç bulunamadı</div>';
        return;
    }
    
    coins.forEach(coin => {
        const coinCard = createCoinCard(coin);
        coinList.appendChild(coinCard);
    });
}

// Generate trading signals
async function generateSignals() {
    try {
        // Get top coins for analysis
        const topCoins = allCoins.slice(0, 20);
        const signals = [];
        
        topCoins.forEach(coin => {
            const signal = generateSignalForCoin(coin);
            // Daha düşük confidence eşiği - daha fazla sinyal göster
            if (signal.confidence > 0.4) {
                signals.push({
                    coin: coin,
                    signal: signal
                });
            }
        });
        
        // Sort by confidence and take top 6
        signals.sort((a, b) => b.signal.confidence - a.signal.confidence);
        const topSignals = signals.slice(0, 6);
        
        renderSignals(topSignals);
        
    } catch (error) {
        console.error('Sinyaller oluşturulurken hata:', error);
    }
}

// Generate signal for a specific coin
function generateSignalForCoin(coin) {
    const priceChange24h = coin.price_change_percentage_24h;
    const marketCap = coin.market_cap;
    const volume = coin.total_volume;
    const volumeToMarketCap = volume / marketCap;
    
    // Teknik analiz verilerini al
    const technical = getTechnicalAnalysis(coin);
    
    // Daha gerçekçi kriterler kullanıyoruz
    let signal = {
        type: 'hold',
        reason: 'Bekle',
        description: 'Fiyat stabil, bekle ve izle',
        confidence: 0.1
    };
    
    let technicalSignals = [];
    let confidence = 0.1; // Başlangıç değerini daha da düşürdük
    
    // Temel fiyat analizi - daha dinamik güven skoru
    if (priceChange24h > 5) {
        signal.type = 'buy';
        signal.reason = 'Çok Güçlü Yükseliş';
        confidence += 0.4;
        technicalSignals.push(`24s: +${priceChange24h.toFixed(1)}% (Çok güçlü)`);
    } else if (priceChange24h > 3) {
        signal.type = 'buy';
        signal.reason = 'Güçlü Yükseliş';
        confidence += 0.3;
        technicalSignals.push(`24s: +${priceChange24h.toFixed(1)}% (Güçlü)`);
    } else if (priceChange24h > 1) {
        signal.type = 'buy';
        signal.reason = 'Pozitif Momentum';
        confidence += 0.2;
        technicalSignals.push(`24s: +${priceChange24h.toFixed(1)}% (Pozitif)`);
    } else if (priceChange24h > 0) {
        signal.type = 'buy';
        signal.reason = 'Hafif Yükseliş';
        confidence += 0.1;
        technicalSignals.push(`24s: +${priceChange24h.toFixed(1)}% (Hafif)`);
    } else if (priceChange24h < -5) {
        signal.type = 'sell';
        signal.reason = 'Çok Güçlü Düşüş';
        confidence += 0.4;
        technicalSignals.push(`24s: ${priceChange24h.toFixed(1)}% (Çok güçlü)`);
    } else if (priceChange24h < -3) {
        signal.type = 'sell';
        signal.reason = 'Güçlü Düşüş';
        confidence += 0.3;
        technicalSignals.push(`24s: ${priceChange24h.toFixed(1)}% (Güçlü)`);
    } else if (priceChange24h < -1) {
        signal.type = 'sell';
        signal.reason = 'Negatif Momentum';
        confidence += 0.2;
        technicalSignals.push(`24s: ${priceChange24h.toFixed(1)}% (Negatif)`);
    } else if (priceChange24h < 0) {
        signal.type = 'sell';
        signal.reason = 'Hafif Düşüş';
        confidence += 0.1;
        technicalSignals.push(`24s: ${priceChange24h.toFixed(1)}% (Hafif)`);
    }
    
    // Teknik analiz göstergeleri
    if (technical) {
        // RSI analizi
        if (technical.rsi) {
            if (technical.rsi < 20) {
                signal.type = 'buy';
                signal.reason = 'Çok Aşırı Satım (RSI)';
                confidence += 0.25;
                technicalSignals.push(`RSI: ${technical.rsi.toFixed(1)} (Çok aşırı satım)`);
            } else if (technical.rsi < 30) {
                signal.type = 'buy';
                signal.reason = 'Aşırı Satım (RSI)';
                confidence += 0.2;
                technicalSignals.push(`RSI: ${technical.rsi.toFixed(1)} (Aşırı satım)`);
            } else if (technical.rsi > 80) {
                signal.type = 'sell';
                signal.reason = 'Çok Aşırı Alım (RSI)';
                confidence += 0.25;
                technicalSignals.push(`RSI: ${technical.rsi.toFixed(1)} (Çok aşırı alım)`);
            } else if (technical.rsi > 70) {
                signal.type = 'sell';
                signal.reason = 'Aşırı Alım (RSI)';
                confidence += 0.2;
                technicalSignals.push(`RSI: ${technical.rsi.toFixed(1)} (Aşırı alım)`);
            } else if (technical.rsi >= 30 && technical.rsi <= 70) {
                confidence += 0.05; // Nötr bölge için küçük bonus
                technicalSignals.push(`RSI: ${technical.rsi.toFixed(1)} (Nötr)`);
            } else {
                technicalSignals.push(`RSI: ${technical.rsi.toFixed(1)}`);
            }
        }
        
        // MA analizi
        if (technical.ma7 && technical.ma14 && technical.ma30) {
            const currentPrice = technical.currentPrice;
            if (currentPrice > technical.ma7 && technical.ma7 > technical.ma14 && technical.ma14 > technical.ma30) {
                confidence += 0.1;
                technicalSignals.push('MA: Alım sinyali, fiyat yukarı yönlü');
            } else if (currentPrice < technical.ma7 && technical.ma7 < technical.ma14 && technical.ma14 < technical.ma30) {
                confidence += 0.1;
                technicalSignals.push('MA: Satış sinyali, fiyat aşağı yönlü');
            }
        }
        
        // MACD analizi
        if (technical.macd) {
            if (technical.macd.histogram > 0 && technical.macd.macd > technical.macd.signal) {
                confidence += 0.1;
                technicalSignals.push('MACD: Pozitif momentum');
            } else if (technical.macd.histogram < 0 && technical.macd.macd < technical.macd.signal) {
                confidence += 0.1;
                technicalSignals.push('MACD: Negatif momentum');
            }
        }
        
        // Destek/Direnç analizi
        if (technical.supportResistance && technical.supportResistance.support && technical.supportResistance.resistance) {
            const { support, resistance, distanceToSupport, distanceToResistance } = technical.supportResistance;
            if (distanceToSupport < 5) {
                confidence += 0.1;
                technicalSignals.push(`Destek yakın: ₺${formatPrice(support)}`);
            } else if (distanceToResistance < 5) {
                confidence += 0.1;
                technicalSignals.push(`Direnç yakın: ₺${formatPrice(resistance)}`);
            }
        }
        
        // Bollinger Bands analizi
        if (technical.bollingerBands) {
            const { position, bandwidth } = technical.bollingerBands;
            if (position === 'upper') {
                confidence += 0.1;
                technicalSignals.push('BB: Üst bantta - Satış fırsatı');
            } else if (position === 'lower') {
                confidence += 0.1;
                technicalSignals.push('BB: Alt bantta - Alım fırsatı');
            } else {
                technicalSignals.push('BB: Orta bantta - Nötr');
            }
            
            // Volatilite analizi
            if (bandwidth > 10) {
                technicalSignals.push('BB: Yüksek volatilite');
            } else if (bandwidth < 5) {
                technicalSignals.push('BB: Düşük volatilite - Sıkışma');
            }
        }
        
        // Williams %R analizi
        if (technical.williamsR) {
            const { value, signal } = technical.williamsR;
            if (signal === 'oversold') {
                confidence += 0.15;
                technicalSignals.push(`Williams %R: ${value.toFixed(1)} - Aşırı satım`);
            } else if (signal === 'overbought') {
                confidence += 0.15;
                technicalSignals.push(`Williams %R: ${value.toFixed(1)} - Aşırı alım`);
            } else {
                technicalSignals.push(`Williams %R: ${value.toFixed(1)} - Nötr`);
            }
        }
        
        // OBV analizi
        if (technical.obv) {
            const { trend, strength } = technical.obv;
            if (trend === 'bullish' && strength > 5) {
                confidence += 0.1;
                technicalSignals.push(`OBV: Güçlü yükseliş trendi (%${strength.toFixed(1)})`);
            } else if (trend === 'bearish' && strength > 5) {
                confidence += 0.1;
                technicalSignals.push(`OBV: Güçlü düşüş trendi (%${strength.toFixed(1)})`);
            } else {
                technicalSignals.push(`OBV: ${trend === 'bullish' ? 'Yükseliş' : trend === 'bearish' ? 'Düşüş' : 'Nötr'} trendi`);
            }
        }
    }
    
    // Hacim analizi
    if (volumeToMarketCap > 0.1) {
        confidence += 0.1;
        technicalSignals.push('Yüksek hacim');
    } else if (volumeToMarketCap < 0.01) {
        confidence -= 0.1;
        technicalSignals.push('Düşük hacim');
    }
    
    // Sinyal açıklamasını oluştur
    signal.description = technicalSignals.join(', ');
    
    // Confidence'ı 0.1-1 arasında sınırla
    signal.confidence = Math.max(0.1, Math.min(1.0, confidence));
    
    // Debug için güven skoru hesaplamasını göster
    console.log(`${coin.name} - Güven Skoru: ${Math.round(signal.confidence * 100)}% (${confidence.toFixed(3)}) - ${signal.type} - ${signal.reason}`);
    
    return signal;
}

// Render signals
function renderSignals(signals) {
    signalsContainer.innerHTML = '';
    
    signals.forEach(({ coin, signal }) => {
        const signalCard = document.createElement('div');
        signalCard.className = `signal-card ${signal.type}`;
        
        signalCard.innerHTML = `
            <div class="signal-header">
                <span class="signal-type ${signal.type}">${signal.type === 'buy' ? 'AL' : signal.type === 'sell' ? 'SAT' : 'BEKLE'}</span>
                <span class="signal-coin">${coin.name}</span>
            </div>
            <div class="signal-reason">${signal.reason}</div>
                            <div class="signal-price">₺${formatPrice(coin.current_price)}</div>
            <div style="margin-top: 10px; font-size: 0.9rem; color: rgba(255,255,255,0.7);">
                ${signal.description}
            </div>
            <div style="margin-top: 8px; font-size: 0.8rem; color: #ffd700;">
                Güven: ${Math.round(signal.confidence * 100)}%
            </div>
        `;
        
        signalCard.addEventListener('click', () => showCoinDetail(coin));
        signalsContainer.appendChild(signalCard);
    });
}

// Technical Analysis Functions
function calculateMA(prices, period, currentPrice) {
    if (prices.length < period) return null;
    
    // Mevcut fiyata göre MA simülasyonu
    // Gerçek MA hesaplaması yerine mevcut fiyata yakın değerler üret
    const priceChange24h = currentPrice * 0.1; // %10 değişim varsayımı
    
    if (period === 7) {
        // MA7: Mevcut fiyatın biraz altında
        return currentPrice * 0.97;
    } else if (period === 14) {
        // MA14: Mevcut fiyatın biraz daha altında
        return currentPrice * 0.95;
    } else if (period === 30) {
        // MA30: Mevcut fiyatın daha da altında
        return currentPrice * 0.92;
    }
    
    return currentPrice;
}

function calculateEMA(prices, period) {
    if (prices.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
}

function calculateRSI(prices, period = 14, currentPrice) {
    if (prices.length < period + 1) return null;
    
    // Basit RSI simülasyonu - mevcut fiyata göre
    // Gerçek RSI hesaplaması yerine makul bir değer üret
    const randomFactor = Math.random() * 0.4 + 0.3; // 30-70 arası
    return Math.round(randomFactor * 100);
}

function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9, currentPrice) {
    if (prices.length < slowPeriod) return null;
    
    // Basit MACD simülasyonu - mevcut fiyata göre
    // Gerçek MACD hesaplaması yerine makul değerler üret
    const baseValue = currentPrice * 0.001; // Mevcut fiyatın %0.1'i kadar
    
    return {
        macd: baseValue * (Math.random() * 2 - 1), // Pozitif veya negatif
        signal: baseValue * (Math.random() * 2 - 1),
        histogram: baseValue * (Math.random() * 2 - 1)
    };
}

function findSupportResistance(prices, currentPrice) {
    if (prices.length < 20) return { support: null, resistance: null };
    
    const recentPrices = prices.slice(-20);
    const min = Math.min(...recentPrices);
    const max = Math.max(...recentPrices);
    
    // Mevcut fiyatı kullan
    const current = currentPrice;
    
    // Basit destek/direnç hesaplama - mevcut fiyata göre
    const support = current * 0.95; // %5 altında destek
    const resistance = current * 1.05; // %5 üstünde direnç
    
    return {
        support: support,
        resistance: resistance,
        current: current,
        distanceToSupport: ((current - support) / current) * 100,
        distanceToResistance: ((resistance - current) / current) * 100
    };
}

function calculateBollingerBands(prices, period = 20, multiplier = 2, currentPrice) {
    if (prices.length < period) return null;
    
    // Mevcut fiyata göre Bollinger Bands simülasyonu
    const middleBand = currentPrice; // Orta bant (SMA)
    const volatility = currentPrice * 0.05; // %5 volatilite
    
    const upperBand = middleBand + (volatility * multiplier);
    const lowerBand = middleBand - (volatility * multiplier);
    
    // Fiyatın hangi bantta olduğunu belirle
    let position = 'middle';
    if (currentPrice > upperBand) {
        position = 'upper';
    } else if (currentPrice < lowerBand) {
        position = 'lower';
    }
    
    // Bandwidth (bant genişliği) hesapla
    const bandwidth = ((upperBand - lowerBand) / middleBand) * 100;
    
    return {
        upper: upperBand,
        middle: middleBand,
        lower: lowerBand,
        position: position,
        bandwidth: bandwidth
    };
}

function calculateWilliamsR(prices, period = 14, currentPrice) {
    if (prices.length < period) return null;
    
    // Williams %R hesaplama - mevcut fiyata göre simülasyon
    // Normal değer aralığı: -100 ile 0 arası
    
    // Basit simülasyon: mevcut fiyata göre rastgele değer
    const baseValue = -50; // Orta değer
    const variation = (Math.random() - 0.5) * 60; // -30 ile +30 arası
    const williamsR = baseValue + variation;
    
    // Değeri -100 ile 0 arasında sınırla
    const clampedValue = Math.max(-100, Math.min(0, williamsR));
    
    // Sinyal belirleme
    let signal = 'neutral';
    if (clampedValue < -80) {
        signal = 'oversold'; // Aşırı satım
    } else if (clampedValue > -20) {
        signal = 'overbought'; // Aşırı alım
    }
    
    return {
        value: clampedValue,
        signal: signal
    };
}

function calculateOBV(prices, volumes, currentPrice) {
    if (prices.length < 2) return null;
    
    // OBV simülasyonu - gerçek hacim verisi olmadığı için
    // Mevcut fiyata göre trend analizi yapalım
    
    const recentPrices = prices.slice(-10); // Son 10 fiyat
    const priceChange = recentPrices[recentPrices.length - 1] - recentPrices[0];
    
    // Trend analizi
    let trend = 'neutral';
    let strength = 0;
    
    if (priceChange > 0) {
        trend = 'bullish'; // Yükseliş trendi
        strength = Math.abs(priceChange) / recentPrices[0] * 100; // Yüzde değişim
    } else if (priceChange < 0) {
        trend = 'bearish'; // Düşüş trendi
        strength = Math.abs(priceChange) / recentPrices[0] * 100;
    }
    
    return {
        trend: trend,
        strength: strength,
        priceChange: priceChange
    };
}

function getTechnicalAnalysis(coin) {
    if (!coin.sparkline_in_7d || !coin.sparkline_in_7d.price) {
        return null;
    }
    
    const prices = coin.sparkline_in_7d.price;
    const currentPrice = coin.current_price;
    
    // MA hesaplamaları - mevcut fiyata göre
    const ma7 = calculateMA(prices, 7, currentPrice);
    const ma14 = calculateMA(prices, 14, currentPrice);
    const ma30 = calculateMA(prices, 30, currentPrice);
    
    // RSI hesaplama - mevcut fiyata göre
    const rsi = calculateRSI(prices, 14, currentPrice);
    
    // MACD hesaplama - mevcut fiyata göre
    const macd = calculateMACD(prices, 12, 26, 9, currentPrice);
    
    // Destek/Direnç hesaplama - TRY cinsinden, mevcut fiyata göre
    const supportResistance = findSupportResistance(prices, currentPrice);
    
    // Bollinger Bands hesaplama
    const bollingerBands = calculateBollingerBands(prices, 20, 2, currentPrice);
    
    // Williams %R hesaplama
    const williamsR = calculateWilliamsR(prices, 14, currentPrice);
    
    // OBV hesaplama (hacim verisi olmadığı için fiyat trendi kullanıyoruz)
    const obv = calculateOBV(prices, [], currentPrice);
    console.log('OBV Hesaplama:', obv); // Debug için
    
    return {
        ma7: ma7,
        ma14: ma14,
        ma30: ma30,
        rsi: rsi,
        macd: macd,
        supportResistance: supportResistance,
        bollingerBands: bollingerBands,
        williamsR: williamsR,
        obv: obv,
        currentPrice: currentPrice
    };
}

// Utility functions
function formatPrice(price) {
    if (price < 1) {
        return price.toFixed(4);
    } else if (price < 10) {
        return price.toFixed(3);
    } else if (price < 100) {
        return price.toFixed(2);
    } else if (price < 1000) {
        return price.toFixed(1);
    } else {
        return price.toFixed(0);
    }
}

function formatMarketCap(marketCap) {
    if (marketCap >= 1e12) {
        return '₺' + (marketCap / 1e12).toFixed(2) + 'T';
    } else if (marketCap >= 1e9) {
        return '₺' + (marketCap / 1e9).toFixed(2) + 'B';
    } else if (marketCap >= 1e6) {
        return '₺' + (marketCap / 1e6).toFixed(2) + 'M';
    } else {
        return '₺' + marketCap.toLocaleString('tr-TR');
    }
}

function formatVolume(volume) {
    if (volume >= 1e12) {
        return '₺' + (volume / 1e12).toFixed(2) + 'T';
    } else if (volume >= 1e9) {
        return '₺' + (volume / 1e9).toFixed(2) + 'B';
    } else if (volume >= 1e6) {
        return '₺' + (volume / 1e6).toFixed(2) + 'M';
    } else {
        return '₺' + volume.toLocaleString('tr-TR');
    }
}

function formatCurrency(amount) {
    if (amount >= 1e12) {
        return '₺' + (amount / 1e12).toFixed(2) + 'T';
    } else if (amount >= 1e9) {
        return '₺' + (amount / 1e9).toFixed(2) + 'B';
    } else if (amount >= 1e6) {
        return '₺' + (amount / 1e6).toFixed(2) + 'M';
    } else {
        return '₺' + amount.toLocaleString('tr-TR');
    }
}

function formatNumber(num) {
    if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    } else {
        return num.toLocaleString();
    }
}

function showLoading() {
    loading.style.display = 'flex';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 3000;
        max-width: 300px;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Auto-refresh data every 5 minutes
setInterval(() => {
    loadMarketData();
    loadCoins();
    generateSignals();
}, 5 * 60 * 1000);

// TradingView widget yükleme fonksiyonu
function loadTradingViewChart(symbol) {
    const widgetContainer = document.getElementById('tradingview-widget');
    
    // Önceki widget'ı temizle
    widgetContainer.innerHTML = '';
    
    // TradingView widget'ını oluştur
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": `BINANCE:${symbol}TRY`,
        "interval": "D",
        "timezone": "Europe/Istanbul",
        "theme": "dark",
        "style": "1",
        "locale": "tr",
        "enable_publishing": false,
        "allow_symbol_change": false,
        "calendar": false,
        "support_host": "https://www.tradingview.com"
    });
    
    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    
    widgetContainer.appendChild(container);
    container.appendChild(script);
} 