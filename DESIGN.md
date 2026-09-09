# Design System & UI Specification: My Watchlist (Warm Nordic Sand)

## 1. Overview
**My Watchlist** is an Indian stock screener and swing trading radar web application. It monitors equities from NSE and BSE, syncs with Google Sheets ("Spark Stock List"), and runs automated scans for swing setups, technical indicators (MACD, RSI, 20D/52W breakouts, volume surge), SWOT analysis, and valuation metrics.

---

## 2. Design Philosophy & Aesthetics
- **Theme**: **Warm Nordic Sand** - Natural organic sand undertones, frosted glass surfaces, and high-contrast precision financial accents.
- **Aesthetic**: Premium financial terminal with clean card-based hierarchy, frosted glassmorphism, responsive data-dense layouts, and smooth micro-interactions.
- **Tone**: High clarity, data-driven, rapid scanning, mobile-optimized (iPhone PWA ready with native feel).

---

## 3. Design Tokens

### 3.1 Color Palette
```css
/* Warm Nordic Sand Palette */
--bg-main: #f4efea;              /* Warm Sand 100 - Main Page Canvas */
--bg-card: #ffffff;              /* Pure White Card Base */
--bg-subtle: #faf8f5;            /* Sand 50 - Card Secondary / Subtle Surface */
--bg-container: #ebe3db;         /* Sand 200 - Surface Container High */
--bg-dark-terminal: #1c1917;     /* Sand 900 - Deep Onyx Accents */

/* Typography Colors */
--text-primary: #1c1917;         /* Sand 900 - High Contrast Ink */
--text-secondary: #57534e;       /* Stone 600 - Secondary Body */
--text-muted: #78716c;           /* Stone 500 - Captions & Subtitles */

/* Borders & Dividers */
--border-color: #ebe3db;         /* Sand 200 - Organic Warm Border */
--border-hover: #ded3c7;         /* Sand 300 - Border on Hover */
--border-focus: #1d4ed8;         /* Precision Focus Ring */

/* Financial Status Accents */
--primary: #1d4ed8;              /* Royal Blue 700 - Brand & Primary Actions */
--primary-hover: #1e40af;        /* Royal Blue 800 */
--primary-light: #eff6ff;        /* Soft Blue Highlight */

--success: #059669;              /* Emerald 600 - Bullish / Gains */
--success-bg: #dcfce7;           /* Emerald 100 Container */
--success-border: #86efac;       /* Emerald Border */

--danger: #e11d48;               /* Rose 600 - Bearish / Red Flags / Stop Loss */
--danger-bg: #ffe4e6;            /* Rose 100 Container */
--danger-border: #fca5a5;        /* Rose Border */

--warning: #b45309;              /* Amber 700 - Caution / Consolidating */
--warning-bg: #fef3c7;           /* Amber 100 Container */

--purple: #6d28d9;               /* Violet 700 - Patterns / AI Insights */
--purple-bg: #f5f3ff;            /* Violet 100 Container */
```

### 3.2 Typography
- **Primary Body Font**: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Monospace Font (for prices, ratios, tickers)**: `'JetBrains Mono', 'SF Mono', 'Fira Code', monospace`
- **Scale**:
  - App Brand Title: `18px`, Weight `800`
  - Section Headings: `18px - 20px`, Weight `800`
  - Card Titles: `15px - 16px`, Weight `700`
  - Metrics / Numbers: `15px - 17px`, Weight `700` (`JetBrains Mono`)
  - Body & Labels: `13px - 14px`, Weight `500`
  - Badges & Pills: `10px - 11px`, Weight `700` (`JetBrains Mono` / `Plus Jakarta Sans`)

### 3.3 Elevation & Surfaces
- **Glassmorphism**: `background: rgba(255, 255, 255, 0.88); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border: 1px solid rgba(235, 227, 219, 0.95);`
- **Corner Radii**:
  - Badges & Pills: `6px - 8px` / Full Pill `9999px`
  - Form Controls & Buttons: `10px - 12px`
  - Cards & Bento Widgets: `16px`
  - Modals: `20px`
- **Shadows**:
  - Soft Card: `0 4px 20px rgba(78, 64, 43, 0.05)`
  - Elevated Hover: `transform: translateY(-2px); box-shadow: 0 12px 28px -4px rgba(78, 64, 43, 0.1), 0 4px 10px -2px rgba(78, 64, 43, 0.04); border-color: #d8d0c2;`

---

## 4. Layout & Core Components

### 4.1 Header Bar
- Sticky at top (`z-index: 100`) with glass frosted background.
- Brand logo + title: "📈 My Watchlist - Indian Equities Daily Screener & Swing Radar".
- Pulsing real-time Market Open indicator.
- Action triggers: "➕ Add Stock", "🔄 Refresh Analysis", "⚡ Reset Cache".

### 4.2 Bento Market Overview Banner
- Dynamic horizontal card carousel / grid:
  1. **NIFTY 50** real-time index card.
  2. **SENSEX** real-time index card.
  3. **Scanned Stocks** count pill.
  4. **Best Swing Picks** count badge.
  5. **Google Sheet Sync** live connection badge.

### 4.3 Navigation & Tabs
- **Desktop Navigation**: Horizontal segmented pill tabs with active indicator:
  1. `🚀 20 Best Swing Trading Stocks (1-15 Days)`
  2. `📊 My Watchlist`
  3. `💪 Strength & Weakness (SWOT)`
  4. `ℹ️ System Information`
- **Mobile Bottom Navigation Bar** (`.mobile-nav`):
  - Fixed dock at bottom on mobile (`@media (max-width: 768px)`), hidden on desktop.
  - Quick touch targets: 20 Swing, Watchlist, SWOT, System.

### 4.4 Swing Trading Stock Card (`.stock-card`)
- **Top Accent Bar**: Color-coded top edge (Emerald for bullish setup, Crimson for caution).
- **Header**: Ticker (e.g. `TCS.NS`) in JetBrains Mono + Score Pill (`9.2 / 10`), company name, current price, and 1-day change.
- **Composite Score Banner**: Bullish setup status + composite score (`92/100`).
- **Trigger Levels**:
  - 🟢 **BUY TRIGGER POINT (ENTRY)**: `BUY ABOVE ₹X,XXX.XX`
  - 🔴 **SELL TRIGGER POINT (STOP LOSS)**: `SELL BELOW ₹X,XXX.XX`
- **Targets & Projections**: Target 1 (1-7D) & Target 2 (7-15D) formatted in JetBrains Mono.
- **Indicators Grid**: 20D SMA, RSI(14) with visual progress bar, RVOL Surge multiplier.
- **AI Strategy Suggestion**: Clean highlighted guidance note.

### 4.5 Filter & Quick-Chips Bar
- Search box with instant filter.
- Quick filter chips: `All (20)`, `High Momentum`, `Near Breakout`, `High Volume Surge`, `Oversold Rebound`.

### 4.6 System Information & Integrations
- Dedicated configuration cards for:
  - **Google Sheet Synchronization** (Status: Active Sync, Manage Settings modal trigger).
  - **Daily Email Briefing** (8:00 AM IST scheduled morning briefing, Manage Settings modal trigger).
  - Comprehensive scoring methodology breakdown.

---

## 5. Responsive Behavior
- **Desktop (1024px+)**: 3-column stock cards grid; full multi-column data table; top segmented tabs.
- **Tablet (768px - 1023px)**: 2-column card grid; horizontal scrollable filters.
- **Mobile (< 768px)**: 1-column cards; docked bottom navigation bar; 44px touch targets; horizontal index carousel.
