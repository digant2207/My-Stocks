# 📈 Antigravity Stock Watchlist - Indian Equities Screener & Swing Radar

A modern, automated Indian stock market screener and swing trading radar synced with **Google Sheets**, featuring AI-assisted technical chart pattern detection, multi-horizon price action logic, fundamental health scoring, and automated daily email briefings.

---

## 🌟 Key Features

### 🎯 1. 20 Best Swing Trading Stocks (1 - 15 Days Horizon)
- **Breakout Zone Prioritization**: Ranks candidates based on proximity to 20-Day High, 50-Day Range Ceiling, 52-Week High, or chart pattern breakout resistance levels.
- **Volume Expansion (RVOL)**: Identifies institutional accumulation surges (Volume > 1.2x to 15x of 1-Month Average).
- **Explicit Buy & Sell Triggers**: Provides actionable price action trigger levels:
  - 🟢 **BUY TRIGGER POINT**: e.g., `BUY ABOVE ₹1,425.50`
  - 🔴 **SELL TRIGGER (STOP LOSS)**: e.g., `SELL BELOW ₹1,380.00` (1:2.2+ Risk-to-Reward Ratio).

---

### 🏆 2. Composite Score Engine (0 - 100 Points)
Calculates a multi-factor rating for every equity:
- **Fundamental Health (35 Pts)**: YoY Revenue/Profit growth, ROE > 12-18%, sector debt-to-equity adjustments (exempts Banks/NBFCs), and promoter pledge warnings.
- **Technical Momentum (35 Pts)**: 20/50/200 EMA trend alignment, sweet spot RSI (50–68), MACD positive histogram expansion.
- **Chart Pattern & Volume Surge (15 Pts)**: Cup & Handle, Ascending Triangle, Bull Flag, VCP, Double Bottom W-Pattern.
- **Valuation & Analyst Upside (15 Pts)**: Consensus price target upside potential and P/E valuation ratios.

---

### 💪 3. Dedicated Strength & Weakness (SWOT) Deep Analysis
Includes 4 separate, dedicated analysis cards for any selected stock:
1. **💪 Bullish Strengths & Positives**: Technical breakouts, ROE, zero debt, 200 EMA support.
2. **⚠️ Bearish Weaknesses & Red Flags**: Overbought RSI, margin de-growth, promoter pledge alerts.
3. **📅 Corporate & Upcoming Events**: Earnings release dates, dividends, stock splits, AGMs.
4. **📰 Recent News & Recommendations**: Quarterly financial result summaries and analyst target revisions.

---

### ⏰ 4. Dual-Tier Market Hours Scheduler
- **8:00 AM & 6:00 PM IST (Daily Deep Scan)**: Syncs Google Sheet, updates full fundamental/technical parameters, and dispatches the **8:00 AM Email Digest**.
- **9:00 AM – 4:00 PM IST (Market Hours Live Scanner)**: Runs a 5-minute lightweight ticker scan to update real-time prices, volume surges, and breakout alerts during Indian market trading hours.

---

### 📊 5. Google Sheet Integration
Synced directly with Google Sheet **"Spark Stock List"**:
- **Sheet Link**: [`https://docs.google.com/spreadsheets/d/1_rWhyap8gO-u8ehP1vDCiad-RwnFjGBCn2R5qiis4_A/edit`](https://docs.google.com/spreadsheets/d/1_rWhyap8gO-u8ehP1vDCiad-RwnFjGBCn2R5qiis4_A/edit)
- Automatically imports any newly added BSE/NSE stock symbols.

---

## 📁 Repository File Structure

| File | Description |
| :--- | :--- |
| [`index.html`](file:///index.html) | Dashboard UI with 4 main navigation tabs and modal settings |
| [`app.js`](file:///app.js) | Client-side JS rendering Swing Cards, Watchlist Table, and SWOT cards |
| [`styles.css`](file:///styles.css) | Responsive CSS layout and glassmorphism styling |
| [`analyzer.py`](file:///analyzer.py) | Technical indicator calculation, price action rules, and SWOT generator |
| [`chart_patterns.py`](file:///chart_patterns.py) | Classical chart pattern recognition algorithms |
| [`fast_market_scanner.py`](file:///fast_market_scanner.py) | Fast market-hours live price, RVOL, and breakout scanner |
| [`fast_runner.py`](file:///fast_runner.py) | Parallel multi-threaded stock scanner engine |
| [`google_sheet_manager.py`](file:///google_sheet_manager.py) | Dynamic Google Sheet CSV importer & stock list sync |
| [`email_notifier.py`](file:///email_notifier.py) | 8:00 AM daily briefing email dispatcher |
| [`scheduler.py`](file:///scheduler.py) | Dual-tier market hours background job scheduler |
| [`server.py`](file:///server.py) | Python HTTP server daemon & API handler |
| [`manifest.json`](file:///manifest.json) | Web App Manifest for iOS/Android PWA support |
| [`apple-touch-icon.png`](file:///apple-touch-icon.png) | 3D Gold & Emerald iPhone Home Screen Icon |

---

## 📱 Mobile Access & GitHub Pages

- **Live GitHub Pages URL**: [`https://digant2207.github.io/My-Stocks/`](https://digant2207.github.io/My-Stocks/)
- **iPhone Home Screen**: Open link in Safari → Tap Share (`⎋`) → **Add to Home Screen**.

---

### 💻 Local Run Commands
To run the local backend server and scheduler manually:
```bash
python server.py
```
Or double-click [`Start_App.bat`](file:///Start_App.bat).
