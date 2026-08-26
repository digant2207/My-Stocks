import os
import json
import csv
import sys
import time
import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import analyzer
import google_sheet_manager

STATUS_FILE = os.path.join(os.path.dirname(__file__), "scan_status.json")

def update_status(is_running, progress_pct, message):
    payload = {
        "is_running": is_running,
        "progress_pct": progress_pct,
        "status_message": message,
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
    }
    try:
        with open(STATUS_FILE, 'w', encoding='utf-8') as f:
            json.dump(payload, f, indent=2)
    except Exception:
        pass

def run_fast_analysis(csv_path="stocks.csv", output_json="analysis_data.json", output_js="analysis_data.js"):
    start_time = time.time()
    update_status(True, 5, "Syncing Google Sheet Antigravity WatchlistIt...")
    google_sheet_manager.sync_from_google_sheet()

    target_csv = "stocks_active.csv" if os.path.exists("stocks_active.csv") else csv_path
    stocks = []
    if os.path.exists(target_csv):
        with open(target_csv, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                s_val = row.get('symbol') or row.get('Symbol') or ''
                if s_val.strip():
                    stocks.append({
                        "symbol": analyzer.clean_symbol(s_val),
                        "name": row.get('name') or row.get('Stock Name') or s_val,
                        "sector": row.get('sector') or 'General',
                        "cap_type": row.get('cap_type') or 'Equity',
                        "tracking_notes": row.get('tracking_notes') or ''
                    })


    total_count = len(stocks)
    if total_count == 0:
        update_status(False, 100, "No stocks found in stocks.csv")
        return None

    update_status(True, 10, f"Scanning {total_count} equities via multi-threaded pipeline...")

    analyzed = []
    completed_count = 0

    with ThreadPoolExecutor(max_workers=12) as executor:
        future_map = {executor.submit(analyzer.fetch_stock_data, s['symbol'], s): s for s in stocks}
        for future in as_completed(future_map):
            completed_count += 1
            pct = int(10 + (completed_count / total_count) * 85)
            update_status(True, pct, f"Processed {completed_count}/{total_count} stocks...")
            try:
                res = future.result()
                if res:
                    analyzed.append(res)
            except Exception as e:
                print(f"Error processing stock: {e}")

    analyzed.sort(key=lambda x: (x['composite_score'], x['vol_surge_ratio']), reverse=True)

    swing_candidates = [
        s for s in analyzed 
        if "Bullish" in s['pattern_bias'] or s['swing_signal'] in ['BREAKOUT BUY', 'MOMENTUM BUY'] or s['vol_surge_ratio'] > 1.2
    ]
    if len(swing_candidates) < 20:
        top_20_swing = analyzed[:20]
    else:
        top_20_swing = swing_candidates[:20]

    upcoming_3d_events = []
    for s in analyzed:
        for e in s.get('events', []):
            if e.get('is_upcoming_3_days'):
                upcoming_3d_events.append({
                    **e,
                    "symbol": s['symbol'],
                    "clean_symbol": s['clean_symbol'],
                    "name": s['name']
                })

    elapsed = round(time.time() - start_time, 1)

    summary_stats = {
        "last_updated": datetime.datetime.now().strftime("%d-%b-%Y %I:%M:%S %p IST"),

        "total_stocks_scanned": len(analyzed),
        "swing_top_20_count": len(top_20_swing),
        "strong_buys_count": sum(1 for s in analyzed if s['long_term_signal'] in ['STRONG BUY', 'ACCUMULATE']),
        "pattern_breakouts_count": sum(1 for s in analyzed if "Bullish" in s['pattern_bias']),
        "upcoming_3d_events_count": len(upcoming_3d_events),
        "scan_time_seconds": elapsed
    }

    output_payload = {
        "summary": summary_stats,
        "top_20_swing": top_20_swing,
        "all_stocks": analyzed,
        "upcoming_3d_events": upcoming_3d_events
    }

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(output_payload, f, indent=2)

    with open(output_js, 'w', encoding='utf-8') as f:
        f.write("window.stockData = " + json.dumps(output_payload, indent=2) + ";")

    update_status(False, 100, f"Analysis Complete in {elapsed}s!")
    print(f"Fast runner complete! Scanned {len(analyzed)} stocks in {elapsed}s.")

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

    # Auto-push updated analysis data to GitHub Pages
    try:
        print("[GITHUB AUTO-SYNC] Pushing deep analysis data & index.html cache version to GitHub Pages...")
        os.system('git add index.html app.js analysis_data.json analysis_data.js stocks_active.csv stocks.csv')
        os.system('git commit -m "Auto-update deep analysis data and trigger deployment"')
        os.system('git pull --rebase origin main')
        os.system('git push origin main')

        print("[GITHUB AUTO-SYNC] Published deep analysis data to GitHub Pages!")
    except Exception as push_err:
        print(f"[GITHUB AUTO-SYNC] Warning: {push_err}")


    return output_payload



if __name__ == "__main__":
    run_fast_analysis()
