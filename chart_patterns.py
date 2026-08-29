import numpy as np
import pandas as pd

def analyze_volume_dynamics(close_prices, volumes, period=20):
    if len(close_prices) < period or len(volumes) < period:
        return {
            "vol_surge_ratio": 1.0,
            "accumulation_status": "Neutral",
            "is_volume_dryup": False,
            "up_down_vol_ratio": 1.0
        }

    recent_close = close_prices[-period:]
    recent_vol = volumes[-period:]

    vol_avg = float(np.mean(recent_vol)) if np.mean(recent_vol) > 0 else 1.0
    current_vol = float(volumes[-1])
    vol_surge_ratio = round(current_vol / vol_avg, 2)

    # Accumulation vs Distribution: Compare total volume on UP days vs DOWN days
    up_vols = []
    down_vols = []

    for i in range(1, len(recent_close)):
        if recent_close[i] > recent_close[i-1]:
            up_vols.append(recent_vol[i])
        elif recent_close[i] < recent_close[i-1]:
            down_vols.append(recent_vol[i])

    sum_up_vol = float(np.sum(up_vols)) if up_vols else 1.0
    sum_down_vol = float(np.sum(down_vols)) if down_vols else 1.0
    up_down_vol_ratio = round(sum_up_vol / sum_down_vol, 2)

    if up_down_vol_ratio >= 1.4:
        accumulation_status = "Institutional Accumulation 🔥"
    elif up_down_vol_ratio >= 1.1:
        accumulation_status = "Moderate Buying Interest 🟢"
    elif up_down_vol_ratio <= 0.7:
        accumulation_status = "Distribution / Selling Pressure 🔴"
    else:
        accumulation_status = "Neutral Balance ⚖️"

    # Volume Dry-Up (VCP contraction signature: 5-day avg volume < 60% of 20-day avg)
    vol_5d_avg = float(np.mean(recent_vol[-5:])) if len(recent_vol) >= 5 else vol_avg
    is_volume_dryup = vol_5d_avg < (vol_avg * 0.65)

    return {
        "vol_surge_ratio": vol_surge_ratio,
        "accumulation_status": accumulation_status,
        "is_volume_dryup": is_volume_dryup,
        "up_down_vol_ratio": up_down_vol_ratio
    }

def detect_range_breakouts(close_prices, high_prices, low_prices, volumes):
    if len(close_prices) < 50:
        return {
            "is_20d_breakout": False,
            "is_50d_box_breakout": False,
            "is_nr7_expansion": False,
            "is_52w_high_breakout": False,
            "breakout_summary": "No active range breakout"
        }

    cp = float(close_prices[-1])
    highs = high_prices.astype(float)
    lows = low_prices.astype(float)

    # 20-Day Range Breakout
    prev_20d_high = float(np.max(highs[-21:-1])) if len(highs) >= 21 else float(np.max(highs[:-1]))
    is_20d_breakout = cp > prev_20d_high

    # 50-Day Box Breakout (Darvas Box)
    prev_50d_high = float(np.max(highs[-51:-1])) if len(highs) >= 51 else float(np.max(highs[:-1]))
    is_50d_box_breakout = cp > prev_50d_high

    # 52-Week High Breakout
    max_52w_high = float(np.max(highs))
    is_52w_high_breakout = cp >= (max_52w_high * 0.985)

    # NR7 Expansion (Narrowest Range of 7 days followed by today's expansion)
    ranges = highs - lows
    is_nr7_expansion = False
    if len(ranges) >= 8:
        last_7_ranges = ranges[-8:-1]
        today_range = ranges[-1]
        min_range_7d = float(np.min(last_7_ranges))
        # If yesterday was NR7 (smallest range) and today expands > 1.8x of yesterday
        if last_7_ranges[-1] == min_range_7d and today_range > (min_range_7d * 1.8):
            is_nr7_expansion = True

    summaries = []
    if is_52w_high_breakout: summaries.append("52-Week High Breakout 🚀")
    if is_50d_box_breakout: summaries.append("50-Day Box Range Breakout 📦")
    elif is_20d_breakout: summaries.append("20-Day High Breakout ⚡")
    if is_nr7_expansion: summaries.append("NR7 Volatility Expansion 💥")

    breakout_summary = " • ".join(summaries) if summaries else "Consolidation Range"

    return {
        "is_20d_breakout": is_20d_breakout,
        "is_50d_box_breakout": is_50d_box_breakout,
        "is_nr7_expansion": is_nr7_expansion,
        "is_52w_high_breakout": is_52w_high_breakout,
        "breakout_summary": breakout_summary
    }

def detect_chart_patterns(close_prices, high_prices, low_prices, volumes):
    if len(close_prices) < 60:
        return {
            "primary_pattern": "Base Consolidation",
            "pattern_bias": "Neutral",
            "pattern_confidence": 50,
            "breakout_level": float(close_prices[-1]),
            "pattern_description": "Insufficient history for pattern recognition.",
            "volume_analysis": analyze_volume_dynamics(close_prices, volumes),
            "range_breakout_analysis": detect_range_breakouts(close_prices, high_prices, low_prices, volumes)
        }

    cp = float(close_prices[-1])
    highs = high_prices.astype(float)
    lows = low_prices.astype(float)
    vols = volumes.astype(float)

    vol_dyn = analyze_volume_dynamics(close_prices, vols)
    range_brk = detect_range_breakouts(close_prices, highs, lows, vols)

    pattern_name = "Range Consolidation"
    bias = "Neutral"
    confidence = 60
    breakout_lvl = round(float(np.max(highs[-20:])), 2)
    desc = "Stock trading in a sideways consolidation range."

    # 1. Cup and Handle Pattern
    # Requirements: Prior uptrend, U-shaped rounded bottom over 30-90 days, tight handle (5-15 days), volume surge
    if len(close_prices) >= 90:
        p_90 = close_prices[-90:]
        h_90 = highs[-90:]
        l_90 = lows[-90:]

        left_rim = float(np.max(h_90[:30]))
        cup_bottom = float(np.min(l_90[25:65]))
        right_rim = float(np.max(h_90[60:80]))
        handle_low = float(np.min(l_90[80:]))

        if left_rim > 0 and right_rim > 0:
            # Check U-shape structure depth and handle tightness
            depth_pct = ((left_rim - cup_bottom) / left_rim) * 100.0
            handle_depth_pct = ((right_rim - handle_low) / right_rim) * 100.0

            if 10 <= depth_pct <= 35 and 2 <= handle_depth_pct <= 12 and (abs(left_rim - right_rim) / left_rim) <= 0.08:
                if cp >= right_rim * 0.98 and vol_dyn['vol_surge_ratio'] >= 1.2:
                    pattern_name = "Cup and Handle 🍵"
                    bias = "Bullish Breakout 🚀"
                    confidence = 90
                    breakout_lvl = round(right_rim, 2)
                    desc = f"Classic Cup & Handle pattern. Rounded base ({depth_pct:.1f}% depth) with tight handle consolidation and {vol_dyn['vol_surge_ratio']}x volume breakout."
                    return format_pattern_result(pattern_name, bias, confidence, breakout_lvl, desc, vol_dyn, range_brk)

    # 2. Volatility Contraction Pattern (VCP) - Mark Minervini
    # Requirements: Series of contracting price waves (T1 > T2 > T3) with volume drying up prior to expansion
    if len(close_prices) >= 60:
        m1 = float(np.mean(close_prices[-60:-40])) if np.mean(close_prices[-60:-40]) > 0 else 1.0
        m2 = float(np.mean(close_prices[-40:-20])) if np.mean(close_prices[-40:-20]) > 0 else 1.0
        m3 = float(np.mean(close_prices[-20:])) if np.mean(close_prices[-20:]) > 0 else 1.0

        range_1 = (np.max(highs[-60:-40]) - np.min(lows[-60:-40])) / m1 * 100.0
        range_2 = (np.max(highs[-40:-20]) - np.min(lows[-40:-20])) / m2 * 100.0
        range_3 = (np.max(highs[-20:]) - np.min(lows[-20:])) / m3 * 100.0

        if range_1 > range_2 > range_3 and range_3 <= 8.0:
            if vol_dyn['is_volume_dryup'] or vol_dyn['vol_surge_ratio'] >= 1.3:
                pattern_name = "VCP Volatility Contraction 📉⚡"
                bias = "Bullish Breakout 🚀"
                confidence = 88
                breakout_lvl = round(float(np.max(highs[-20:])), 2)
                desc = f"Minervini VCP contraction setup: Volatility narrowed from {range_1:.1f}% -> {range_2:.1f}% -> {range_3:.1f}% with volume compression."
                return format_pattern_result(pattern_name, bias, confidence, breakout_lvl, desc, vol_dyn, range_brk)

    # 3. Ascending Triangle
    # Requirements: Flat upper horizontal resistance line + higher lows ascending trendline
    if len(close_prices) >= 40:
        highs_40 = highs[-40:]
        lows_40 = lows[-40:]
        top_res = float(np.max(highs_40))
        low_1 = float(np.min(lows_40[:15]))
        low_2 = float(np.min(lows_40[15:30]))
        low_3 = float(np.min(lows_40[30:]))

        if top_res > 0 and low_3 > low_2 > low_1 and ((top_res - cp) / top_res) <= 0.04:
            pattern_name = "Ascending Triangle 📐"
            bias = "Bullish Accumulation 🟢"
            confidence = 85
            breakout_lvl = round(top_res, 2)
            desc = f"Ascending Triangle pattern with higher lows support line coiling under flat resistance at ₹{top_res:.2f}."
            return format_pattern_result(pattern_name, bias, confidence, breakout_lvl, desc, vol_dyn, range_brk)

    # 4. Bull Flag / Pennant
    # Requirements: Sharp pole rally (+8% in 5-10 days) followed by tight downward sloping channel (3-10 days)
    if len(close_prices) >= 25 and cp > 0:
        pole_gain = safe_pct_change(close_prices[-10], close_prices[-25])
        flag_range = (np.max(highs[-10:]) - np.min(lows[-10:])) / cp * 100.0

        if pole_gain >= 8.0 and flag_range <= 6.5:
            pattern_name = "Bull Flag / Pennant 📈"
            bias = "Bullish Continuation 🚀"
            confidence = 85
            breakout_lvl = round(float(np.max(highs[-10:])), 2)
            desc = f"Bull Flag continuation pattern. Strong +{pole_gain:.1f}% pole surge followed by tight flag consolidation."
            return format_pattern_result(pattern_name, bias, confidence, breakout_lvl, desc, vol_dyn, range_brk)

    # 5. Double Bottom (W-Pattern)
    if len(close_prices) >= 45:
        l_45 = lows[-45:]
        h_45 = highs[-45:]
        b1 = float(np.min(l_45[:20]))
        b2 = float(np.min(l_45[25:]))
        neckline = float(np.max(h_45[15:30]))

        if b1 > 0 and (abs(b1 - b2) / b1) <= 0.035 and cp >= neckline * 0.97:
            pattern_name = "Double Bottom (W-Pattern) 🔄"
            bias = "Bullish Reversal 🟢"
            confidence = 82
            breakout_lvl = round(neckline, 2)
            desc = f"Double Bottom W-reversal pattern formed around ₹{b1:.2f} support zone with neckline at ₹{neckline:.2f}."
            return format_pattern_result(pattern_name, bias, confidence, breakout_lvl, desc, vol_dyn, range_brk)

    # 6. Range Breakouts Fallback
    if range_brk['is_52w_high_breakout']:
        pattern_name = "52-Week High Breakout ⚡"
        bias = "Strong Bullish 🚀"
        confidence = 88
        breakout_lvl = round(float(np.max(highs)), 2)
        desc = f"Stock trading near or breaking out of 52-Week High level (₹{breakout_lvl:.2f})."
    elif range_brk['is_50d_box_breakout']:
        pattern_name = "50-Day Box Breakout 📦"
        bias = "Bullish Breakout 🟢"
        confidence = 80
        breakout_lvl = round(float(np.max(highs[-50:])), 2)
        desc = f"50-Day Box consolidation breakout above ₹{breakout_lvl:.2f}."
    elif range_brk['is_20d_breakout']:
        pattern_name = "20-Day Range Breakout ⚡"
        bias = "Bullish Momentum 🟢"
        confidence = 75
        breakout_lvl = round(float(np.max(highs[-20:])), 2)
        desc = f"20-Day High range breakout above ₹{breakout_lvl:.2f}."
    elif range_brk['is_nr7_expansion']:
        pattern_name = "NR7 Range Expansion 💥"
        bias = "Volatility Surge ⚡"
        confidence = 75
        breakout_lvl = round(cp, 2)
        desc = "NR7 (7-Day Narrowest Range) explosive expansion breakout."

    return format_pattern_result(pattern_name, bias, confidence, breakout_lvl, desc, vol_dyn, range_brk)

def format_pattern_result(pattern_name, bias, confidence, breakout_lvl, desc, vol_dyn, range_brk):
    return {
        "primary_pattern": pattern_name,
        "pattern_bias": bias,
        "pattern_confidence": confidence,
        "breakout_level": breakout_lvl,
        "pattern_description": desc,
        "volume_analysis": vol_dyn,
        "range_breakout_analysis": range_brk
    }

def safe_pct_change(current, previous):
    if previous is None or current is None or previous == 0:
        return 0.0
    return ((current - previous) / abs(previous)) * 100.0
