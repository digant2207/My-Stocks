import os
import json
import csv
import math
import datetime
from datetime import timedelta
import pandas as pd
import numpy as np
import yfinance as yf
import requests

import google_sheet_manager
import chart_patterns

HIGH_DEBT_SECTORS = [
    "Private Bank", "Public Bank", "NBFC", "Financial Services", 
    "Power & Green Energy", "Power Transmission", "Infra & Engineering", 
    "Ports & Logistics", "Conglomerate", "Mining & Energy", "Power Finance", "Rail Finance", "Banking"
]

def clean_symbol(sym):
    sym = sym.strip().upper()
    if not sym: return ""
    sym = sym.replace(" ", "").replace("&", "%26")
    if not sym.endswith(".NS") and not sym.endswith(".BO"):
        if sym.isdigit():
            return sym + ".BO"
        return sym + ".NS"
    return sym


def clean_val(val, default=0.0):
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return default
    try:
        return float(val)
    except Exception:
        return default

def safe_pct_change(current, previous):
    if previous is None or current is None or previous == 0 or math.isnan(previous) or math.isnan(current):
        return 0.0
    return ((current - previous) / abs(previous)) * 100.0

def calculate_rsi(prices, period=14):
    if len(prices) < period + 1:
        return 50.0
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])
    
    if avg_loss == 0:
        return 100.0
    
    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        
    if avg_loss == 0:
        return 100.0
    
    rs = avg_gain / avg_loss
    return float(100.0 - (100.0 / (1.0 + rs)))

def calculate_macd(prices):
    if len(prices) < 26:
        return 0.0, 0.0, 0.0
    s = pd.Series(prices)
    exp1 = s.ewm(span=12, adjust=False).mean()
    exp2 = s.ewm(span=26, adjust=False).mean()
    macd = exp1 - exp2
    signal = macd.ewm(span=9, adjust=False).mean()
    hist = macd - signal
    return float(macd.iloc[-1]), float(signal.iloc[-1]), float(hist.iloc[-1])

def fetch_events_and_news(ticker, symbol, current_price, rev_growth_yoy, earnings_growth_yoy, dividend_yield):
    events_list = []
    today = datetime.date.today()
    yesterday = today - datetime.timedelta(days=1)
    tomorrow = today + datetime.timedelta(days=1)

    try:
        ex_date_timestamp = ticker.info.get('exDividendDate')
        if ex_date_timestamp:
            ex_date = datetime.datetime.fromtimestamp(ex_date_timestamp).date()
            if abs((ex_date - today).days) <= 7:
                date_tag = "Today" if ex_date == today else ("Tomorrow" if ex_date == tomorrow else ex_date.strftime("%d %b %Y"))
                events_list.append({
                    "date": ex_date.strftime("%Y-%m-%d"),
                    "date_tag": date_tag,
                    "is_upcoming_3_days": 0 <= (ex_date - today).days <= 3,
                    "type": "Dividend Ex-Date",
                    "title": f"Ex-Dividend Event ({dividend_yield:.2f}% Yield)",
                    "summary": f"Ex-dividend date for payout.",
                    "impact": "Bullish Income" if dividend_yield >= 2.0 else "Neutral",
                    "impact_reason": f"High dividend yield ({dividend_yield:.2f}%) attracts income investors."
                })
    except Exception:
        pass

    if rev_growth_yoy > 15 or earnings_growth_yoy > 20:
        events_list.append({
            "date": today.strftime("%Y-%m-%d"),
            "date_tag": "Today",
            "is_upcoming_3_days": True,
            "type": "Quarterly Earnings Growth",
            "title": f"Strong Earnings Growth (YoY Profit +{earnings_growth_yoy:.1f}%)",
            "summary": f"Company declared strong YoY revenue growth of {rev_growth_yoy:.1f}% and Net Profit growth of {earnings_growth_yoy:.1f}%.",
            "impact": "Bullish Re-rating 🚀",
            "impact_reason": "Beating growth expectations provides positive fundamental momentum."
        })
    elif earnings_growth_yoy < -10:
        events_list.append({
            "date": yesterday.strftime("%Y-%m-%d"),
            "date_tag": "Yesterday",
            "is_upcoming_3_days": False,
            "type": "Earnings Caution",
            "title": f"Earnings De-growth (YoY Profit Drop {earnings_growth_yoy:.1f}%)",
            "summary": f"Recent financial results show profit declining by {abs(earnings_growth_yoy):.1f}%.",
            "impact": "Bearish Caution ⚠️",
            "impact_reason": "Margin pressure may trigger short-term profit booking."
        })

    try:
        news_items = ticker.news or []
        for n in news_items[:2]:
            title = n.get('title', '')
            pub_time = n.get('providerPublishTime')
            if pub_time:
                n_date = datetime.datetime.fromtimestamp(pub_time).date()
                n_tag = "Today" if n_date == today else ("Yesterday" if n_date == yesterday else ("Tomorrow" if n_date == tomorrow else n_date.strftime("%d %b %Y")))
                events_list.append({
                    "date": n_date.strftime("%Y-%m-%d"),
                    "date_tag": n_tag,
                    "is_upcoming_3_days": 0 <= (n_date - today).days <= 3,
                    "type": "Corporate News / Recommendation",
                    "title": title,
                    "summary": f"Recent announcement or fund house research for {symbol.replace('.NS','').replace('.BO','')}.",
                    "impact": "Monitored ⚖️",
                    "impact_reason": "Tracked for market sentiment."
                })
    except Exception:
        pass

    if not events_list:
        events_list.append({
            "date": today.strftime("%Y-%m-%d"),
            "date_tag": "Today",
            "is_upcoming_3_days": True,
            "type": "Trading Monitoring",
            "title": "Normal Volume & Price Watch",
            "summary": f"Stock trading smoothly at ₹{current_price:.2f}.",
            "impact": "Neutral ⚖️",
            "impact_reason": "Standard price discovery."
        })

    return events_list

def calculate_price_action_levels(cp, close_prices, high_prices, low_prices, sma_20, sma_50, sma_200, high_52w, range_brk, pattern_res):
    atr = np.std(close_prices[-14:]) * 1.5 if len(close_prices) >= 14 else cp * 0.02

    prev_20d_high = float(np.max(high_prices[-21:-1])) if len(high_prices) >= 21 else float(np.max(high_prices[:-1]))
    prev_20d_low = float(np.min(low_prices[-21:-1])) if len(low_prices) >= 21 else float(np.min(low_prices[:-1]))
    prev_10d_low = float(np.min(low_prices[-11:-1])) if len(low_prices) >= 11 else float(np.min(low_prices[:-1]))

    box_range_height = prev_20d_high - prev_20d_low
    breakout_lvl = pattern_res['breakout_level']

    # BUY TRIGGER LEVEL (Entry triggered on breakout confirmation)
    if cp >= breakout_lvl:
        buy_trigger = round(cp, 2)
        buy_status = "🔥 BREAKOUT TRIGGERED - ENTER NOW"
    else:
        buy_trigger = round(max(breakout_lvl * 1.001, cp * 1.002), 2)
        dist_pct = round(((buy_trigger - cp) / cp) * 100.0, 1)
        buy_status = f"⚡ BUY ABOVE ₹{buy_trigger:,.2f} ({dist_pct}% away)"

    # SELL / STOP LOSS TRIGGER LEVEL
    if cp > sma_20:
        sl_candidate_1 = sma_20 * 0.985
        sl_candidate_2 = prev_10d_low * 0.99
        stop_loss = round(max(sl_candidate_1, sl_candidate_2), 2)
    else:
        stop_loss = round(prev_20d_low * 0.985, 2)

    min_sl = round(cp * 0.92, 2)
    max_sl = round(cp * 0.985, 2)
    stop_loss = max(min_sl, min(stop_loss, max_sl))
    sell_trigger = stop_loss

    # TARGET 1 & TARGET 2
    if range_brk['is_52w_high_breakout']:
        t1 = round(high_52w + (atr * 1.5), 2)
        t2 = round(high_52w + (atr * 3.2), 2)
    elif range_brk['is_20d_breakout'] or range_brk['is_50d_box_breakout']:
        t1 = round(cp + max(box_range_height, atr * 2.0), 2)
        if high_52w > cp and high_52w > t1:
            t2 = round(high_52w, 2)
        else:
            t2 = round(cp + (box_range_height * 1.8), 2)
    elif cp > sma_20 and cp < prev_20d_high:
        t1 = round(prev_20d_high, 2)
        t2 = round(max(high_52w, cp + (atr * 3.5)), 2)
    else:
        t1 = round(cp + (atr * 2.2), 2)
        t2 = round(cp + (atr * 4.0), 2)

    # Breakout Proximity %
    dist_to_brk_pct = round(abs((breakout_lvl - cp) / cp) * 100.0, 1)
    is_near_breakout_zone = dist_to_brk_pct <= 4.0 or cp >= breakout_lvl

    return {
        "buy_trigger_price": buy_trigger,
        "sell_trigger_price": sell_trigger,
        "buy_status": buy_status,
        "swing_target_1": t1,
        "swing_target_2": t2,
        "swing_stoploss": stop_loss,
        "breakout_proximity_pct": dist_to_brk_pct,
        "is_near_breakout_zone": is_near_breakout_zone
    }

def generate_ai_suggestion(s_data):
    cp = s_data['current_price']
    pattern = s_data['primary_pattern']
    bias = s_data['pattern_bias']
    buy_trig = s_data['buy_trigger_price']
    sell_trig = s_data['sell_trigger_price']
    t1 = s_data['swing_target_1']
    t2 = s_data['swing_target_2']
    vol_ratio = s_data['vol_surge_ratio']
    acc_status = s_data['accumulation_status']
    brk_summary = s_data['breakout_summary']
    dist_brk = s_data['breakout_proximity_pct']

    if cp >= s_data['breakout_level']:
        action = f"🔥 BREAKOUT ACTIVE - BUY NOW ABOVE ₹{buy_trig:,.2f}"
        strategy_reason = f"Breakout triggered on **{pattern}** with **{vol_ratio}x** volume surge and {acc_status}."
    elif dist_brk <= 3.0:
        action = f"⚡ WATCHLIST BREAKOUT ZONE - BUY TRIGGER: ₹{buy_trig:,.2f}"
        strategy_reason = f"Coiling **{dist_brk}% away** from breakout level (₹{s_data['breakout_level']:,.2f}) in **{pattern}** setup."
    else:
        action = f"ACCUMULATE ON DIPS - BUY TRIGGER: ₹{buy_trig:,.2f}"
        strategy_reason = f"Consolidating in **{pattern}** base ({brk_summary}). Volume RVOL: {vol_ratio}x."

    suggestion_text = f"**{action}** • {strategy_reason} • **Sell/Stop Loss Trigger:** ₹{sell_trig:,.2f} • **Target 1:** ₹{t1:,.2f} • **Target 2:** ₹{t2:,.2f}"
    return suggestion_text

def generate_swot_analysis(s_data):
    strengths = []
    weaknesses = []

    # 1. Last Financial Results
    rev_g = s_data.get('rev_growth_yoy', 0)
    earn_g = s_data.get('earnings_growth_yoy', 0)
    if earn_g >= 15:
        strengths.append(f"📊 Last Result: Outstanding YoY Net Profit Growth (+{earn_g:.1f}%) & Revenue (+{rev_g:.1f}%)")
    elif earn_g > 0:
        strengths.append(f"📊 Last Result: Positive YoY Net Profit Growth (+{earn_g:.1f}%) & Revenue (+{rev_g:.1f}%)")
    elif earn_g < 0:
        weaknesses.append(f"📊 Last Result: Profit De-growth (Net Profit Declined {earn_g:.1f}% YoY)")

    # 2. Upcoming Corporate Events & Recent News
    events = s_data.get('events', [])
    for e in events:
        e_type = e.get('type', '')
        e_title = e.get('title', '')
        e_date = e.get('date_tag', 'Upcoming')

        if "Dividend" in e_type or "Earnings" in e_type or "AGM" in e_type or e.get('is_upcoming_3_days'):
            strengths.append(f"📅 Upcoming Event ({e_date}): {e_type} - {e_title}")
        elif "News" in e_type or "Recommendation" in e_type:
            if "Bullish" in e.get('impact', ''):
                strengths.append(f"📰 Corporate News / Recommendation: {e_title}")
            else:
                strengths.append(f"📰 Recent News / Announcement: {e_title}")

    # 3. Technical & Pattern Strengths
    if s_data['primary_pattern'] != "Range Consolidation":
        strengths.append(f"📈 Chart Pattern: {s_data['primary_pattern']} ({s_data['pattern_bias']})")
    if s_data['breakout_summary'] != "Consolidation Range":
        strengths.append(f"🚀 Range Breakout: {s_data['breakout_summary']}")
    if s_data['is_near_breakout_zone']:
        strengths.append(f"⚡ Breakout Zone: Only {s_data['breakout_proximity_pct']}% away from breakout trigger (₹{s_data['buy_trigger_price']:,.2f})")
    if s_data['vol_surge_ratio'] >= 1.5:
        strengths.append(f"🔥 Heavy Volume Surge: {s_data['vol_surge_ratio']}x of 1M Avg Volume")
    if "Accumulation" in s_data['accumulation_status']:
        strengths.append(f"💧 Volume Dynamics: {s_data['accumulation_status']}")

    # 4. Fundamental Health & Valuation
    if s_data['roe'] >= 15: strengths.append(f"💰 High ROE: {s_data['roe']:.1f}%")
    if s_data['debt_to_equity'] == 0: strengths.append("🛡️ Zero Debt Balance Sheet")
    if s_data['current_price'] > s_data['sma_200']: strengths.append("📈 Above 200-day EMA (Long-term Bull Trend)")
    if 55 <= s_data['rsi_14'] <= 68: strengths.append(f"🎯 RSI Bullish Momentum Zone: {s_data['rsi_14']:.1f}")

    # 5. Bearish Red Flags
    if "Distribution" in s_data['accumulation_status']:
        weaknesses.append("⚠️ Volume Dynamics: Institutional Distribution / Selling Pressure")
    if s_data['pe_ratio'] > 60: weaknesses.append(f"⚠️ High Valuation P/E: {s_data['pe_ratio']:.1f}x")
    if s_data['pledged_pct'] > 5: weaknesses.append(f"⚠️ Promoter Pledge: {s_data['pledged_pct']:.1f}% shares pledged")
    if s_data['debt_score_penalty'] > 10: weaknesses.append(f"⚠️ High Debt Ratio: {s_data['debt_to_equity']:.2f}")

    if not strengths: strengths.append("Base consolidation structure")
    if not weaknesses: weaknesses.append("No major red flags detected")

    return { "strengths": strengths, "weaknesses": weaknesses }


def fetch_stock_data(symbol, metadata):
    clean_sym = clean_symbol(symbol)
    print(f"Analyzing {clean_sym}...")
    ticker = yf.Ticker(clean_sym)

    try:
        hist = ticker.history(period="1y", interval="1d")
    except Exception as e:
        print(f"History error for {clean_sym}: {e}")
        hist = pd.DataFrame()

    if hist.empty or len(hist) < 20:
        print(f"Insufficient data for {clean_sym}")
        return None

    close_prices = hist['Close'].values
    high_prices = hist['High'].values
    low_prices = hist['Low'].values
    volumes = hist['Volume'].values

    current_price = round(clean_val(close_prices[-1]), 2)
    prev_close = round(clean_val(close_prices[-2]), 2) if len(close_prices) > 1 else current_price
    day_change_pct = round(safe_pct_change(current_price, prev_close), 2)

    high_52w = round(float(np.max(high_prices)), 2)
    low_52w = round(float(np.min(low_prices)), 2)
    pct_from_52w_high = round(((current_price - high_52w) / high_52w) * 100.0, 2)
    pct_from_52w_low = round(((current_price - low_52w) / low_52w) * 100.0, 2)

    sma_20 = round(float(np.mean(close_prices[-20:])), 2)
    sma_50 = round(float(np.mean(close_prices[-50:])), 2) if len(close_prices) >= 50 else sma_20
    sma_200 = round(float(np.mean(close_prices[-200:])), 2) if len(close_prices) >= 200 else sma_50

    rsi_14 = round(calculate_rsi(close_prices), 1)
    macd_val, macd_signal, macd_hist = calculate_macd(close_prices)
    macd_val = round(macd_val, 2)
    macd_signal = round(macd_signal, 2)
    macd_hist = round(macd_hist, 2)

    current_vol = float(volumes[-1])
    vol_1m_avg = float(np.mean(volumes[-20:])) if len(volumes) >= 20 else float(np.mean(volumes))

    pattern_res = chart_patterns.detect_chart_patterns(close_prices, high_prices, low_prices, volumes)
    vol_dyn = pattern_res['volume_analysis']
    range_brk = pattern_res['range_breakout_analysis']
    vol_surge_ratio = vol_dyn['vol_surge_ratio']

    pa_levels = calculate_price_action_levels(
        current_price, close_prices, high_prices, low_prices,
        sma_20, sma_50, sma_200, high_52w, range_brk, pattern_res
    )

    info = {}
    try:
        info = ticker.info or {}
    except Exception:
        pass

    pe_ratio = round(clean_val(info.get('trailingPE')), 2)
    forward_pe = round(clean_val(info.get('forwardPE')), 2)
    pb_ratio = round(clean_val(info.get('priceToBook')), 2)
    roe = round(clean_val(info.get('returnOnEquity')) * 100.0, 1)
    debt_to_equity = round(clean_val(info.get('debtToEquity')) / 100.0 if info.get('debtToEquity') else 0.0, 2)
    rev_growth_yoy = round(clean_val(info.get('revenueGrowth')) * 100.0, 1)
    earnings_growth_yoy = round(clean_val(info.get('earningsGrowth')) * 100.0, 1)
    target_mean_price = round(clean_val(info.get('targetMeanPrice'), current_price), 2)
    dividend_yield = round(clean_val(info.get('dividendYield')) * 100.0, 2)

    promoter_holding = round(clean_val(info.get('heldPercentInsiders'), 0.50) * 100.0, 1)
    institutional_holding = round(clean_val(info.get('heldPercentInstitutions'), 0.30) * 100.0, 1)
    pledged_pct = round(clean_val(info.get('pledgedPercent'), 0.0), 1)

    sector = metadata.get('sector', 'General')
    is_high_debt_sector = any(hds.lower() in sector.lower() for hds in HIGH_DEBT_SECTORS)

    if is_high_debt_sector:
        debt_status = "Acceptable (Financial/Infra Sector)" if debt_to_equity < 4.0 else "High Debt"
        debt_score_penalty = 0 if debt_to_equity < 3.5 else 10
    else:
        if debt_to_equity == 0.0:
            debt_status = "Zero Debt"
            debt_score_penalty = 0
        elif debt_to_equity <= 0.5:
            debt_status = "Low Debt (Healthy)"
            debt_score_penalty = 0
        elif debt_to_equity <= 1.0:
            debt_status = "Moderate Debt"
            debt_score_penalty = 5
        else:
            debt_status = "High Debt Warning"
            debt_score_penalty = 15

    # Scoring Engine
    f_score = 0
    if rev_growth_yoy >= 15: f_score += 10
    elif rev_growth_yoy >= 5: f_score += 6
    elif rev_growth_yoy > 0: f_score += 3

    if earnings_growth_yoy >= 15: f_score += 10
    elif earnings_growth_yoy >= 5: f_score += 6
    elif earnings_growth_yoy > 0: f_score += 3

    if roe >= 18: f_score += 10
    elif roe >= 12: f_score += 7
    elif roe >= 8: f_score += 4

    f_score = max(0, f_score + 5 - debt_score_penalty)

    t_score = 0
    if current_price > sma_20: t_score += 8
    if current_price > sma_50: t_score += 8
    if current_price > sma_200: t_score += 7

    if 50 <= rsi_14 <= 68: t_score += 6
    elif 40 <= rsi_14 < 50: t_score += 3
    elif rsi_14 > 70: t_score += 2

    if macd_hist > 0: t_score += 6

    p_score = 0
    if "Bullish" in pattern_res['pattern_bias']: p_score += 10
    if range_brk['is_20d_breakout'] or range_brk['is_50d_box_breakout']: p_score += 6
    if range_brk['is_52w_high_breakout']: p_score += 8
    if vol_surge_ratio >= 1.5: p_score += 6

    analyst_upside_pct = round(safe_pct_change(target_mean_price, current_price), 1)
    v_score = 0
    if analyst_upside_pct > 20: v_score += 8
    elif analyst_upside_pct > 10: v_score += 5

    composite_score = round(min(100.0, f_score + t_score + p_score + v_score), 1)

    # Breakout Proximity Score (Higher score if near breakout zone or breaking out now)
    brk_proximity_pct = pa_levels['breakout_proximity_pct']
    is_near_breakout = pa_levels['is_near_breakout_zone']

    breakout_readiness_score = round(
        (vol_surge_ratio * 25.0) +
        (max(0, 100 - (brk_proximity_pct * 20.0))) +
        (composite_score * 0.4),
        1
    )

    if composite_score >= 75 and debt_score_penalty <= 5:
        long_term_signal = "STRONG BUY"
    elif composite_score >= 60:
        long_term_signal = "ACCUMULATE"
    elif composite_score >= 45:
        long_term_signal = "HOLD"
    else:
        long_term_signal = "REDUCE / AVOID"

    if current_price >= pattern_res['breakout_level']:
        swing_signal = "BREAKOUT CONFIRMED 🔥"
    elif is_near_breakout:
        swing_signal = "NEAR BREAKOUT ZONE ⚡"
    elif current_price > sma_20 and macd_hist > 0:
        swing_signal = "MOMENTUM BUY 🟢"
    else:
        swing_signal = "NEUTRAL / WATCH ⚖️"

    events = fetch_events_and_news(ticker, clean_sym, current_price, rev_growth_yoy, earnings_growth_yoy, dividend_yield)

    s_dict = {
        "symbol": clean_sym,
        "clean_symbol": clean_sym.replace('.NS', '').replace('.BO', ''),
        "name": metadata.get('name', clean_sym.split('.')[0]),
        "sector": metadata.get('sector', 'General'),
        "cap_type": metadata.get('cap_type', 'Equity'),
        "tracking_notes": metadata.get('tracking_notes', ''),
        "current_price": current_price,
        "prev_close": prev_close,
        "day_change_pct": day_change_pct,
        "volume": int(current_vol),
        "vol_1m_avg": int(vol_1m_avg),
        "vol_surge_ratio": vol_surge_ratio,
        "52w_high": high_52w,
        "52w_low": low_52w,
        "sma_20": sma_20,
        "sma_50": sma_50,
        "sma_200": sma_200,
        "rsi_14": rsi_14,
        "macd_val": macd_val,
        "macd_signal": macd_signal,
        "macd_hist": macd_hist,
        "pe_ratio": pe_ratio,
        "roe": roe,
        "debt_to_equity": debt_to_equity,
        "debt_status": debt_status,
        "debt_score_penalty": debt_score_penalty,
        "rev_growth_yoy": rev_growth_yoy,
        "earnings_growth_yoy": earnings_growth_yoy,
        "dividend_yield": dividend_yield,
        "promoter_holding": promoter_holding,
        "institutional_holding": institutional_holding,
        "pledged_pct": pledged_pct,

        # Chart Pattern & Volume / Range Analysis Fields
        "primary_pattern": pattern_res['primary_pattern'],
        "pattern_bias": pattern_res['pattern_bias'],
        "pattern_confidence": pattern_res['pattern_confidence'],
        "breakout_level": pattern_res['breakout_level'],
        "pattern_description": pattern_res['pattern_description'],
        "accumulation_status": vol_dyn['accumulation_status'],
        "is_volume_dryup": vol_dyn['is_volume_dryup'],
        "breakout_summary": range_brk['breakout_summary'],
        "is_20d_high_breakout": range_brk['is_20d_breakout'],
        "is_50d_box_breakout": range_brk['is_50d_box_breakout'],
        "is_nr7_expansion": range_brk['is_nr7_expansion'],
        "is_52w_high_breakout": range_brk['is_52w_high_breakout'],

        # BUY & SELL TRIGGER POINTS
        "buy_trigger_price": pa_levels['buy_trigger_price'],
        "sell_trigger_price": pa_levels['sell_trigger_price'],
        "buy_status": pa_levels['buy_status'],
        "swing_target_1": pa_levels['swing_target_1'],
        "swing_target_2": pa_levels['swing_target_2'],
        "swing_stoploss": pa_levels['swing_stoploss'],
        "breakout_proximity_pct": brk_proximity_pct,
        "is_near_breakout_zone": is_near_breakout,
        "breakout_readiness_score": breakout_readiness_score,

        "composite_score": composite_score,
        "long_term_signal": long_term_signal,
        "swing_signal": swing_signal,
        "swing_reason": pattern_res['pattern_description'],
        "events": events
    }

    s_dict["ai_suggestion"] = generate_ai_suggestion(s_dict)
    swot = generate_swot_analysis(s_dict)
    s_dict["strengths"] = swot["strengths"]
    s_dict["weaknesses"] = swot["weaknesses"]

    return s_dict

def run_analysis(csv_path="stocks.csv", output_json="analysis_data.json", output_js="analysis_data.js"):
    print("Starting Antigravity Watchlist Analysis Engine with Breakout Zone & Trigger Level Selection...")
    google_sheet_manager.sync_from_google_sheet()

    stocks = []
    if os.path.exists(csv_path):
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                s_val = row.get('symbol') or row.get('Symbol') or ''
                if s_val.strip():
                    stocks.append({
                        "symbol": clean_symbol(s_val),
                        "name": row.get('name') or row.get('Stock Name') or s_val,
                        "sector": row.get('sector') or 'General',
                        "cap_type": row.get('cap_type') or 'Equity',
                        "tracking_notes": row.get('tracking_notes') or ''
                    })

    analyzed = []
    for s_meta in stocks:
        data = fetch_stock_data(s_meta['symbol'], s_meta)
        if data:
            analyzed.append(data)

    # SELECT 20 BEST SWING TRADING STOCKS BASED ON BREAKOUT PROXIMITY & VOLUME READINESS
    # Priority: 1. Stocks currently near breakout zone / breaking out. 2. Ranked by breakout_readiness_score.
    swing_candidates = [
        s for s in analyzed 
        if s['is_near_breakout_zone'] or "Bullish" in s['pattern_bias'] or s['vol_surge_ratio'] >= 1.2
    ]
    swing_candidates.sort(key=lambda x: (x['is_near_breakout_zone'], x['breakout_readiness_score'], x['vol_surge_ratio']), reverse=True)

    if len(swing_candidates) >= 20:
        top_20_swing = swing_candidates[:20]
    else:
        analyzed_sorted = sorted(analyzed, key=lambda x: x['breakout_readiness_score'], reverse=True)
        top_20_swing = analyzed_sorted[:20]

    analyzed.sort(key=lambda x: (x['composite_score'], x['vol_surge_ratio']), reverse=True)

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

    summary_stats = {
        "last_updated": datetime.datetime.now().strftime("%d-%b-%Y at %I:%M %p"),


        "total_stocks_scanned": len(analyzed),
        "swing_top_20_count": len(top_20_swing),
        "strong_buys_count": sum(1 for s in analyzed if s['long_term_signal'] in ['STRONG BUY', 'ACCUMULATE']),
        "near_breakout_zone_count": sum(1 for s in analyzed if s['is_near_breakout_zone']),
        "upcoming_3d_events_count": len(upcoming_3d_events)
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

    print(f"Analysis complete for {len(analyzed)} stocks! Selected Top 20 Breakout Zone Swing Picks.")
    return output_payload

if __name__ == "__main__":
    run_analysis()
