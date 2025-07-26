// === CoinGecko API ===
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
let allCoins = [];
let filteredCoins = [];
let currentFilter = 'all';

// === DOM Elements ===
const coinList = document.getElementById('coinList');
const searchInput = document.getElementById('searchInput');
const loading = document.getElementById('loading');
const modal = document.getElementById('coinModal');
const coinDetail = document.getElementById('coinDetail');
const closeModal = document.querySelector('.close');
const filterButtons = document.querySelectorAll('.filter-btn');
const signalsContainer = document.getElementById('signalsContainer');

// === Init App ===
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    showLoading();
    try {
        await Promise.all([loadMarketData(), loadCoins(), generateSignals()]);
    } catch (error) {
        console.error('Başlatma hatası:', error);
    } finally {
        hideLoading();
    }
}

function setupEventListeners() {
    searchInput.addEventListener('input', handleSearch);
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterCoins();
        });
    });
    closeModal.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
}

// === Market Data ===
async function loadMarketData() {
    try {
        const response = await fetch(`${COINGECKO_API}/global`);
        const data = await response.json();
        const marketData = data.data;
        document.getElementById('totalMarketCap').textContent = formatCurrency(marketData.total_market_cap.usd);
        document.getElementById('totalVolume').textContent = formatCurrency(marketData.total_volume.usd);
        document.getElementById('btcDominance').textContent = `${marketData.market_cap_percentage.btc.toFixed(1)}%`;
    } catch (e) { console.error(e); }
}

async function loadCoins() {
    try {
        const response = await fetch(`${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true`);
        allCoins = await response.json();
        filteredCoins = [...allCoins];
        renderCoins();
    } catch (e) { console.error(e); }
}

function renderCoins() {
    coinList.innerHTML = '';
    filteredCoins.forEach(coin => coinList.appendChild(createCoinCard(coin)));
}

function createCoinCard(coin) {
    const card = document.createElement('div');
    card.className = 'coin-card';
    const signal = generateSignalForCoin(coin);

    if (signal.type === 'buy' && signal.confidencePercent >= 70) {
        card.style.border = '2px solid #00ff00';
        card.style.boxShadow = '0 0 15px rgba(0,255,0,0.3)';
    }

    card.addEventListener('click', () => showCoinDetail(coin));

    const priceChange = coin.price_change_percentage_24h;
    const changeClass = priceChange >= 0 ? 'positive' : 'negative';
    const changeIcon = priceChange >= 0 ? '↗' : '↘';

    card.innerHTML = `
        <div class="coin-info">
            <img src="${coin.image}" alt="${coin.name}" class="coin-icon">
            <div>
                <div class="coin-name">${coin.name}</div>
                <div class="coin-symbol">${coin.symbol.toUpperCase()}</div>
            </div>
        </div>
        <div class="price">$${formatPrice(coin.current_price)}</div>
        <div class="change ${changeClass}">${changeIcon} ${Math.abs(priceChange).toFixed(2)}%</div>
    `;
    return card;
}

// === Teknik Hesaplamalar ===
function calculateMA(prices, period) {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) ema = prices[i] * k + ema * (1 - k);
    return ema;
}

function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff; else losses -= diff;
    }
    const avgGain = gains / period, avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateMACD(prices) {
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    const signalLine = calculateEMA(prices.slice(-9), 9);
    return { macdLine, signalLine, histogram: macdLine - signalLine };
}

function calculateBollingerBands(prices, period = 20, mult = 2) {
    if (prices.length < period) return null;
    const sma = calculateMA(prices, period);
    const slice = prices.slice(-period);
    const variance = slice.reduce((acc, p) => acc + Math.pow(p - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    const upper = sma + mult * stdDev, lower = sma - mult * stdDev;
    const pos = prices[prices.length - 1] >= upper ? 'upper' : (prices[prices.length - 1] <= lower ? 'lower' : 'middle');
    return { upper, lower, middle: sma, position: pos };
}

function calculateVWAP(prices) {
    return prices.reduce((a, b) => a + b, 0) / prices.length;
}

function findSupportResistance(prices) {
    return { support: Math.min(...prices), resistance: Math.max(...prices) };
}

function calculateATR(prices, period = 14) {
    if (prices.length < period) return null;
    let trs = [];
    for (let i = 1; i < prices.length; i++) trs.push(Math.abs(prices[i] - prices[i - 1]));
    return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateStochastic(prices, period = 14) {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    const high = Math.max(...slice);
    const low = Math.min(...slice);
    const current = prices[prices.length - 1];
    const k = ((current - low) / (high - low)) * 100;
    const d = k;
    return { k, d };
}

// === Yeni Teknik Göstergeler ===
function calculateWilliamsR(prices, period = 14) {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    const high = Math.max(...slice);
    const low = Math.min(...slice);
    const current = prices[prices.length - 1];
    return ((high - current) / (high - low)) * -100;
}

function calculateCCI(prices, period = 20) {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const meanDeviation = slice.reduce((acc, price) => acc + Math.abs(price - sma), 0) / period;
    const current = prices[prices.length - 1];
    return (current - sma) / (0.015 * meanDeviation);
}

function calculateOBV(prices, volumes) {
    if (!volumes || volumes.length !== prices.length) return null;
    let obv = 0;
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i - 1]) {
            obv += volumes[i];
        } else if (prices[i] < prices[i - 1]) {
            obv -= volumes[i];
        }
    }
    return obv;
}

function calculateStochasticRSI(prices, period = 14) {
    const rsi = calculateRSI(prices, period);
    if (rsi === null) return null;
    
    // RSI değerlerini hesapla
    let rsiValues = [];
    for (let i = period; i < prices.length; i++) {
        const slice = prices.slice(i - period, i + 1);
        const rsiVal = calculateRSI(slice, period);
        if (rsiVal !== null) rsiValues.push(rsiVal);
    }
    
    if (rsiValues.length < period) return null;
    
    const rsiSlice = rsiValues.slice(-period);
    const high = Math.max(...rsiSlice);
    const low = Math.min(...rsiSlice);
    const current = rsiValues[rsiValues.length - 1];
    
    return ((current - low) / (high - low)) * 100;
}

function calculateMoneyFlowIndex(prices, volumes, period = 14) {
    if (!volumes || volumes.length !== prices.length || prices.length < period + 1) return null;
    
    let positiveFlow = 0, negativeFlow = 0;
    
    for (let i = 1; i <= period; i++) {
        const typicalPrice = prices[i];
        const prevTypicalPrice = prices[i - 1];
        const volume = volumes[i] || 0;
        
        if (typicalPrice > prevTypicalPrice) {
            positiveFlow += typicalPrice * volume;
        } else if (typicalPrice < prevTypicalPrice) {
            negativeFlow += typicalPrice * volume;
        }
    }
    
    if (negativeFlow === 0) return 100;
    
    const moneyRatio = positiveFlow / negativeFlow;
    return 100 - (100 / (1 + moneyRatio));
}

// === Gelişmiş Sinyal Sistemi ===
function generateSignalForCoin(coin) {
    if (!coin.sparkline_in_7d || !coin.sparkline_in_7d.price) return { type: 'hold', confidencePercent: 0 };

    const prices = coin.sparkline_in_7d.price;
    const currentPrice = coin.current_price;
    
    // Simüle edilmiş hacim verileri (CoinGecko'da yok)
    const volumes = prices.map(() => Math.random() * 1000000 + 100000);

    // Temel göstergeler
    const rsi = calculateRSI(prices);
    const ma7 = calculateMA(prices, 7);
    const ma14 = calculateMA(prices, 14);
    const ma30 = calculateMA(prices, 30);
    const macd = calculateMACD(prices);
    const bb = calculateBollingerBands(prices);
    const vwap = calculateVWAP(prices);
    const sr = findSupportResistance(prices);
    const atr = calculateATR(prices);
    const stoch = calculateStochastic(prices);

    // Yeni göstergeler
    const williamsR = calculateWilliamsR(prices);
    const cci = calculateCCI(prices);
    const obv = calculateOBV(prices, volumes);
    const stochRSI = calculateStochasticRSI(prices);
    const mfi = calculateMoneyFlowIndex(prices, volumes);

    let buyPoints = 0, sellPoints = 0, maxPossiblePoints = 0;

    // === RSI Analizi (0-20 puan) ===
    maxPossiblePoints += 20;
    if (rsi !== null) {
        if (rsi < 30) {
            buyPoints += 20;
        } else if (rsi > 70) {
            sellPoints += 20;
        } else if (rsi < 45) {
            buyPoints += 10;
        } else if (rsi > 55) {
            sellPoints += 10;
        }
    }

    // === MA Trend Analizi (0-15 puan) ===
    maxPossiblePoints += 15;
    if (currentPrice > ma7 && ma7 > ma14 && ma14 > ma30) {
        buyPoints += 15;
    } else if (currentPrice < ma7 && ma7 < ma14 && ma14 < ma30) {
        sellPoints += 15;
    } else if (currentPrice > ma7 && ma7 > ma14) {
        buyPoints += 10;
    } else if (currentPrice < ma7 && ma7 < ma14) {
        sellPoints += 10;
    }

    // === MACD Analizi (0-15 puan) ===
    maxPossiblePoints += 15;
    if (macd.histogram > 0 && macd.macdLine > macd.signalLine) {
        buyPoints += 15;
    } else if (macd.histogram < 0 && macd.macdLine < macd.signalLine) {
        sellPoints += 15;
    } else if (macd.histogram > 0) {
        buyPoints += 8;
    } else {
        sellPoints += 8;
    }

    // === Bollinger Bands Analizi (0-10 puan) ===
    maxPossiblePoints += 10;
    if (bb && bb.position === 'lower') {
        buyPoints += 10;
    } else if (bb && bb.position === 'upper') {
        sellPoints += 10;
    }

    // === Williams %R Analizi (0-10 puan) ===
    maxPossiblePoints += 10;
    if (williamsR !== null) {
        if (williamsR < -80) {
            buyPoints += 10;
        } else if (williamsR > -20) {
            sellPoints += 10;
        } else if (williamsR < -60) {
            buyPoints += 5;
        } else if (williamsR > -40) {
            sellPoints += 5;
        }
    }

    // === CCI Analizi (0-10 puan) ===
    maxPossiblePoints += 10;
    if (cci !== null) {
        if (cci < -100) {
            buyPoints += 10;
        } else if (cci > 100) {
            sellPoints += 10;
        } else if (cci < -50) {
            buyPoints += 5;
        } else if (cci > 50) {
            sellPoints += 5;
        }
    }

    // === Stochastic Analizi (0-10 puan) ===
    maxPossiblePoints += 10;
    if (stoch && stoch.k < 20 && stoch.d < 20) {
        buyPoints += 10;
    } else if (stoch && stoch.k > 80 && stoch.d > 80) {
        sellPoints += 10;
    } else if (stoch && stoch.k < 30 && stoch.d < 30) {
        buyPoints += 5;
    } else if (stoch && stoch.k > 70 && stoch.d > 70) {
        sellPoints += 5;
    }

    // === Stochastic RSI Analizi (0-10 puan) ===
    maxPossiblePoints += 10;
    if (stochRSI !== null) {
        if (stochRSI < 20) {
            buyPoints += 10;
        } else if (stochRSI > 80) {
            sellPoints += 10;
        } else if (stochRSI < 30) {
            buyPoints += 5;
        } else if (stochRSI > 70) {
            sellPoints += 5;
        }
    }

    // === Money Flow Index Analizi (0-10 puan) ===
    maxPossiblePoints += 10;
    if (mfi !== null) {
        if (mfi < 20) {
            buyPoints += 10;
        } else if (mfi > 80) {
            sellPoints += 10;
        } else if (mfi < 30) {
            buyPoints += 5;
        } else if (mfi > 70) {
            sellPoints += 5;
        }
    }

    // === Destek/Direnç Analizi (0-10 puan) ===
    maxPossiblePoints += 10;
    const distSupport = ((currentPrice - sr.support) / sr.support) * 100;
    const distResistance = ((sr.resistance - currentPrice) / currentPrice) * 100;
    if (distSupport < 3) {
        buyPoints += 10;
    } else if (distResistance < 3) {
        sellPoints += 10;
    } else if (distSupport < 8) {
        buyPoints += 5;
    } else if (distResistance < 8) {
        sellPoints += 5;
    }

    // === Volatilite Analizi (0-10 puan) ===
    maxPossiblePoints += 10;
    if (atr && atr < currentPrice * 0.015) {
        buyPoints += 10;
    } else if (atr && atr > currentPrice * 0.05) {
        sellPoints += 5;
    }

    // === Sinyal Belirleme ===
    const type = buyPoints > sellPoints ? 'buy' : sellPoints > buyPoints ? 'sell' : 'hold';
    const maxPoints = Math.max(buyPoints, sellPoints);
    const confidencePercent = Math.min(100, Math.round((maxPoints / maxPossiblePoints) * 100));

    // === Detaylı Açıklama ===
    const indicators = [];
    if (rsi !== null) indicators.push(`RSI:${rsi.toFixed(1)}`);
    if (williamsR !== null) indicators.push(`W%R:${williamsR.toFixed(1)}`);
    if (cci !== null) indicators.push(`CCI:${cci.toFixed(1)}`);
    if (stochRSI !== null) indicators.push(`StochRSI:${stochRSI.toFixed(1)}`);
    if (mfi !== null) indicators.push(`MFI:${mfi.toFixed(1)}`);

    return {
        type,
        confidencePercent,
        confidence: confidencePercent / 100,
        reason: type === 'buy' ? 'Alım Sinyali' : type === 'sell' ? 'Satış Sinyali' : 'Bekle',
        description: indicators.join(', '),
        buyPoints,
        sellPoints,
        maxPossiblePoints
    };
}

// === TradingView Modal ===
function showCoinDetail(coin) {
    const signal = generateSignalForCoin(coin);
    const prices = coin.sparkline_in_7d.price;
    const currentPrice = coin.current_price;
    const volumes = prices.map(() => Math.random() * 1000000 + 100000);
    
    // Tüm göstergeleri hesapla
    const rsi = calculateRSI(prices);
    const williamsR = calculateWilliamsR(prices);
    const cci = calculateCCI(prices);
    const stochRSI = calculateStochasticRSI(prices);
    const mfi = calculateMoneyFlowIndex(prices, volumes);
    const ma7 = calculateMA(prices, 7);
    const ma14 = calculateMA(prices, 14);
    const ma30 = calculateMA(prices, 30);
    const macd = calculateMACD(prices);
    const bb = calculateBollingerBands(prices);
    const stoch = calculateStochastic(prices);
    const atr = calculateATR(prices);
    const vwap = calculateVWAP(prices);
    const sr = findSupportResistance(prices);

    coinDetail.innerHTML = `
        <div style="text-align:center;margin-bottom:15px;">
            <img src="${coin.image}" alt="${coin.name}" style="width:60px;height:60px;border-radius:50%;margin-bottom:8px;">
            <h2>${coin.name} (${coin.symbol.toUpperCase()})</h2>
            <p style="font-size:1.3rem;color:#ffd700;">$${formatPrice(coin.current_price)}</p>
        </div>
        
        <div style="margin-bottom:20px;background:rgba(255,255,255,0.05);padding:15px;border-radius:10px;">
            <h3 style="margin-top:0;color:#ffd700;">📊 Sinyal Analizi</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;font-size:0.9rem;">
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>Güven Skoru:</b> <span style="color:${signal.confidencePercent >= 70 ? '#00ff00' : signal.confidencePercent >= 50 ? '#ffff00' : '#ff6b6b'}">${signal.confidencePercent}%</span></div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${signal.confidencePercent >= 70 ? 'Çok güçlü sinyal - Yüksek güven' : signal.confidencePercent >= 50 ? 'Orta güçlü sinyal - Dikkatli ol' : 'Zayıf sinyal - Riskli'}
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>Sinyal:</b> <span style="color:${signal.type === 'buy' ? '#00ff00' : signal.type === 'sell' ? '#ff6b6b' : '#ffff00'}">${signal.reason}</span></div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${signal.type === 'buy' ? 'Alım yapılabilir - Fiyat yükseliş beklenir' : signal.type === 'sell' ? 'Satış yapılabilir - Fiyat düşüş beklenir' : 'Bekle - Net sinyal yok'}
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>Alım Puanı:</b> ${signal.buyPoints}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${signal.buyPoints > signal.sellPoints ? 'Alım sinyalleri baskın - Pozitif' : 'Alım sinyalleri zayıf - Negatif'}
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>Satım Puanı:</b> ${signal.sellPoints}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${signal.sellPoints > signal.buyPoints ? 'Satım sinyalleri baskın - Negatif' : 'Satım sinyalleri zayıf - Pozitif'}
                    </div>
                </div>
            </div>
        </div>

        <div style="margin-bottom:20px;background:rgba(255,255,255,0.05);padding:15px;border-radius:10px;">
            <h3 style="margin-top:0;color:#ffd700;">📈 Teknik Göstergeler</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;font-size:0.9rem;">
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>RSI:</b> ${rsi ? rsi.toFixed(1) : 'N/A'} ${rsi < 30 ? '🟢' : rsi > 70 ? '🔴' : '🟡'}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${rsi < 30 ? 'Aşırı satım - Alım fırsatı' : rsi > 70 ? 'Aşırı alım - Satış fırsatı' : 'Nötr bölge - Bekle'}
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>Williams %R:</b> ${williamsR ? williamsR.toFixed(1) : 'N/A'} ${williamsR < -80 ? '🟢' : williamsR > -20 ? '🔴' : '🟡'}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${williamsR < -80 ? 'Aşırı satım - Güçlü alım' : williamsR > -20 ? 'Aşırı alım - Satış sinyali' : 'Nötr - Trend devam'}
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>CCI:</b> ${cci ? cci.toFixed(1) : 'N/A'} ${cci < -100 ? '🟢' : cci > 100 ? '🔴' : '🟡'}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${cci < -100 ? 'Aşırı satım - Trend dönüşü' : cci > 100 ? 'Aşırı alım - Düzeltme beklenir' : 'Normal seviye - Trend devam'}
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>Stoch RSI:</b> ${stochRSI ? stochRSI.toFixed(1) : 'N/A'} ${stochRSI < 20 ? '🟢' : stochRSI > 80 ? '🔴' : '🟡'}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${stochRSI < 20 ? 'Momentum düşük - Alım zamanı' : stochRSI > 80 ? 'Momentum yüksek - Satış zamanı' : 'Orta momentum - Bekle'}
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>MFI:</b> ${mfi ? mfi.toFixed(1) : 'N/A'} ${mfi < 20 ? '🟢' : mfi > 80 ? '🔴' : '🟡'}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${mfi < 20 ? 'Para akışı düşük - Alım fırsatı' : mfi > 80 ? 'Para akışı yüksek - Satış fırsatı' : 'Normal para akışı - İzle'}
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>Stochastic K:</b> ${stoch ? stoch.k.toFixed(1) : 'N/A'} ${stoch && stoch.k < 20 ? '🟢' : stoch && stoch.k > 80 ? '🔴' : '🟡'}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${stoch && stoch.k < 20 ? 'Fiyat düşük - Alım sinyali' : stoch && stoch.k > 80 ? 'Fiyat yüksek - Satış sinyali' : 'Orta seviye - Trend devam'}
                    </div>
                </div>
            </div>
        </div>

        <div style="margin-bottom:20px;background:rgba(255,255,255,0.05);padding:15px;border-radius:10px;">
            <h3 style="margin-top:0;color:#ffd700;">📊 Hareketli Ortalamalar</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;font-size:0.9rem;">
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>MA7:</b> $${ma7 ? ma7.toFixed(4) : 'N/A'}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${currentPrice > ma7 ? 'Fiyat MA7 üstünde - Yükseliş trendi' : 'Fiyat MA7 altında - Düşüş trendi'}
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>MA14:</b> $${ma14 ? ma14.toFixed(4) : 'N/A'}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${currentPrice > ma14 ? 'Fiyat MA14 üstünde - Orta vadeli yükseliş' : 'Fiyat MA14 altında - Orta vadeli düşüş'}
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>MA30:</b> $${ma30 ? ma30.toFixed(4) : 'N/A'}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${currentPrice > ma30 ? 'Fiyat MA30 üstünde - Uzun vadeli yükseliş' : 'Fiyat MA30 altında - Uzun vadeli düşüş'}
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>VWAP:</b> $${vwap.toFixed(4)}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${currentPrice > vwap ? 'Fiyat VWAP üstünde - Güçlü alım baskısı' : 'Fiyat VWAP altında - Satış baskısı'}
                    </div>
                </div>
            </div>
        </div>

        <div style="margin-bottom:20px;background:rgba(255,255,255,0.05);padding:15px;border-radius:10px;">
            <h3 style="margin-top:0;color:#ffd700;">🎯 Destek & Direnç</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;font-size:0.9rem;">
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>Destek:</b> $${sr.support.toFixed(4)}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${((currentPrice - sr.support) / sr.support * 100) < 5 ? 'Fiyat desteğe yakın - Alım fırsatı' : 'Destek seviyesi uzak - Güvenli'}
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>Direnç:</b> $${sr.resistance.toFixed(4)}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${((sr.resistance - currentPrice) / currentPrice * 100) < 5 ? 'Fiyat dirence yakın - Satış fırsatı' : 'Direnç seviyesi uzak - Yükseliş devam'}
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>ATR (Volatilite):</b> $${atr ? atr.toFixed(4) : 'N/A'}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${atr && atr < currentPrice * 0.02 ? 'Düşük volatilite - Stabil trend' : atr && atr > currentPrice * 0.05 ? 'Yüksek volatilite - Dikkatli ol' : 'Normal volatilite - Standart risk'}
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
                    <div><b>BB Pozisyon:</b> ${bb ? bb.position : 'N/A'}</div>
                    <div style="font-size:0.8rem;color:#ccc;margin-top:3px;">
                        ${bb && bb.position === 'lower' ? 'Alt banda yakın - Alım fırsatı' : bb && bb.position === 'upper' ? 'Üst banda yakın - Satış fırsatı' : 'Orta banda - Nötr durum'}
                    </div>
                </div>
            </div>
        </div>

        <div id="tradingview-widget" style="height:400px;width:100%;"></div>
    `;
    modal.style.display = 'block';
    loadTradingViewChart(coin.symbol.toUpperCase());
}

function loadTradingViewChart(symbol) {
    const container = document.getElementById('tradingview-widget');
    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: `BINANCE:${symbol}USDT`,
        interval: "D",
        timezone: "Europe/Istanbul",
        theme: "dark",
        style: "1",
        locale: "tr",
        enable_publishing: false,
        allow_symbol_change: false,
    });
    container.appendChild(script);
}

// === UI Rendering ===
async function generateSignals() {
    const topCoins = allCoins.slice(0, 20);
    const signals = topCoins.map(c => ({ coin: c, signal: generateSignalForCoin(c) }))
        .filter(s => s.signal.confidencePercent >= 50)
        .sort((a, b) => b.signal.confidencePercent - a.signal.confidencePercent)
        .slice(0, 6);
    renderSignals(signals);
}

function renderSignals(signals) {
    signalsContainer.innerHTML = '';
    signals.forEach(({ coin, signal }) => {
        const div = document.createElement('div');
        div.className = `signal-card ${signal.type}`;
        div.innerHTML = `
            <div class="signal-header">
                <span class="signal-type">${signal.type.toUpperCase()}</span>
                <span class="signal-coin">${coin.name}</span>
            </div>
            <div class="signal-price">₺${formatPrice(coin.current_price)}</div>
            <div class="signal-reason">${signal.reason}</div>
            <div>Güven: ${signal.confidencePercent}%</div>
        `;
        div.addEventListener('click', () => showCoinDetail(coin));
        signalsContainer.appendChild(div);
    });
}

// === Search & Filter ===
function handleSearch() {
    const query = searchInput.value.toLowerCase();
    filteredCoins = allCoins.filter(coin => 
        coin.name.toLowerCase().includes(query) || 
        coin.symbol.toLowerCase().includes(query)
    );
    renderCoins();
}

function filterCoins() {
    if (currentFilter === 'all') {
        filteredCoins = [...allCoins];
    } else if (currentFilter === 'guc') {
        filteredCoins = allCoins.filter(coin => {
            const signal = generateSignalForCoin(coin);
            return signal.type === 'buy' && signal.confidencePercent >= 70;
        });
    } else if (currentFilter === 'positive') {
        filteredCoins = allCoins.filter(coin => coin.price_change_percentage_24h > 0);
    } else if (currentFilter === 'negative') {
        filteredCoins = allCoins.filter(coin => coin.price_change_percentage_24h < 0);
    }
    renderCoins();
}

// === Helpers ===
function formatPrice(price) { return price < 1 ? price.toFixed(4) : price.toFixed(2); }
function formatCurrency(val) { return '$' + (val / 1e9).toFixed(2) + 'B'; }
function showLoading() { loading.style.display = 'flex'; }
function hideLoading() { loading.style.display = 'none'; }

// Auto-refresh
setInterval(() => { loadMarketData(); loadCoins(); generateSignals(); }, 300000);