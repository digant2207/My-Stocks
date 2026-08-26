import os
import json
import smtplib
import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "email_config.json")
PUBLIC_URL_FILE = os.path.join(os.path.dirname(__file__), "public_url.txt")

def load_email_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "enabled": True,
        "sender_email": "digant73@gmail.com",
        "app_password": "",
        "recipient_email": "digant73@gmail.com",
        "smtp_server": "smtp.gmail.com",
        "smtp_port": 587
    }

def save_email_config(cfg):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, indent=2)

def get_public_url():
    if os.path.exists(PUBLIC_URL_FILE):
        try:
            with open(PUBLIC_URL_FILE, 'r', encoding='utf-8') as f:
                url = f.read().strip()
                if url: return url
        except Exception:
            pass
    return "http://localhost:8080"

def generate_email_html(analysis_data):
    top_20_swing = analysis_data.get('top_20_swing', [])
    triggered_alerts = analysis_data.get('triggered_alerts', [])
    upcoming_events = analysis_data.get('upcoming_3d_events', [])
    public_url = get_public_url()

    today_str = datetime.datetime.now().strftime("%A, %d-%b-%Y at %I:%M %p IST (Indian Standard Time)")




    # Render Swing Picks Rows with Chart Pattern & AI Suggestion
    swing_rows = ""
    if top_20_swing:
        for idx, s in enumerate(top_20_swing[:15], 1):
            clean_sym = s.get('clean_symbol', s.get('symbol', ''))
            price = f"₹{s.get('current_price', 0):,.2f}"
            t1 = f"₹{s.get('swing_target_1', 0):,.2f}"
            t2 = f"₹{s.get('swing_target_2', 0):,.2f}"
            sl = f"₹{s.get('swing_stoploss', 0):,.2f}"
            pattern = s.get('primary_pattern', 'Breakout Setup')
            change = s.get('day_change_pct', 0)
            change_color = "#059669" if change >= 0 else "#dc2626"
            change_str = f"+{change:.2f}%" if change >= 0 else f"{change:.2f}%"
            ai_sug = s.get('ai_suggestion', s.get('swing_reason', ''))

            swing_rows += f"""
            <tr style="border-bottom: 1px solid #e2e8f0; font-size:13px;">
                <td style="padding: 10px 8px; color:#0f172a;">
                    <strong>#{idx} {s.get('name')}</strong> <span style="color:#64748b;">({clean_sym})</span><br/>
                    <span style="background:#f3e8ff; color:#6b21a8; padding:2px 6px; border-radius:10px; font-size:11px; font-weight:bold;">{pattern}</span>
                </td>
                <td style="padding: 10px 8px; font-weight:bold;">{price} <br/><span style="color:{change_color}; font-size:11px;">{change_str}</span></td>
                <td style="padding: 10px 8px; color:#059669; font-weight:bold;">{t1}<br/><span style="font-size:11px; color:#475569;">T2: {t2}</span></td>
                <td style="padding: 10px 8px; color:#dc2626; font-weight:bold;">{sl}</td>
                <td style="padding: 10px 8px; color:#334155; font-size:12px;">{ai_sug}</td>
            </tr>
            """
    else:
        swing_rows = '<tr><td colspan="5" style="padding:12px; color:#64748b; text-align:center;">No breakout swing setups identified today.</td></tr>'

    # Render Alert Rows
    alert_rows = ""
    if triggered_alerts:
        for s in triggered_alerts:
            msg = s.get('alert_message', '')
            alert_rows += f"""
            <div style="background:#fef2f2; border-left:4px solid #ef4444; padding:10px 12px; border-radius:6px; margin-bottom:8px; font-size:13px; color:#991b1b;">
                <strong>{s.get('name')} ({s.get('clean_symbol')})</strong>: {msg}
            </div>
            """
    else:
        alert_rows = '<div style="background:#f8fafc; padding:10px; border-radius:6px; font-size:13px; color:#64748b;">No target price or stop level breaches today.</div>'

    # Render Corporate Events
    event_rows = ""
    if upcoming_events:
        for e in upcoming_events[:8]:
            event_rows += f"""
            <tr style="border-bottom: 1px solid #e2e8f0; font-size:13px;">
                <td style="padding:8px; font-weight:bold;">{e.get('name')} ({e.get('clean_symbol')})</td>
                <td style="padding:8px; color:#0284c7; font-weight:bold;">{e.get('type')}</td>
                <td style="padding:8px; color:#334155;">{e.get('title')}</td>
            </tr>
            """
    else:
        event_rows = '<tr><td colspan="3" style="padding:10px; color:#64748b; text-align:center;">No upcoming corporate events in next 3 days.</td></tr>'

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My Watchlist - Daily Stock Watch</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color:#f1f5f9; margin:0; padding:16px;">
        <div style="max-width:680px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.06); border:1px solid #e2e8f0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding:24px; text-align:center; color:#ffffff;">
                <h1 style="margin:0; font-size:22px; font-weight:800; letter-spacing:-0.5px;">📈 My Watchlist</h1>

                <p style="margin:6px 0 0 0; font-size:13px; color:#94a3b8;">Chart Patterns • Volume Accumulation • Daily Stock Watch • {today_str}</p>
                <div style="margin-top:14px;">
                    <a href="{public_url}" target="_blank" style="background:#2563eb; color:#ffffff; padding:10px 20px; border-radius:20px; text-decoration:none; font-size:13px; font-weight:bold; display:inline-block;">📱 Open Dashboard on iPhone</a>
                </div>
            </div>

            <!-- Content Container -->
            <div style="padding:20px;">

                <!-- Section: Alerts -->
                <div style="margin-bottom:24px;">
                    <h2 style="font-size:16px; color:#0f172a; margin:0 0 12px 0; font-weight:700;">🔔 Price Target & Stop Alerts</h2>
                    {alert_rows}
                </div>

                <!-- Section: Top Swing Trading Picks -->
                <div style="margin-bottom:24px;">
                    <h2 style="font-size:16px; color:#0f172a; margin:0 0 12px 0; font-weight:700;">🚀 Top 15 Swing Picks with Chart Patterns & AI Strategy</h2>
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; text-align:left;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; font-size:12px; color:#475569;">
                                    <th style="padding:8px;">Stock & Pattern</th>
                                    <th style="padding:8px;">Price</th>
                                    <th style="padding:8px;">Targets</th>
                                    <th style="padding:8px;">Stop Loss</th>
                                    <th style="padding:8px;">AI Strategy & Suggestion</th>
                                </tr>
                            </thead>
                            <tbody>
                                {swing_rows}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Section: Corporate Events -->
                <div style="margin-bottom:20px;">
                    <h2 style="font-size:16px; color:#0f172a; margin:0 0 12px 0; font-weight:700;">📅 Corporate Events (Next 3 Days)</h2>
                    <table style="width:100%; border-collapse:collapse; text-align:left;">
                        <thead>
                            <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; font-size:12px; color:#475569;">
                                <th style="padding:8px;">Stock</th>
                                <th style="padding:8px;">Event Type</th>
                                <th style="padding:8px;">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {event_rows}
                        </tbody>
                    </table>
                </div>

                <!-- Footer -->
                <div style="border-top:1px solid #e2e8f0; padding-top:16px; text-align:center; font-size:12px; color:#64748b;">
                    <p style="margin:0;">Antigravity Stock Screening Engine • Automated 7:30 AM Report</p>
                </div>

            </div>
        </div>
    </body>
    </html>
    """
    return html

def send_morning_digest(analysis_data):
    cfg = load_email_config()
    if not cfg.get('enabled'):
        return False, "Email notifications are disabled."

    sender = cfg.get('sender_email', '').strip()
    pwd = cfg.get('app_password', '').strip()
    recipient = cfg.get('recipient_email', 'digant73@gmail.com').strip()

    if not sender or not pwd:
        html_content = generate_email_html(analysis_data)
        out_file = os.path.join(os.path.dirname(__file__), "last_email_digest.html")
        with open(out_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        return False, "Sender email or Gmail App Password missing. Saved to last_email_digest.html"

    try:
        html_content = generate_email_html(analysis_data)
        msg = MIMEMultipart("alternative")
        msg['Subject'] = f"📈 Stock Watch Today ({datetime.datetime.now().strftime('%d %b')}) - Chart Patterns & Swing Signals"
        msg['From'] = sender
        msg['To'] = recipient

        msg.attach(MIMEText(html_content, "html"))

        server = smtplib.SMTP(cfg.get('smtp_server', 'smtp.gmail.com'), cfg.get('smtp_port', 587))
        server.starttls()
        server.login(sender, pwd)
        server.sendmail(sender, [recipient], msg.as_string())
        server.quit()

        return True, f"Successfully sent morning email to {recipient}!"
    except Exception as e:
        return False, f"Failed to send email: {e}"

if __name__ == "__main__":
    data_file = os.path.join(os.path.dirname(__file__), "analysis_data.json")
    if os.path.exists(data_file):
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        send_morning_digest(data)
