import time
import datetime
import threading
import os
import sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import fast_runner
import fast_market_scanner
import email_notifier

def run_9am_full_scan_job():
    print("[SCHEDULER] 9:00 AM Full Deep Analysis & Google Sheet Sync Triggered...")
    try:
        fast_runner.run_fast_analysis()
        print("[SCHEDULER] 9:00 AM Full Deep Scan Completed Successfully.")
    except Exception as e:
        print(f"[SCHEDULER] 9:00 AM Full Scan Error: {e}")

    try:
        print("[SCHEDULER] Dispatching 9:00 AM Daily Email Briefing...")
        email_notifier.send_daily_email()
        print("[SCHEDULER] 9:00 AM Email Dispatched Successfully.")
    except Exception as e:
        print(f"[SCHEDULER] 9:00 AM Email Error: {e}")

def run_market_hours_fast_ticker_job():
    """
    Lightweight price, volume surge (RVOL), and breakout update (< 10 seconds).
    Does NOT refetch slow fundamentals or historical data during trading hours.
    """
    try:
        fast_market_scanner.run_market_hours_ticker_scan()
    except Exception as e:
        print(f"[SCHEDULER] Fast Market Ticker Scan Error: {e}")

def schedule_loop():
    print("=======================================================================")
    print("🚀 OPTIMIZED DAILY MARKET SCHEDULER ACTIVE:")
    print(" 1. 9:00 AM IST: Full Deep Scan (Google Sheet Sync + Fundamentals + Patterns + Email)")
    print(" 2. 9:05 AM - 4:00 PM IST (Mon-Fri): Ultra-Fast Price & Breakout Scanner (< 10s)")
    print("=======================================================================")

    last_9am_date = None
    last_market_scan_min = -1

    while True:
        now = datetime.datetime.now()
        today_str = now.strftime("%Y-%m-%d")
        weekday = now.weekday() # 0 = Monday, ..., 4 = Friday
        hour = now.hour
        minute = now.minute

        # 1. Daily 9:00 AM IST Full Deep Scan & Email Dispatch
        if hour == 9 and minute == 0 and last_9am_date != today_str:
            last_9am_date = today_str
            run_9am_full_scan_job()

        # 2. Market Hours Ultra-Fast Price & Breakout Ticker Scan (9:05 AM - 4:00 PM IST, Mon-Fri, Every 5 minutes)
        is_market_hours = (weekday < 5) and (9 <= hour < 16)
        if is_market_hours:
            # Skip at 9:00 AM sharp since full scan runs at 9:00 AM
            if not (hour == 9 and minute == 0):
                if minute % 5 == 0 and minute != last_market_scan_min:
                    last_market_scan_min = minute
                    run_market_hours_fast_ticker_job()

        time.sleep(20)

def start_scheduler_thread():
    t = threading.Thread(target=schedule_loop, daemon=True)
    t.start()
    return t

if __name__ == "__main__":
    schedule_loop()
