import os
import sys
import json
import time
import datetime
import yfinance as yf
import pandas as pd
import numpy as np

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

ANALYSIS_JSON = os.path.join(os.path.dirname(__file__), "analysis_data.json")
ANALYSIS_JS = os.path.join(os.path.dirname(__file__), "analysis_data.js")

def run_market_hours_ticker_scan():
    """
    Lightweight, fast market-hours scanner (runs 9:00 AM - 4:00 PM).
    Updates current price, day change %, RVOL volume, news, and live breakout triggers in < 5 seconds.
    """
    if not os.path.exists(ANALYSIS_JSON):
        print("[MARKET SCANNER] analysis_data.json not found. Run full scan first.")
        return None

    try:
        with open(ANALYSIS_JSON, 'r', encoding='utf-8') as f:
            payload = json.load(f)
    except Exception as e:
        print(f"[MARKET SCANNER] Error reading analysis_data.json: {e}")
        return None

    all_stocks = payload.get('all_stocks', [])
    if not all_stocks:
        print("[MARKET SCANNER] No stocks to update.")
        return None

    symbols = [s['symbol'] for s in all_stocks]
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Fast Market Ticker Scan for {len(symbols)} stocks...")

    start_t = time.time()
    try:
        # Fast batch download of last 5 days 1m/5m interval data
        tickers_str = " ".join(symbols)
        data = yf.download(tickers_str, period="2d", interval="5m", progress=False, group_by="ticker")
    except Exception as e:
        print(f"[MARKET SCANNER] Batch download error: {e}")
        data = None

    updated_count = 0
    breakout_alerts_count = 0

    for s in all_stocks:
        sym = s['symbol']
        try:
            if data is not None and not data.empty:
                stock_df = None
                if len(symbols) == 1:
                    stock_df = data
                elif sym in data:
                    stock_df = data[sym]

                if stock_df is not None and not stock_df.empty:
                    close_series = stock_df['Close'].dropna()
                    vol_series = stock_df['Volume'].dropna()
                    if not close_series.empty:
                        cp = round(float(close_series.iloc[-1]), 2)
                        prev_cp = s['prev_close']
                        chg_pct = round(((cp - prev_cp) / prev_cp) * 100.0, 2) if prev_cp else 0.0

                        s['current_price'] = cp
                        s['day_change_pct'] = chg_pct

                        # Live RVOL update
                        vol_1m = s.get('vol_1m_avg', 1)
                        today_vol = float(vol_series.sum()) if not vol_series.empty else s.get('volume', 0)
                        s['volume'] = int(today_vol)
                        s['vol_surge_ratio'] = round(today_vol / vol_1m, 1) if vol_1m > 0 else 1.0

                        # Re-evaluate Live Breakout Triggers
                        brk_lvl = s.get('breakout_level', cp)
                        buy_trig = s.get('buy_trigger_price', brk_lvl)
                        dist_pct = round(abs((brk_lvl - cp) / cp) * 100.0, 1)
                        s['breakout_proximity_pct'] = dist_pct

                        if cp >= buy_trig:
                            s['swing_signal'] = "BREAKOUT CONFIRMED 🔥"
                            s['buy_status'] = f"🔥 BREAKOUT TRIGGERED - BUY ABOVE ₹{buy_trig:,.2f}"
                            s['is_near_breakout_zone'] = True
                            breakout_alerts_count += 1
                        elif dist_pct <= 3.5:
                            s['swing_signal'] = "NEAR BREAKOUT ZONE ⚡"
                            s['buy_status'] = f"⚡ BUY ABOVE ₹{buy_trig:,.2f} ({dist_pct}% away)"
                            s['is_near_breakout_zone'] = True
                        else:
                            s['swing_signal'] = "RANGE CONSOLIDATION ⚖️"
                            s['is_near_breakout_zone'] = False

                        # Recalculate breakout readiness score
                        s['breakout_readiness_score'] = round(
                            (s['vol_surge_ratio'] * 25.0) +
                            (max(0, 100 - (dist_pct * 20.0))) +
                            (s['composite_score'] * 0.4),
                            1
                        )
                        updated_count += 1
        except Exception:
            pass

    # Sort & pick Top 20 Swing candidates by live market readiness
    swing_candidates = [
        s for s in all_stocks 
        if s.get('is_near_breakout_zone') or "Bullish" in s.get('pattern_bias', '') or s.get('vol_surge_ratio', 0) >= 1.2
    ]
    swing_candidates.sort(key=lambda x: (x.get('is_near_breakout_zone', False), x.get('breakout_readiness_score', 0), x.get('vol_surge_ratio', 0)), reverse=True)

    if len(swing_candidates) >= 20:
        top_20_swing = swing_candidates[:20]
    else:
        all_sorted = sorted(all_stocks, key=lambda x: x.get('breakout_readiness_score', 0), reverse=True)
        top_20_swing = all_sorted[:20]

    all_stocks.sort(key=lambda x: (x.get('composite_score', 0), x.get('vol_surge_ratio', 0)), reverse=True)

    elapsed = round(time.time() - start_t, 2)
    now_str = datetime.datetime.now().strftime("%d-%b-%Y at %I:%M %p")



    summary_stats = payload.get('summary', {})
    summary_stats['last_updated'] = now_str + " (Market Live)"
    summary_stats['live_market_updates_count'] = updated_count
    summary_stats['live_breakout_alerts_count'] = breakout_alerts_count

    payload['summary'] = summary_stats
    payload['top_20_swing'] = top_20_swing
    payload['all_stocks'] = all_stocks

    try:
        with open(ANALYSIS_JSON, 'w', encoding='utf-8') as f:
            json.dump(payload, f, indent=2)
        with open(ANALYSIS_JS, 'w', encoding='utf-8') as f:
            f.write("window.stockData = " + json.dumps(payload, indent=2) + ";")
        print(f"[MARKET SCANNER] Live scan completed in {elapsed}s! Updated {updated_count} prices, {breakout_alerts_count} active breakouts.")
        
        # Update index.html asset version for instant browser & iOS PWA cache busting
        try:
            index_path = os.path.join(os.path.dirname(__file__), "index.html")
            if os.path.exists(index_path):
                ver_str = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
                with open(index_path, 'r', encoding='utf-8') as f:
                    html_c = f.read()
                import re
                html_c = re.sub(r'styles\.css(?:\?v=\d+)?', f'styles.css?v={ver_str}', html_c)
                html_c = re.sub(r'analysis_data\.js(?:\?v=\d+)?', f'analysis_data.js?v={ver_str}', html_c)
                html_c = re.sub(r'app\.js(?:\?v=\d+)?', f'app.js?v={ver_str}', html_c)
                with open(index_path, 'w', encoding='utf-8') as f:
                    f.write(html_c)
        except Exception:
            pass

        # Auto-push updated data to GitHub Pages
        try:
            print("[GITHUB AUTO-SYNC] Pushing live market data & index.html cache version to GitHub Pages...")
            os.system('git add index.html app.js analysis_data.json analysis_data.js stocks_active.csv stocks.csv')
            os.system('git commit -m "Auto-update live market analysis data and trigger deployment"')
            os.system('git pull --rebase origin main')
            os.system('git push origin main')

            print("[GITHUB AUTO-SYNC] Published live data to GitHub Pages!")
        except Exception as push_err:
            print(f"[GITHUB AUTO-SYNC] Warning: {push_err}")


    except Exception as e:
        print(f"[MARKET SCANNER] Save error: {e}")

    return payload



if __name__ == "__main__":
    run_market_hours_ticker_scan()
