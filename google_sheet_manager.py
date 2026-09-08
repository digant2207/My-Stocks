import os
import sys
import json
import csv
import time
import requests

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "google_sheet_config.json")
STOCKS_CSV_PATH = os.path.join(os.path.dirname(__file__), "stocks.csv")
STOCKS_ACTIVE_CSV_PATH = os.path.join(os.path.dirname(__file__), "stocks_active.csv")

def load_sheet_config():
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "sheet_name": "Spark Stock List",
        "google_sheet_url": "https://docs.google.com/spreadsheets/d/1_rWhyap8gO-u8ehP1vDCiad-RwnFjGBCn2R5qiis4_A/edit?gid=0#gid=0",
        "google_apps_script_url": "",
        "auto_sync": True
    }

KNOWN_ALIASES = {
    "500325.BO": "RELIANCE.NS",
    "544783.BO": "E2E.NS",
    "GSPL.NS": "532540.BO"  # GSPL BSE ticker fallback
}

INVALID_OR_DELISTED = {
    "MANPASAND.NS", "JCTLTD.NS", "544467.BO"
}

def clean_symbol(sym, exchange=None):
    sym = sym.strip().upper()
    if not sym: return ""

    # Strip exchange prefixes like BSE:, NSE:, BOM:
    if sym.startswith("BSE:") or sym.startswith("BOM:"):
        exchange = "BSE"
        sym = sym.split(":", 1)[1].strip()
    elif sym.startswith("NSE:"):
        exchange = "NSE"
        sym = sym.split(":", 1)[1].strip()

    if any(ch in sym for ch in ['[', ']', '(', ')', '{', '}', ';', ':']) or len(sym) > 18 or len(sym) < 2:
        return ""
    sym = sym.replace(" ", "").replace("&", "%26")

    # Apply exchange preference if supplied
    if exchange:
        exch = exchange.upper()
        if exch in ["BSE", "BO"]:
            if sym.endswith(".NS"):
                sym = sym[:-3]
            if not sym.endswith(".BO"):
                sym = sym + ".BO"
        elif exch in ["NSE", "NS"]:
            if sym.endswith(".BO"):
                sym = sym[:-3]
            if not sym.endswith(".NS"):
                sym = sym + ".NS"

    if not sym.endswith(".NS") and not sym.endswith(".BO"):
        if sym.isdigit():
            sym = sym + ".BO"
        else:
            sym = sym + ".NS"

    # Map alias if available
    sym = KNOWN_ALIASES.get(sym, sym)
    if sym in INVALID_OR_DELISTED:
        return ""
    return sym




def sync_from_google_sheet():
    cfg = load_sheet_config()
    sheet_url = cfg.get("google_sheet_url", "").strip()
    if not sheet_url:
        print("No Google Sheet URL specified. Using local stocks.csv.")
        return False, "No URL specified"
        
    try:
        print(f"Syncing stock list from Google Sheet: {sheet_url}...")
        if "/edit" in sheet_url:
            csv_url = sheet_url.split("/edit")[0] + "/export?format=csv"
        elif "/export" not in sheet_url:
            csv_url = sheet_url.rstrip("/") + "/export?format=csv"
        else:
            csv_url = sheet_url

        resp = requests.get(csv_url, timeout=10)
        resp.encoding = 'utf-8'
        if resp.status_code == 200:
            lines = resp.text.splitlines()
            reader = csv.reader(lines)
            rows = [r for r in reader if r]

            if not rows:
                return False, "Empty Google Sheet"

            # Dynamic Header Column Detection
            header = [c.lower().strip() for c in rows[0]]
            sym_idx = 0
            name_idx = 1
            sector_idx = -1
            notes_idx = -1

            for i, col in enumerate(header):
                if "symbol" in col or "ticker" in col:
                    sym_idx = i
                elif "stock" in col or "company" in col or "name" in col:
                    name_idx = i
                elif "sector" in col or "industry" in col:
                    sector_idx = i
                elif "note" in col or "tracking" in col:
                    notes_idx = i

            clean_stocks = []
            seen = set()
            for idx, r in enumerate(rows):
                if idx == 0 or not r: continue
                if len(r) <= sym_idx: continue
                sym = clean_symbol(r[sym_idx])
                if not sym or sym.startswith("SYMBOL") or "TICKER" in sym: continue

                name = r[name_idx].strip() if (name_idx >= 0 and len(r) > name_idx and r[name_idx].strip()) else sym.split('.')[0]
                sector = r[sector_idx].strip() if (sector_idx >= 0 and len(r) > sector_idx and r[sector_idx].strip()) else "Spark Watchlist"
                notes = r[notes_idx].strip() if (notes_idx >= 0 and len(r) > notes_idx) else ""

                if sym not in seen:
                    seen.add(sym)
                    clean_stocks.append({
                        "symbol": sym,
                        "name": name,
                        "sector": sector,
                        "cap_type": "Equity",
                        "tracking_notes": notes or "Google Sheet Spark Stock List"
                    })

            if clean_stocks:
                for target_path in [STOCKS_ACTIVE_CSV_PATH, STOCKS_CSV_PATH]:
                    try:
                        with open(target_path, 'w', encoding='utf-8', newline='') as f:
                            writer = csv.DictWriter(f, fieldnames=["symbol", "name", "sector", "cap_type", "tracking_notes"])
                            writer.writeheader()
                            for s in clean_stocks:
                                writer.writerow(s)
                    except Exception:
                        pass

                msg = f"Successfully synced {len(clean_stocks)} stocks from Google Sheet!"
                print(msg)
                return True, msg
    except Exception as e:
        err = f"Google Sheet sync warning: {e}"
        print(err)
        return False, err

    return False, "Failed to read Google Sheet CSV"


def add_stock_to_google_sheet(sym, name="", sector="User Added", exchange=None):
    clean_sym = clean_symbol(sym, exchange)
    if not clean_sym:
        return False, "Invalid stock symbol format. Please provide a valid NSE or BSE symbol.", ""

    cfg = load_sheet_config()
    apps_script_url = cfg.get("google_apps_script_url", "").strip()
    stock_name = name.strip() if name.strip() else clean_sym.split('.')[0]

    sheet_synced = False
    sheet_msg = ""

    # 1. If Google Apps Script Webhook is configured, send to Google Sheet directly
    if apps_script_url:
        try:
            payload = {
                "symbol": clean_sym,
                "name": stock_name,
                "sector": sector
            }
            resp = requests.post(apps_script_url, json=payload, timeout=12, allow_redirects=True)
            if resp.status_code == 200:
                try:
                    res_data = resp.json()
                    if res_data.get("status") in ["success", "warning"]:
                        sheet_synced = True
                        sheet_msg = res_data.get("message", "Appended to Google Sheet")
                    else:
                        sheet_msg = f"Google Sheet Apps Script: {res_data.get('message')}"
                except Exception:
                    sheet_synced = True
                    sheet_msg = "Sent to Google Sheet Webhook"
            else:
                sheet_msg = f"Google Apps Script returned status {resp.status_code}"
        except Exception as e:
            sheet_msg = f"Google Sheet Webhook error: {e}"

    # 2. If Webhook succeeded, wait briefly and trigger sync to refresh local CSVs
    if sheet_synced:
        time.sleep(1.0)
        ok_sync, _ = sync_from_google_sheet()
        if ok_sync:
            return True, f"✅ Successfully added {clean_sym} directly to Google Sheet 'Spark Stock List' and synced!", clean_sym

    # Fallback / Local Addition: Ensure it is in local stocks.csv & stocks_active.csv
    for csv_file in [STOCKS_CSV_PATH, STOCKS_ACTIVE_CSV_PATH]:
        existing = []
        seen = set()
        if os.path.exists(csv_file):
            try:
                with open(csv_file, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for r in reader:
                        s = r.get('symbol', '')
                        if s:
                            existing.append(r)
                            seen.add(s.upper())
            except Exception:
                pass

        if clean_sym.upper() not in seen:
            existing.append({
                "symbol": clean_sym,
                "name": stock_name,
                "sector": sector,
                "cap_type": "Equity",
                "tracking_notes": "Added via Dashboard UI"
            })
            try:
                with open(csv_file, 'w', encoding='utf-8', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=["symbol", "name", "sector", "cap_type", "tracking_notes"])
                    writer.writeheader()
                    for r in existing:
                        writer.writerow(r)
            except Exception:
                pass

    if apps_script_url:
        if sheet_synced:
            return True, f"✅ Added {clean_sym} to Google Sheet & local watchlist!", clean_sym
        else:
            return True, f"⚠️ Added {clean_sym} to local watchlist, but Google Sheet webhook said: {sheet_msg}", clean_sym
    else:
        return True, f"✅ Added {clean_sym} to watchlist! (Configure Apps Script Webhook in Google Sheet Settings to automatically write to Google Drive)", clean_sym


if __name__ == "__main__":
    sync_from_google_sheet()

