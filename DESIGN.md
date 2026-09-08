# Design System & UI Specification: My Watchlist (Indian Stock Screener)

## 1. Overview
**My Watchlist** is an Indian stock screener and swing trading radar web application. It monitors equities from NSE and BSE, syncs with Google Sheets ("Spark Stock List"), and runs automated scans for swing setups, technical indicators (MACD, RSI, 20D/52W breakouts, volume surge), SWOT analysis, and valuation metrics.

---

## 2. Design Philosophy & Aesthetics
- **Aesthetic**: Modern financial terminal with clean card-based hierarchy, high-contrast badges, and responsive data-dense layouts.
- **Tone**: Professional, data-driven, rapid scanning, mobile-optimized (iPhone PWA ready).
- **Theme**: Neutral Slate background with vibrant accents (Emerald for gains/bullish, Crimson for risks/bearish, Royal Blue for primary actions, Amber for warnings).

---

## 3. Design Tokens

### 3.1 Color Palette
```css
/* Backgrounds */
--bg-main: #f8fafc;        /* Slate 50 */
--bg-card: #ffffff;        /* Pure White */
--bg-subtle: #f1f5f9;      /* Slate 100 */
--bg-dark-terminal: #0f172a; /* Slate 900 (for Dark Mode / PWA Header) */

/* Typography Colors */
--text-primary: #0f172a;   /* Slate 900 */
--text-secondary: #475569; /* Slate 600 */
--text-muted: #64748b;     /* Slate 500 */

/* Borders & Dividers */
--border-color: #e2e8f0;   /* Slate 200 */
--border-hover: #cbd5e1;   /* Slate 300 */

/* Accents & Status */
--primary: #2563eb;        /* Blue 600 */
--primary-hover: #1d4ed8;  /* Blue 700 */
--primary-light: #eff6ff;  /* Blue 50 */

--success: #059669;        /* Emerald 600 */
--success-bg: #dcfce7;     /* Emerald 100 */

--warning: #d97706;        /* Amber 600 */
--warning-bg: #fef3c7;     /* Amber 100 */

--danger: #dc2626;         /* Red 600 */
--danger-bg: #fee2e2;      /* Red 100 */

--purple: #7c3aed;         /* Violet 600 */
--purple-bg: #f3e8ff;      /* Violet 100 */
```

### 3.2 Typography
- **Primary Font Family**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Monospace Font (for prices/ratios)**: `"SF Mono", "Fira Code", "Roboto Mono", monospace`
- **Scale**:
  - App Header: `18px`, Weight `800`
  - Section Headings: `18px - 20px`, Weight `800`
  - Card Titles: `16px`, Weight `700`
  - Metrics / Numbers: `14px - 16px`, Weight `700` (Monospace / High Legibility)
  - Body & Labels: `13px - 14px`, Weight `400` - `500`
  - Subtitles & Badges: `11px - 12px`, Weight `600`

### 3.3 Elevation & Shapes
- **Corner Radii**:
  - Small pills & badges: `8px`
  - Form controls & buttons: `10px - 12px`
  - Cards & modals: `16px`
- **Shadows**:
  - Card shadow: `0 4px 12px rgba(0, 0, 0, 0.05)`
  - Elevated / Hover shadow: `0 10px 25px rgba(0, 0, 0, 0.08)`
  - Sticky headers: `0 1px 3px rgba(0, 0, 0, 0.05)`

---

## 4. Layout & Core Components

### 4.1 Header Bar
- Sticky at top (`z-index: 100`)
- **Brand Title**: "📈 My Watchlist - Indian Equities Daily Screener & Swing Radar"
- **Actions Bar**:
  - Last Updated Timestamp Pill (with green pulse indicator)
  - "➕ Add Stock" Button (opens quick add modal)
  - "🔄 Refresh Analysis" Button (triggers live Python background scanner)
  - "⚡ Reset Cache" Button (iOS Safari / PWA cache bust)

### 4.2 Welcome & System Summary Banner
- Hero greeting with status connection to Google Sheet (`Spark Stock List`).
- Quick-stats pills: `Total Scanned`, `20 Best Swing Picks`, `Google Sheet Status`, `Email Settings`.

### 4.3 Navigation Tabs
- Segmented tab bar with active border & smooth pill highlight:
  1. `🚀 20 Best Swing Trading Stocks (1-15 Days)`
  2. `📊 My Watchlist` (Comprehensive list of equities)
  3. `💪 Strength & Weakness` (SWOT / Bullish vs Bearish breakdown)
  4. `ℹ️ System Information` (Cron jobs, scan schedules, runner logs)

### 4.4 Swing Trading Stock Card (`.stock-card`)
- **Card Header**:
  - Stock Symbol (e.g. `TCS.NS`) + Company Name
  - Sector & Market Cap Category (Large / Mid / Small)
  - Live CMP (Current Market Price) + 1-Day % Change Badge (Green/Red)
- **Technical Indicator Grid**:
  - 20-Day SMA / 50-Day SMA / 200-Day SMA status
  - RSI (14) indicator with color-coded sentiment (Oversold <30, Neutral, Overbought >70)
  - Volume Surge multiplier (e.g., `2.4x 10D Avg`)
  - Breakout tags (`52W High Nearby`, `MACD Bullish Crossover`)
- **Card Action Footer**:
  - Target 1 & Target 2 projection pills
  - Stop Loss recommendation
  - External link to TradingView chart / Screener.in

### 4.5 Filter & Search Bar
- Quick search bar with instant debounce filtering.
- Filter chips: `All`, `Nifty 50`, `High Momentum`, `Near 52W High`, `Oversold Rebound`, `P/E < 25`.

### 4.6 Modals
- **Add Stock Modal**: Symbol input (autocomplete support), exchange picker (NSE/BSE), Target price, Buy price.
- **Google Sheet Sync Modal**: View sheet URL, sync status, manual pull/push triggers.
- **Email Config Modal**: Notification receiver email address, briefing time toggle (8:00 AM IST).

---

## 5. Responsive Behavior
- **Desktop (1024px+)**: 3-column or 4-column responsive grid for stock cards; full multi-column data tables.
- **Tablet (768px - 1023px)**: 2-column card grid.
- **Mobile (< 768px)**: 1-column cards, sticky bottom action bar, horizontal scrollable tab navigation, touch-friendly 44px tap targets.
