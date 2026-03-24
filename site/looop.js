// Looop電気アプリ - メインスクリプト

(function () {
  "use strict";

  // 30分ごとの48コマ料金データを生成（JEPX市場連動型をシミュレーション）
  function generateDailyPrices() {
    var prices = [];
    // 時間帯ごとの基本パターン（深夜安い、昼高い、夕方ピーク）
    var basePattern = [
      // 0:00-6:00 深夜帯（安い）
      14, 13, 12, 11, 10, 10, 10, 10, 11, 12, 13, 14,
      // 6:00-12:00 朝〜昼（上昇）
      16, 18, 20, 22, 25, 27, 28, 30, 30, 29, 28, 26,
      // 12:00-18:00 昼〜夕方（高め）
      25, 24, 23, 24, 26, 28, 32, 35, 38, 40, 38, 35,
      // 18:00-24:00 夜（下降）
      32, 30, 28, 25, 22, 20, 18, 16, 15, 14, 14, 14
    ];

    for (var i = 0; i < 48; i++) {
      // ランダム変動を加える（±3円）
      var variation = (Math.random() - 0.5) * 6;
      var price = Math.max(5, Math.round((basePattern[i] + variation) * 10) / 10);
      prices.push(price);
    }
    return prices;
  }

  // 現在の30分コマインデックスを取得
  function getCurrentSlotIndex() {
    var now = new Date();
    return now.getHours() * 2 + (now.getMinutes() >= 30 ? 1 : 0);
  }

  // コマインデックスから時間帯文字列を生成
  function slotToTimeString(index) {
    var startHour = Math.floor(index / 2);
    var startMin = (index % 2) * 30;
    var endIndex = index + 1;
    var endHour = Math.floor(endIndex / 2);
    var endMin = (endIndex % 2) * 30;
    if (endIndex >= 48) {
      endHour = 0;
      endMin = 0;
    }
    return pad(startHour) + ":" + pad(startMin) + " 〜 " + pad(endHour) + ":" + pad(endMin);
  }

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  // 料金レベル判定
  function getPriceLevel(price, prices) {
    var avg = prices.reduce(function (a, b) { return a + b; }, 0) / prices.length;
    if (price <= avg * 0.7) return "low";
    if (price >= avg * 1.3) return "high";
    return "mid";
  }

  function getPriceLevelLabel(level) {
    if (level === "low") return "おトク";
    if (level === "high") return "高め";
    return "普通";
  }

  // カウントダウン計算
  function getCountdown() {
    var now = new Date();
    var min = now.getMinutes();
    var sec = now.getSeconds();
    var remainMin, remainSec;
    if (min < 30) {
      remainMin = 29 - min;
      remainSec = 59 - sec;
    } else {
      remainMin = 59 - min;
      remainSec = 59 - sec;
    }
    return pad(remainMin) + ":" + pad(remainSec);
  }

  // グラフ描画
  function drawChart(prices, currentSlot) {
    var canvas = document.getElementById("priceChart");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    var w = rect.width;
    var h = rect.height;
    var padding = { top: 20, right: 12, bottom: 30, left: 40 };
    var chartW = w - padding.left - padding.right;
    var chartH = h - padding.top - padding.bottom;

    var maxPrice = Math.max.apply(null, prices) + 5;
    var minPrice = Math.max(0, Math.min.apply(null, prices) - 5);
    var priceRange = maxPrice - minPrice;

    ctx.clearRect(0, 0, w, h);

    // Y軸グリッド線
    ctx.strokeStyle = "#ecf0f1";
    ctx.lineWidth = 1;
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#b2bec3";
    ctx.textAlign = "right";
    for (var g = 0; g <= 4; g++) {
      var yVal = minPrice + (priceRange / 4) * g;
      var yPos = padding.top + chartH - (chartH / 4) * g;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(w - padding.right, yPos);
      ctx.stroke();
      ctx.fillText(Math.round(yVal), padding.left - 4, yPos + 4);
    }

    // X軸ラベル
    ctx.textAlign = "center";
    ctx.fillStyle = "#b2bec3";
    var barW = chartW / 48;
    for (var t = 0; t < 48; t += 4) {
      var xLabel = padding.left + t * barW + barW / 2;
      ctx.fillText(pad(Math.floor(t / 2)) + ":00", xLabel, h - 6);
    }

    var avg = prices.reduce(function (a, b) { return a + b; }, 0) / prices.length;

    // 棒グラフ
    for (var i = 0; i < 48; i++) {
      var x = padding.left + i * barW;
      var barH = ((prices[i] - minPrice) / priceRange) * chartH;
      var y = padding.top + chartH - barH;

      if (i === currentSlot) {
        ctx.fillStyle = "#6c5ce7";
      } else {
        var level = getPriceLevel(prices[i], prices);
        if (level === "low") ctx.fillStyle = "#00b894";
        else if (level === "high") ctx.fillStyle = "#e74c3c";
        else ctx.fillStyle = "#fdcb6e";
      }

      var gap = 1;
      ctx.fillRect(x + gap, y, barW - gap * 2, barH);
    }

    // 平均線
    var avgY = padding.top + chartH - ((avg - minPrice) / priceRange) * chartH;
    ctx.strokeStyle = "#636e72";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, avgY);
    ctx.lineTo(w - padding.right, avgY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#636e72";
    ctx.textAlign = "left";
    ctx.fillText("平均 " + avg.toFixed(1), w - padding.right - 60, avgY - 4);
  }

  // 節約アドバイス生成
  function generateAdvice(prices, currentSlot) {
    var adviceList = document.getElementById("adviceList");
    if (!adviceList) return;

    // 最安コマを探す（現在以降）
    var cheapest = { index: -1, price: Infinity };
    var cheapestUpcoming = { index: -1, price: Infinity };
    for (var i = 0; i < 48; i++) {
      if (prices[i] < cheapest.price) {
        cheapest = { index: i, price: prices[i] };
      }
      if (i > currentSlot && prices[i] < cheapestUpcoming.price) {
        cheapestUpcoming = { index: i, price: prices[i] };
      }
    }

    var currentLevel = getPriceLevel(prices[currentSlot], prices);
    var advices = [];

    if (currentLevel === "low") {
      advices.push({
        icon: "✅",
        title: "今がチャンス！",
        text: "現在は電力料金が安い時間帯です。洗濯機や食洗機の使用におすすめです。"
      });
    } else if (currentLevel === "high") {
      advices.push({
        icon: "⚠️",
        title: "節電タイム",
        text: "現在は料金が高めです。不要な電力消費を控えましょう。"
      });
    }

    if (cheapestUpcoming.index > 0) {
      advices.push({
        icon: "⏰",
        title: "この後の最安時間帯",
        text: slotToTimeString(cheapestUpcoming.index) + " が " + cheapestUpcoming.price.toFixed(1) + " 円/kWh で最安です。"
      });
    }

    advices.push({
      icon: "🌙",
      title: "深夜帯を活用",
      text: "0:00〜6:00は料金が安い傾向です。タイマー機能を活用しましょう。"
    });

    advices.push({
      icon: "📱",
      title: "ピークシフト",
      text: "17:00〜20:00は最も高くなりやすい時間帯。事前に家電を使い終えましょう。"
    });

    adviceList.innerHTML = advices.map(function (a) {
      return '<div class="advice-item">' +
        '<span class="advice-icon">' + a.icon + '</span>' +
        '<div class="advice-text"><strong>' + a.title + '</strong><span>' + a.text + '</span></div>' +
        '</div>';
    }).join("");
  }

  // シミュレーター
  function setupSimulator(prices) {
    var slider = document.getElementById("usageSlider");
    var usageValue = document.getElementById("usageValue");
    if (!slider) return;

    function calculate() {
      var kWh = parseInt(slider.value, 10);
      usageValue.textContent = kWh;

      var avg = prices.reduce(function (a, b) { return a + b; }, 0) / prices.length;
      // Looop: 基本料金0円 + 市場連動単価
      var looop = Math.round(avg * kWh);
      // 従量電灯: 基本料金 + 3段階
      var traditional = 1180; // 基本料金 (30A)
      if (kWh <= 120) {
        traditional += kWh * 30;
      } else if (kWh <= 300) {
        traditional += 120 * 30 + (kWh - 120) * 36.6;
      } else {
        traditional += 120 * 30 + 180 * 36.6 + (kWh - 300) * 40.69;
      }
      traditional = Math.round(traditional);

      var savings = traditional - looop;

      document.getElementById("simLooop").textContent = looop.toLocaleString() + " 円";
      document.getElementById("simTraditional").textContent = traditional.toLocaleString() + " 円";
      var savingsEl = document.getElementById("simSavings");
      if (savings > 0) {
        savingsEl.textContent = "-" + savings.toLocaleString() + " 円";
        savingsEl.style.color = "#00b894";
      } else {
        savingsEl.textContent = "+" + Math.abs(savings).toLocaleString() + " 円";
        savingsEl.style.color = "#e74c3c";
      }
    }

    slider.addEventListener("input", calculate);
    calculate();
  }

  // 週間予測
  function generateForecast() {
    var grid = document.getElementById("forecastGrid");
    if (!grid) return;

    var days = ["日", "月", "火", "水", "木", "金", "土"];
    var today = new Date();
    var html = "";

    for (var d = 0; d < 7; d++) {
      var date = new Date(today);
      date.setDate(today.getDate() + d);
      var dayName = d === 0 ? "今日" : days[date.getDay()];
      var avgPrice = 18 + Math.random() * 15;
      avgPrice = Math.round(avgPrice * 10) / 10;

      var level;
      if (avgPrice < 22) level = "low";
      else if (avgPrice > 28) level = "high";
      else level = "mid";

      var color;
      if (level === "low") color = "#00b894";
      else if (level === "high") color = "#e74c3c";
      else color = "#fdcb6e";

      html += '<div class="forecast-day">' +
        '<div class="forecast-day-name">' + dayName + '</div>' +
        '<div class="forecast-day-price" style="color:' + color + '">' + avgPrice.toFixed(0) + '</div>' +
        '<div class="forecast-day-bar" style="background:' + color + '"></div>' +
        '<div class="forecast-day-trend">円</div>' +
        '</div>';
    }
    grid.innerHTML = html;
  }

  // メイン更新
  function update(prices) {
    var slot = getCurrentSlotIndex();
    var currentPrice = prices[slot];
    var level = getPriceLevel(currentPrice, prices);

    // 現在の料金
    var priceEl = document.getElementById("currentPrice");
    priceEl.textContent = currentPrice.toFixed(1);
    priceEl.className = "price-value " + level;

    // ステータス
    var statusEl = document.getElementById("priceStatus");
    var dot = statusEl.querySelector(".status-dot");
    var text = statusEl.querySelector(".status-text");
    dot.className = "status-dot " + level;
    text.textContent = getPriceLevelLabel(level) + "な料金帯です";

    // 時間帯
    document.getElementById("currentTimeSlot").textContent = slotToTimeString(slot);

    // カウントダウン
    document.getElementById("countdown").textContent = getCountdown();

    // サマリー
    var minPrice = Math.min.apply(null, prices);
    var maxPrice = Math.max.apply(null, prices);
    var avgPrice = prices.reduce(function (a, b) { return a + b; }, 0) / prices.length;
    var minIndex = prices.indexOf(minPrice);
    var maxIndex = prices.indexOf(maxPrice);

    document.getElementById("todayLow").textContent = minPrice.toFixed(1);
    document.getElementById("todayLowTime").textContent = slotToTimeString(minIndex).split(" 〜 ")[0];
    document.getElementById("todayHigh").textContent = maxPrice.toFixed(1);
    document.getElementById("todayHighTime").textContent = slotToTimeString(maxIndex).split(" 〜 ")[0];
    document.getElementById("todayAvg").textContent = avgPrice.toFixed(1);

    // 推定コスト（1日平均15kWh使用と仮定）
    var dailyUsage = 15;
    var cost = Math.round(avgPrice * dailyUsage);
    document.getElementById("todayCost").textContent = cost;

    // グラフ
    drawChart(prices, slot);
  }

  // 初期化
  function init() {
    var prices = generateDailyPrices();
    update(prices);
    generateAdvice(prices, getCurrentSlotIndex());
    setupSimulator(prices);
    generateForecast();

    // 毎秒カウントダウン更新
    setInterval(function () {
      document.getElementById("countdown").textContent = getCountdown();
    }, 1000);

    // 1分ごとにコマチェック（30分の切り替わりで更新）
    var lastSlot = getCurrentSlotIndex();
    setInterval(function () {
      var newSlot = getCurrentSlotIndex();
      if (newSlot !== lastSlot) {
        lastSlot = newSlot;
        update(prices);
        generateAdvice(prices, newSlot);
      }
    }, 10000);

    // リサイズ時にグラフ再描画
    window.addEventListener("resize", function () {
      drawChart(prices, getCurrentSlotIndex());
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
