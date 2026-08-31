import os
import sys
import json
import csv
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

def clean_symbol(sym):
    sym = sym.strip().upper()
    if not sym: return ""
    # Filter out malformed strings (e.g. descriptions pasted in ticker column)
    if any(ch in sym for ch in ['[', ']', '(', ')', '{', '}', ';', ':']) or len(sym) > 18 or len(sym) < 2:
        return ""
    sym = sym.replace(" ", "").replace("&", "%26")
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

if __name__ == "__main__":
    sync_from_google_sheet()
