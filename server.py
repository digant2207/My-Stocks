import os
import sys
import json
import csv
import time
import datetime
import threading
import subprocess
import requests

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

import email_notifier
import google_sheet_manager
import analyzer

PORT = 8080
LOCK = threading.Lock()

PUBLIC_URL_FILE = os.path.join(os.path.dirname(__file__), "public_url.txt")

def get_python_exe():
    venv_py = r"C:\Users\DELL\.gemini\antigravity\scratch\indian-stock-analyzer\.venv\Scripts\python.exe"
    if os.path.exists(venv_py):
        return venv_py
    return sys.executable

def start_public_tunnel():
    """Launches localtunnel in background to provide a secure public URL for iPhone access anywhere."""
    def tunnel_thread():
        print("Launching Public HTTPS Tunnel for iPhone Remote Access...")
        try:
            cmd = "cmd.exe /c npx --yes localtunnel --port 8080"
            proc = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            for line in proc.stdout:
                print(f"[Tunnel]: {line.strip()}")
                if "url is:" in line.lower():
                    parts = line.split("url is:")
                    if len(parts) > 1:
                        url = parts[1].strip()
                        with open(PUBLIC_URL_FILE, 'w', encoding='utf-8') as f:
                            f.write(url)
                        print(f"\n=======================================================")
                        print(f"📱 IPHONE REMOTE ACCESS URL: {url}")
                        print(f"=======================================================\n")
        except Exception as e:
            print(f"Tunnel launch warning: {e}")

    threading.Thread(target=tunnel_thread, daemon=True).start()

def run_analysis_tasks(force_full=False):
    with LOCK:
        now = datetime.datetime.now()
        weekday = now.weekday()
        hour = now.hour
        is_market_hours = (weekday < 5) and (9 <= hour < 16) and not force_full

        print(f"[{now}] Triggering Analysis Update (Fast Market Mode: {is_market_hours})...")
        py_exe = get_python_exe()
        try:
            if is_market_hours:
                script = os.path.join(os.path.dirname(__file__), "fast_market_scanner.py")
            else:
                script = os.path.join(os.path.dirname(__file__), "fast_runner.py")

            subprocess.run([py_exe, script], check=True)
            print(f"[{datetime.datetime.now()}] Analysis completed successfully!")
            return True, "Analysis updated successfully!"
        except Exception as e:
            err_msg = f"Analysis error: {e}"
            print(f"[{datetime.datetime.now()}] {err_msg}")
            return False, err_msg


def start_background_scheduler():
    import scheduler
    threading.Thread(target=scheduler.schedule_loop, daemon=True).start()

class CustomRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query = parse_qs(parsed_url.query)

        if path in ['/api/refresh', '/api/run_analysis']:
            self.handle_refresh()
        elif path == '/api/save_gsheet':
            sheet_url = query.get('url', [''])[0]
            if sheet_url:
                cfg = google_sheet_manager.load_sheet_config()
                cfg['google_sheet_url'] = sheet_url.strip()
                with open(google_sheet_manager.CONFIG_PATH, 'w', encoding='utf-8') as f:
                    json.dump(cfg, f, indent=2)
                ok, msg = google_sheet_manager.sync_from_google_sheet()
                if ok:
                    threading.Thread(target=run_analysis_tasks, daemon=True).start()
                self.send_json({"status": "success" if ok else "warning", "message": msg})
            else:
                self.send_json({"status": "error", "message": "No URL provided"}, 400)
        elif path == '/api/scan_status':
            self.handle_scan_status()

        elif path == '/api/public_url':
            url = email_notifier.get_public_url()
            self.send_json({"public_url": url})
        elif path == '/api/get_email_config':
            cfg = email_notifier.load_email_config()
            cfg['app_password'] = '********' if cfg.get('app_password') else ''
            self.send_json(cfg)
        elif path == '/api/get_gsheet_config':
            cfg = google_sheet_manager.load_sheet_config()
            self.send_json(cfg)
        else:
            super().do_GET()

    def do_POST(self):
        if self.path in ['/api/refresh', '/api/run_analysis']:
            self.handle_refresh()
        elif self.path == '/api/add_stock':
            self.handle_add_stock()
        elif self.path == '/api/set_targets':
            self.handle_set_targets()
        elif self.path == '/api/save_gsheet':
            self.handle_save_gsheet()
        elif self.path == '/api/save_email_config':
            self.handle_save_email_config()
        elif self.path == '/api/test_email':
            self.handle_test_email()
        else:
            self.send_error(404, "Endpoint not found")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def send_json(self, data, status_code=200):
        payload = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


    def handle_scan_status(self):
        status_file = os.path.join(os.path.dirname(__file__), "scan_status.json")
        status_payload = {"is_running": False, "progress_pct": 100, "status_message": "Idle"}
        if os.path.exists(status_file):
            try:
                with open(status_file, 'r', encoding='utf-8') as f:
                    status_payload = json.load(f)
            except Exception:
                pass
        self.send_json(status_payload)

    def handle_refresh(self):
        threading.Thread(target=run_analysis_tasks, daemon=True).start()
        self.send_json({"status": "success", "message": "Re-analysis started in background!"})

    def handle_add_stock(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        try:
            body = json.loads(post_data.decode('utf-8'))
            sym = body.get('symbol', '').strip()
            name = body.get('name', '').strip()
            sector = body.get('sector', 'User Added').strip()

            if not sym:
                self.send_json({"status": "error", "message": "Symbol is required"}, 400)
                return

            clean_sym = analyzer.clean_symbol(sym)
            csv_path = os.path.join(os.path.dirname(__file__), "stocks.csv")

            existing = []
            seen = set()
            if os.path.exists(csv_path):
                with open(csv_path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for r in reader:
                        s_item = r.get('symbol', '')
                        if s_item:
                            existing.append(r)
                            seen.add(s_item.upper())

            if clean_sym in seen:
                self.send_json({"status": "warning", "message": f"Stock {clean_sym} is already in the watchlist!"})
                return

            new_entry = {
                "symbol": clean_sym,
                "name": name or clean_sym.split('.')[0],
                "sector": sector,
                "cap_type": "Equity",
                "tracking_notes": "Added via Dashboard UI"
            }
            existing.append(new_entry)

            with open(csv_path, 'w', encoding='utf-8', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=["symbol", "name", "sector", "cap_type", "tracking_notes"])
                writer.writeheader()
                for e in existing:
                    writer.writerow(e)

            threading.Thread(target=run_analysis_tasks, daemon=True).start()
            self.send_json({"status": "success", "message": f"✅ Added {clean_sym}! Starting background analysis update..."})
        except Exception as e:
            self.send_json({"status": "error", "message": str(e)}, 500)

    def handle_set_targets(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        try:
            body = json.loads(post_data.decode('utf-8'))
            sym = body.get('symbol', '').strip()
            up_t = body.get('up_target')
            down_s = body.get('down_stop')

            if not sym:
                self.send_json({"status": "error", "message": "Symbol is required"}, 400)
                return

            clean_sym = analyzer.clean_symbol(sym)
            targets = analyzer.load_user_targets()

            if clean_sym not in targets:
                targets[clean_sym] = {}

            if up_t is not None:
                targets[clean_sym]['up_target'] = float(up_t) if up_t != "" else 0.0
            if down_s is not None:
                targets[clean_sym]['down_stop'] = float(down_s) if down_s != "" else 0.0

            analyzer.save_user_targets(targets)
            threading.Thread(target=run_analysis_tasks, daemon=True).start()
            self.send_json({"status": "success", "message": f"✅ Updated UP/DOWN target prices for {clean_sym}!"})
        except Exception as e:
            self.send_json({"status": "error", "message": str(e)}, 500)

    def handle_save_gsheet(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        try:
            body = json.loads(post_data.decode('utf-8'))
            cfg = google_sheet_manager.load_sheet_config()
            cfg['google_sheet_url'] = body.get('google_sheet_url', '').strip()
            cfg['sheet_name'] = body.get('sheet_name', 'Antigravity WatchlistIt').strip()

            with open(google_sheet_manager.CONFIG_PATH, 'w', encoding='utf-8') as f:
                json.dump(cfg, f, indent=2)

            ok, msg = google_sheet_manager.sync_from_google_sheet()
            if ok:
                threading.Thread(target=run_analysis_tasks, daemon=True).start()
            self.send_json({"status": "success" if ok else "warning", "message": msg})
        except Exception as e:
            self.send_json({"status": "error", "message": str(e)}, 500)

    def handle_save_email_config(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        try:
            body = json.loads(post_data.decode('utf-8'))
            cfg = email_notifier.load_email_config()
            cfg['enabled'] = bool(body.get('enabled', True))
            cfg['recipient_email'] = body.get('recipient_email', 'digant73@gmail.com').strip()
            cfg['sender_email'] = body.get('sender_email', 'digant73@gmail.com').strip()

            pwd = body.get('app_password', '').strip()
            if pwd and pwd != '********':
                cfg['app_password'] = pwd

            email_notifier.save_email_config(cfg)
            self.send_json({"status": "success", "message": "✅ Saved Email Configuration!"})
        except Exception as e:
            self.send_json({"status": "error", "message": str(e)}, 500)

    def handle_test_email(self):
        try:
            a_json = os.path.join(os.path.dirname(__file__), "analysis_data.json")
            a_data = {}
            if os.path.exists(a_json):
                with open(a_json, 'r', encoding='utf-8') as f: a_data = json.load(f)
            ok, msg = email_notifier.send_morning_digest(a_data)
            self.send_json({"status": "success" if ok else "error", "message": msg})
        except Exception as e:
            self.send_json({"status": "error", "message": str(e)}, 500)

def run_server():
    server_address = ('0.0.0.0', PORT)
    httpd = HTTPServer(server_address, CustomRequestHandler)
    print(f"Antigravity Stock Watchlist Server active on http://localhost:{PORT}", flush=True)

    start_background_scheduler()
    start_public_tunnel()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...", flush=True)
        httpd.server_close()



if __name__ == '__main__':
    run_server()
