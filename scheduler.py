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

def run_deep_scan_job(label):
    print(f"[SCHEDULER] {label} Deep Analysis Scan Triggered...")
    try:
        fast_runner.run_fast_analysis()
        print(f"[SCHEDULER] {label} Deep Scan Completed Successfully.")
    except Exception as e:
        print(f"[SCHEDULER] {label} Deep Scan Error: {e}")

def run_8am_email_job():
    print("[SCHEDULER] 8:00 AM Morning Email Job Triggered...")
    try:
        email_notifier.send_daily_email()
        print("[SCHEDULER] 8:00 AM Email Dispatched Successfully.")
    except Exception as e:
        print(f"[SCHEDULER] 8:00 AM Email Error: {e}")

def run_market_hours_ticker_job():
    try:
        fast_market_scanner.run_market_hours_ticker_scan()
    except Exception as e:
        print(f"[SCHEDULER] Market Ticker Scan Error: {e}")

def schedule_loop():
    print("=======================================================================")
    print("🚀 DUAL-TIER MARKET SCHEDULER ACTIVE:")
    print(" 1. Deep Scan (Google Sheet Sync + Full SWOT + Patterns): 8:00 AM & 6:00 PM IST")
    print(" 2. Daily Email Digest: 8:00 AM IST")
    print(" 3. Fast Market-Hours Breakout Scanner: 9:00 AM - 4:00 PM IST (Mon-Fri)")
    print("=======================================================================")

    last_8am_date = None
    last_6pm_date = None
    last_8am_email_date = None
    last_market_scan_min = -1

    while True:
        now = datetime.datetime.now()
        today_str = now.strftime("%Y-%m-%d")
        weekday = now.weekday() # 0 = Monday, ..., 4 = Friday
        hour = now.hour
        minute = now.minute

        # 1. 8:00 AM Deep Scan & Email Dispatch
        if hour == 8 and minute == 0 and last_8am_date != today_str:
            last_8am_date = today_str
            run_deep_scan_job("8:00 AM")
            if last_8am_email_date != today_str:
                last_8am_email_date = today_str
                run_8am_email_job()

        # 2. 6:00 PM Deep Scan (After Market Close Sync & Review)
        if hour == 18 and minute == 0 and last_6pm_date != today_str:
            last_6pm_date = today_str
            run_deep_scan_job("6:00 PM")

        # 3. Market Hours Fast Ticker Scan (9:00 AM - 4:00 PM IST, Mon-Fri, Every 5 minutes)
        is_market_hours = (weekday < 5) and (9 <= hour < 16)
        if is_market_hours:
            if minute % 5 == 0 and minute != last_market_scan_min:
                last_market_scan_min = minute
                run_market_hours_ticker_job()

        time.sleep(20)

def start_scheduler_thread():
    t = threading.Thread(target=schedule_loop, daemon=True)
    t.start()
    return t

if __name__ == "__main__":
    schedule_loop()
