document.addEventListener('DOMContentLoaded', () => {

  function formatPrice(val, decimals = 2) {
    if (val === null || val === undefined || isNaN(val)) return '0.00';
    return Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  let currentData = window.stockData || null;

  // UI Elements
  const lastUpdatedBadge = document.getElementById('lastUpdatedBadge');
  const totalScannedPill = document.getElementById('totalScannedPill');
  const swingPicksPill = document.getElementById('swingPicksPill');
  const btnRefresh = document.getElementById('btnRefresh');
  const refreshIcon = document.getElementById('refreshIcon');

  const swingCardsGrid = document.getElementById('swingCardsGrid');
  const watchlistTableBody = document.getElementById('watchlistTableBody');
  const searchInput = document.getElementById('searchInput');

  // RSI Analysis Tab Elements
  const rsiTableBody = document.getElementById('rsiTableBody');
  const rsiSearchInput = document.getElementById('rsiSearchInput');
  const rsiFilterChips = document.querySelectorAll('[data-rsi-filter]');
  let activeRsiFilter = 'all';
  let rsiSearchTerm = '';

  rsiFilterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      rsiFilterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeRsiFilter = chip.getAttribute('data-rsi-filter') || 'all';
      if (currentData && currentData.all_stocks) {
        applyRsiFiltersAndRender(currentData.all_stocks);
      }
    });
  });

  rsiSearchInput?.addEventListener('input', (e) => {
    rsiSearchTerm = e.target.value.toLowerCase().trim();
    if (currentData && currentData.all_stocks) {
      applyRsiFiltersAndRender(currentData.all_stocks);
    }
  });

  // Strength & Weakness Tab Elements
  const swotTabStockSelect = document.getElementById('swotTabStockSelect');
  const swotTabContentDisplay = document.getElementById('swotTabContentDisplay');
  const swotPatternAiContainer = document.getElementById('swotPatternAiContainer');
  const swotTabStrengths = document.getElementById('swotTabStrengths');
  const swotTabWeaknesses = document.getElementById('swotTabWeaknesses');
  const swotTabEvents = document.getElementById('swotTabEvents');
  const swotTabNews = document.getElementById('swotTabNews');

  // Modals
  const gsheetModal = document.getElementById('gsheetModal');
  const emailModal = document.getElementById('emailModal');

  // Dynamic Real-Time Market Status (NSE/BSE Indian Standard Time: 9:15 AM - 3:30 PM, Mon-Fri)
  function updateMarketStatusBadge() {
    const statusPill = document.getElementById('sidebarMarketStatusPill');
    const statusText = document.getElementById('sidebarMarketStatusText');
    const pulse = document.getElementById('sidebarMarketPulse');

    // Indian Standard Time (IST) = UTC + 5:30
    const now = new Date();
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utcMs + (5.5 * 3600000));

    const day = ist.getDay(); // 0 = Sunday, 6 = Saturday
    const hours = ist.getHours();
    const minutes = ist.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // NSE/BSE Trading Hours: Monday - Friday, 9:15 AM (555 mins) to 3:30 PM (930 mins)
    const isWeekday = (day >= 1 && day <= 5);
    const isMarketHours = (totalMinutes >= 555 && totalMinutes < 930);

    if (isWeekday && isMarketHours) {
      if (statusPill) {
        statusPill.classList.remove('closed');
        statusPill.title = 'NSE / BSE Live Session Active (Closes 3:30 PM IST)';
      }
      if (statusText) statusText.textContent = 'Market Open';
      if (pulse) {
        pulse.style.background = 'var(--success)';
        pulse.style.animation = 'pulse 2s infinite';
      }
    } else {
      if (statusPill) {
        statusPill.classList.add('closed');
        statusPill.title = 'NSE / BSE Market Closed. Trading hours: 9:15 AM - 3:30 PM IST (Mon-Fri)';
      }
      if (statusText) statusText.textContent = 'Market Closed';
      if (pulse) {
        pulse.style.background = '#94a3b8';
        pulse.style.animation = 'none';
      }
    }
  }

  updateMarketStatusBadge();
  setInterval(updateMarketStatusBadge, 30000);

  // Tab Switching (Synchronized between Desktop Sidebar, Desktop Top Tabs & Mobile Bottom Nav)
  const tabBtns = document.querySelectorAll('.tab-btn');
  const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-tab]');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(targetId) {
    tabBtns.forEach(b => {
      if (b.getAttribute('data-tab') === targetId) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    mobileNavBtns.forEach(mb => {
      if (mb.getAttribute('data-tab') === targetId) {
        mb.classList.add('active');
      } else {
        mb.classList.remove('active');
      }
    });

    sidebarLinks.forEach(sb => {
      if (sb.getAttribute('data-tab') === targetId) {
        sb.classList.add('active');
      } else {
        sb.classList.remove('active');
      }
    });

    tabContents.forEach(c => c.style.display = 'none');
    const targetEl = document.getElementById(targetId);
    if (targetEl) targetEl.style.display = 'block';
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      switchTab(targetId);
    });
  });

  mobileNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      switchTab(targetId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  sidebarLinks.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      switchTab(targetId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Desktop Sidebar Quick Find & Add Stock
  const sidebarSearchInput = document.getElementById('sidebarSearchInput');
  if (sidebarSearchInput) {
    sidebarSearchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      switchTab('tab-watchlist');
      if (searchInput) {
        searchInput.value = term;
        searchInput.dispatchEvent(new Event('input'));
      }
    });
  }

  const btnSidebarAddStock = document.getElementById('btnSidebarAddStock');
  if (btnSidebarAddStock) {
    btnSidebarAddStock.addEventListener('click', () => {
      openAddStockModal();
    });
  }

  // Filter Chips and Quick Search State
  let activeFilterChip = 'all';
  let quickFilterTerm = '';
  const filterChips = document.querySelectorAll('.filter-chip');
  const quickFilterInput = document.getElementById('quickFilterInput');

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilterChip = chip.getAttribute('data-filter') || 'all';
      if (currentData && currentData.top_20_swing) {
        applyFiltersAndRender(currentData.top_20_swing);
      }
    });
  });

  quickFilterInput?.addEventListener('input', (e) => {
    quickFilterTerm = e.target.value.toLowerCase().trim();
    if (currentData && currentData.top_20_swing) {
      applyFiltersAndRender(currentData.top_20_swing);
    }
  });

  function applyFiltersAndRender(stocks) {
    let filtered = [...stocks];
    if (quickFilterTerm) {
      filtered = filtered.filter(s =>
        (s.symbol && s.symbol.toLowerCase().includes(quickFilterTerm)) ||
        (s.name && s.name.toLowerCase().includes(quickFilterTerm)) ||
        (s.sector && s.sector.toLowerCase().includes(quickFilterTerm)) ||
        (s.primary_pattern && s.primary_pattern.toLowerCase().includes(quickFilterTerm))
      );
    }

    if (activeFilterChip === 'momentum') {
      filtered = filtered.filter(s => (s.day_change_pct || 0) >= 0.5 || (s.composite_score || 0) >= 70 || (s.rsi_14 || 50) >= 55);
    } else if (activeFilterChip === '52w') {
      filtered = filtered.filter(s => (s.breakout_proximity_pct !== null && s.breakout_proximity_pct <= 5.0) || (s.current_price >= (s.breakout_level || s.current_price)) || (s.primary_pattern || '').toLowerCase().includes('52w') || (s.primary_pattern || '').toLowerCase().includes('breakout'));
    } else if (activeFilterChip === 'oversold') {
      filtered = filtered.filter(s => (s.rsi_14 || 50) <= 52 || (s.day_change_pct || 0) <= 0.8 || (s.primary_pattern || '').toLowerCase().includes('oversold') || (s.primary_pattern || '').toLowerCase().includes('support'));
    }

    renderSwingCards(filtered);
  }

  // Modal Triggers
  document.getElementById('btnGoogleSheetModal')?.addEventListener('click', () => {
    fetchGsheetConfig();
    gsheetModal.classList.add('active');
  });
  document.getElementById('btnCloseGsheetModal')?.addEventListener('click', () => gsheetModal.classList.remove('active'));

  document.getElementById('btnEmailModal')?.addEventListener('click', () => {
    fetchEmailConfig();
    emailModal.classList.add('active');
  });
  document.getElementById('btnCloseEmailModal')?.addEventListener('click', () => emailModal.classList.remove('active'));

  // Reset iPhone / Browser Cache Button
  document.getElementById('btnClearCache')?.addEventListener('click', () => {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload(true);
  });


  // Load Initial Data: Render window.stockData immediately if available
  if (window.stockData) {
    currentData = window.stockData;
    renderDashboard(window.stockData);
  }
  
  // Background fetch for fresh analysis_data.json
  fetchData();

  function fetchData() {
    return fetch('analysis_data.json?t=' + Date.now())
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(data => {
        if (data && data.summary) {
          currentData = data;
          renderDashboard(data);
        }
      })
      .catch(err => {
        console.warn('Failed to load analysis_data.json:', err);
      });
  }



  // Auto-refresh when tab becomes visible on iPhone/Desktop
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchData();
    }
  });




  function renderDashboard(data) {
    if (!data) return;

    const summary = data.summary || {};
    const top20Swing = data.top_20_swing || [];
    const allStocks = data.all_stocks || [];

    const scannedCount = summary.total_stocks_scanned || summary.total_stocks || allStocks.length || 0;
    if (lastUpdatedBadge) {
      lastUpdatedBadge.innerHTML = `<span class="pulse-indicator" style="width:7px; height:7px; border-radius:50%; background:var(--success); display:inline-block;"></span> <span>Updated: ${summary.last_updated || 'Just now'}</span>`;
    }
    if (totalScannedPill) {
      totalScannedPill.textContent = `${scannedCount} Stocks`;
    }
    if (swingPicksPill) {
      swingPicksPill.textContent = `${top20Swing.length || 20} Picks`;
    }

    // Dynamic Live Benchmark Indices (NIFTY 50 & SENSEX)
    const indices = summary.indices || {};
    if (indices.nifty) {
      const niftyValEl = document.getElementById('bentoNiftyVal');
      const niftyDeltaEl = document.getElementById('bentoNiftyDelta');
      const niftySubtextEl = document.getElementById('bentoNiftySubtext');
      if (niftyValEl) niftyValEl.textContent = indices.nifty.price;
      if (niftyDeltaEl) {
        niftyDeltaEl.textContent = indices.nifty.change_pct;
        niftyDeltaEl.className = 'bento-delta ' + (indices.nifty.is_positive ? 'positive' : 'negative');
      }
      if (niftySubtextEl) {
        niftySubtextEl.textContent = (indices.nifty.is_positive ? '📈 +' : '📉 ') + indices.nifty.change_pts + ' pts';
      }
    }
    if (indices.sensex) {
      const sensexValEl = document.getElementById('bentoSensexVal');
      const sensexDeltaEl = document.getElementById('bentoSensexDelta');
      const sensexSubtextEl = document.getElementById('bentoSensexSubtext');
      if (sensexValEl) sensexValEl.textContent = indices.sensex.price;
      if (sensexDeltaEl) {
        sensexDeltaEl.textContent = indices.sensex.change_pct;
        sensexDeltaEl.className = 'bento-delta ' + (indices.sensex.is_positive ? 'positive' : 'negative');
      }
      if (sensexSubtextEl) {
        sensexSubtextEl.textContent = (indices.sensex.is_positive ? '📈 +' : '📉 ') + indices.sensex.change_pts + ' pts';
      }
    }

    // Dynamic Filter Chip Counts
    const chipAll = document.querySelector('.filter-chip[data-filter="all"]');
    const chipMom = document.querySelector('.filter-chip[data-filter="momentum"]');
    const chip52w = document.querySelector('.filter-chip[data-filter="52w"]');
    const chipOver = document.querySelector('.filter-chip[data-filter="oversold"]');

    if (chipAll) chipAll.textContent = `All (${top20Swing.length})`;
    if (chipMom) {
      const momCount = top20Swing.filter(s => (s.day_change_pct || 0) >= 0.5 || (s.composite_score || 0) >= 70 || (s.rsi_14 || 50) >= 55).length;
      chipMom.textContent = `🔥 High Momentum (${momCount})`;
    }
    if (chip52w) {
      const count52 = top20Swing.filter(s => (s.breakout_proximity_pct !== null && s.breakout_proximity_pct <= 5.0) || (s.current_price >= (s.breakout_level || s.current_price)) || (s.primary_pattern || '').toLowerCase().includes('52w') || (s.primary_pattern || '').toLowerCase().includes('breakout')).length;
      chip52w.textContent = `⚡ 52W High (${count52})`;
    }
    if (chipOver) {
      const overCount = top20Swing.filter(s => (s.rsi_14 || 50) <= 52 || (s.day_change_pct || 0) <= 0.8 || (s.primary_pattern || '').toLowerCase().includes('oversold') || (s.primary_pattern || '').toLowerCase().includes('support')).length;
      chipOver.textContent = `🔄 Oversold Rebound (${overCount})`;
    }

    applyFiltersAndRender(top20Swing);
    renderWatchlistTable(allStocks);
    renderRsiTable(allStocks);
    setupSwotTab(allStocks);

    const sidebarRsiBadge = document.getElementById('sidebarRsiBadge');
    if (sidebarRsiBadge) sidebarRsiBadge.textContent = allStocks.length;
  }

  function renderSwingCards(stocks) {
    swingCardsGrid.innerHTML = '';
    if (!stocks || stocks.length === 0) {
      swingCardsGrid.innerHTML = '<div style="padding:24px; text-align:center; color:var(--text-muted); grid-column: 1 / -1; background:var(--bg-card); border-radius:var(--radius-lg); border:1px solid var(--border-color);">No swing candidates match this filter. Try selecting "All" or refresh data.</div>';
      return;
    }

    stocks.forEach((s, idx) => {
      const changePct = s.day_change_pct || 0;
      const changeClass = changePct >= 0 ? 'positive' : 'negative';
      const changeSign = changePct >= 0 ? '+' : '';
      const changeIcon = changePct >= 0 ? '▲' : '▼';
      const pattern = s.primary_pattern || 'Breakout Setup';
      const aiSug = s.ai_suggestion || s.swing_reason || '';
      const accStatus = s.accumulation_status || 'Neutral';
      const buyTrig = s.buy_trigger_price || s.current_price;
      const sellTrig = s.sell_trigger_price || s.swing_stoploss;
      const distPct = s.breakout_proximity_pct || 0;
      const currPrice = s.current_price || 0;
      const score = s.composite_score || 0;
      const scorePillVal = (score / 10).toFixed(1);
      const isBullish = score >= 60 && changePct >= 0;

      const dayHigh = s.day_high || (currPrice > 0 ? (changePct >= 0 ? +(currPrice * 1.008).toFixed(2) : +(currPrice * 1.018).toFixed(2)) : currPrice);
      const dayLow = s.day_low || (currPrice > 0 ? (changePct <= 0 ? +(currPrice * 0.992).toFixed(2) : +(currPrice * 0.982).toFixed(2)) : currPrice);

      let brkBadge = `<span class="badge badge-warning">⚡ ${distPct}% to Breakout</span>`;
      if (currPrice >= (s.breakout_level || currPrice)) {
        brkBadge = `<span class="badge badge-success">🔥 BREAKOUT TRIGGERED</span>`;
      }

      const accentClass = changePct >= 0 ? '' : 'danger';

      const card = document.createElement('div');
      card.className = 'stock-card';
      card.innerHTML = `
        <div class="card-top-accent ${accentClass}"></div>
        <div>
          <div class="card-header">
            <div>
              <div class="stock-ticker-row">
                <span class="stock-ticker">#${idx + 1} ${s.clean_symbol || s.symbol}</span>
                <span class="stock-score-pill">${scorePillVal} / 10</span>
              </div>
              <div class="stock-name">${s.name} • ${s.sector || 'Equities'}</div>
            </div>
            <div class="stock-price-block">
              <div class="stock-price">₹${formatPrice(currPrice)}</div>
              <div class="stock-change ${changeClass}">${changeIcon} ${changeSign}${changePct}%</div>
              <div class="stock-day-range" style="font-size:11px; font-family:var(--font-mono); color:var(--text-muted); margin-top:3px; text-align:right;">
                <span style="color:var(--success); font-weight:700;">H:</span> ₹${formatPrice(dayHigh)} <span style="color:var(--text-muted); margin:0 2px;">•</span> <span style="color:var(--danger); font-weight:700;">L:</span> ₹${formatPrice(dayLow)}
              </div>
            </div>
          </div>

          <div class="composite-banner ${isBullish ? '' : 'neutral'}">
            <div class="composite-title">
              <span>🎯</span>
              <span>Composite: ${s.swing_signal || (isBullish ? 'Bullish Setup' : 'Neutral / Watch')}</span>
            </div>
            <div class="composite-score-badge">Score ${scorePillVal} / 10</div>
          </div>

          <div style="margin-bottom:10px; display:flex; gap:6px; flex-wrap:wrap;">
            <span class="badge badge-purple">${pattern}</span>
            ${brkBadge}
          </div>

          <div class="trigger-box buy">
            <div class="trigger-label">🟢 BUY TRIGGER POINT (ENTRY)</div>
            <div class="trigger-val">BUY ABOVE ₹${formatPrice(buyTrig)}</div>
          </div>

          <div class="trigger-box sell">
            <div class="trigger-label">🔴 SELL TRIGGER POINT (STOP LOSS)</div>
            <div class="trigger-val">SELL BELOW ₹${formatPrice(sellTrig)}</div>
          </div>

          <div class="card-levels">
            <div class="level-box">
              <div class="level-label">Target 1 (1-7D)</div>
              <div class="level-value">₹${formatPrice(s.swing_target_1, 0)}</div>
            </div>
            <div class="level-box">
              <div class="level-label">Target 2 (7-15D)</div>
              <div class="level-value">₹${formatPrice(s.swing_target_2, 0)}</div>
            </div>
          </div>

          <div class="indicators-grid">
            <div class="indicator-col">
              <span class="ind-lbl">20D SMA</span>
              <span class="ind-val" style="color:${currPrice >= (s.sma_20 || currPrice) ? 'var(--success)' : 'var(--danger)'};">
                ${currPrice >= (s.sma_20 || currPrice) ? 'Above' : 'Below'}
              </span>
            </div>
            <div class="indicator-col">
              <span class="ind-lbl">RSI (14)</span>
              <span class="ind-val" style="color:var(--text-primary);">${Math.round(s.rsi_14 || 50)}</span>
            </div>
            <div class="indicator-col">
              <span class="ind-lbl">Vol Surge</span>
              <span class="ind-val" style="color:var(--primary);">${s.vol_surge_ratio || 1}x</span>
            </div>
          </div>
        </div>

        <div class="card-footer-bar">
          <div>RVOL: <strong style="color:var(--primary); font-family:var(--font-mono);">${s.vol_surge_ratio || 1}x</strong> (${accStatus})</div>
          <div class="badge badge-success" style="font-family:var(--font-mono);">Rank #${idx + 1}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        const swotBtn = document.querySelector('.tab-btn[data-tab="tab-swot"]');
        if (swotBtn) swotBtn.click();
        swotTabStockSelect.value = s.symbol;
        swotTabStockSelect.dispatchEvent(new Event('change'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      swingCardsGrid.appendChild(card);
    });
  }

  function renderWatchlistTable(stocks) {
    watchlistTableBody.innerHTML = '';
    if (!stocks || stocks.length === 0) {
      watchlistTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">No stocks found.</td></tr>';
      return;
    }

    const term = searchInput.value.toLowerCase().trim();
    const filtered = stocks.filter(s => 
      (s.symbol && s.symbol.toLowerCase().includes(term)) || 
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.sector && s.sector.toLowerCase().includes(term)) ||
      (s.primary_pattern && s.primary_pattern.toLowerCase().includes(term))
    );

    filtered.forEach(s => {
      const changePct = s.day_change_pct || 0;
      const changeClass = changePct >= 0 ? 'color:var(--success); font-weight:700;' : 'color:var(--danger); font-weight:700;';
      const changeSign = changePct >= 0 ? '+' : '';
      const pattern = s.primary_pattern || s.swing_signal || 'Consolidation';

      let eventsHtml = '<span style="color:var(--text-muted); font-size:12px;">No major event</span>';
      if (s.events && s.events.length > 0) {
        const topEvent = s.events[0];
        eventsHtml = `<strong style="font-size:12px; color:var(--primary);">${topEvent.type || 'Event'}:</strong> <span style="font-size:12px; color:var(--text-secondary);">${topEvent.title || ''}</span>`;
      }

      let rvolBadgeClass = (s.vol_surge_ratio || 0) >= 1.5 ? 'badge-success' : ((s.vol_surge_ratio || 0) >= 1.2 ? 'badge-warning' : 'badge-neutral');
      let scoreBadgeClass = (s.composite_score || 0) >= 70 ? 'badge-success' : ((s.composite_score || 0) >= 50 ? 'badge-warning' : 'badge-neutral');

      const buyTrigFormatted = formatPrice(s.buy_trigger_price || s.current_price);
      const currPriceFormatted = formatPrice(s.current_price);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong style="color:var(--text-primary);">${s.name}</strong><br/>
          <span style="font-size:12px; color:var(--text-muted);">${s.clean_symbol} • ${s.sector}</span>
        </td>
        <td style="font-weight:700;">₹${currPriceFormatted}</td>
        <td style="${changeClass}">${changeSign}${changePct}%</td>
        <td><span class="badge ${rvolBadgeClass}">${s.vol_surge_ratio || 1}x RVOL</span></td>
        <td><span class="badge ${scoreBadgeClass}">${((s.composite_score || 0) / 10).toFixed(1)} / 10</span></td>
        <td style="max-width:250px;">${eventsHtml}</td>
        <td>
          <span class="badge badge-purple">${pattern}</span><br/>
          <span style="font-size:11px; color:#047857; font-weight:700;">Buy &gt; ₹${buyTrigFormatted}</span>
        </td>
      `;

      tr.addEventListener('click', () => {
        const swotBtn = document.querySelector('.tab-btn[data-tab="tab-swot"]');
        if (swotBtn) swotBtn.click();
        swotTabStockSelect.value = s.symbol;
        swotTabStockSelect.dispatchEvent(new Event('change'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      watchlistTableBody.appendChild(tr);
    });
  }

  // --- RSI Analysis Table (Ranked High to Low) ---
  function renderRsiTable(stocks) {
    if (!stocks || !Array.isArray(stocks)) return;

    // Dynamic Filter Counts
    const cntAll = stocks.length;
    const cntOverbought = stocks.filter(s => (s.rsi_14 || 50) >= 70).length;
    const cntBullish = stocks.filter(s => (s.rsi_14 || 50) >= 55 && (s.rsi_14 || 50) < 70).length;
    const cntNeutral = stocks.filter(s => (s.rsi_14 || 50) >= 45 && (s.rsi_14 || 50) < 55).length;
    const cntOversold = stocks.filter(s => (s.rsi_14 || 50) < 45).length;

    const elAll = document.getElementById('rsiCountAll');
    const elOver = document.getElementById('rsiCountOverbought');
    const elBull = document.getElementById('rsiCountBullish');
    const elNeut = document.getElementById('rsiCountNeutral');
    const elUnder = document.getElementById('rsiCountOversold');

    if (elAll) elAll.textContent = cntAll;
    if (elOver) elOver.textContent = cntOverbought;
    if (elBull) elBull.textContent = cntBullish;
    if (elNeut) elNeut.textContent = cntNeutral;
    if (elUnder) elUnder.textContent = cntOversold;

    applyRsiFiltersAndRender(stocks);
  }

  function applyRsiFiltersAndRender(stocks) {
    if (!rsiTableBody) return;
    let list = [...stocks];

    // Strictly rank from High to Low by 14-period RSI
    list.sort((a, b) => (b.rsi_14 || 50) - (a.rsi_14 || 50));

    if (rsiSearchTerm) {
      list = list.filter(s =>
        (s.symbol && s.symbol.toLowerCase().includes(rsiSearchTerm)) ||
        (s.name && s.name.toLowerCase().includes(rsiSearchTerm)) ||
        (s.clean_symbol && s.clean_symbol.toLowerCase().includes(rsiSearchTerm))
      );
    }

    if (activeRsiFilter === 'overbought') {
      list = list.filter(s => (s.rsi_14 || 50) >= 70);
    } else if (activeRsiFilter === 'bullish') {
      list = list.filter(s => (s.rsi_14 || 50) >= 55 && (s.rsi_14 || 50) < 70);
    } else if (activeRsiFilter === 'neutral') {
      list = list.filter(s => (s.rsi_14 || 50) >= 45 && (s.rsi_14 || 50) < 55);
    } else if (activeRsiFilter === 'oversold') {
      list = list.filter(s => (s.rsi_14 || 50) < 45);
    }

    rsiTableBody.innerHTML = '';
    if (list.length === 0) {
      rsiTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--text-muted);">No stocks match the selected RSI filter.</td></tr>';
      return;
    }

    list.forEach(s => {
      const rsiVal = s.rsi_14 !== null && s.rsi_14 !== undefined ? Math.round(s.rsi_14) : 50;
      let rsiBadgeStyle = 'background:rgba(100, 116, 139, 0.12); color:#475569; border:1px solid rgba(100, 116, 139, 0.2);';
      let rsiZone = 'Neutral';

      if (rsiVal >= 70) {
        rsiBadgeStyle = 'background:rgba(239, 68, 68, 0.12); color:#dc2626; border:1px solid rgba(239, 68, 68, 0.3);';
        rsiZone = 'Overbought';
      } else if (rsiVal >= 55) {
        rsiBadgeStyle = 'background:rgba(5, 150, 105, 0.12); color:#059669; border:1px solid rgba(5, 150, 105, 0.3);';
        rsiZone = 'Bullish Zone';
      } else if (rsiVal < 45) {
        rsiBadgeStyle = 'background:rgba(37, 99, 235, 0.12); color:#2563eb; border:1px solid rgba(37, 99, 235, 0.3);';
        rsiZone = 'Oversold';
      }

      let rvolBadgeClass = (s.vol_surge_ratio || 0) >= 1.5 ? 'badge-success' : ((s.vol_surge_ratio || 0) >= 1.2 ? 'badge-warning' : 'badge-neutral');

      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td>
          <strong style="color:var(--text-primary); font-size:14px;">${s.name}</strong><br/>
          <span style="font-size:12px; color:var(--text-muted); font-family:var(--font-mono);">${s.clean_symbol || s.symbol}</span>
        </td>
        <td style="font-weight:700; font-family:var(--font-mono); font-size:14px;">₹${formatPrice(s.current_price)}</td>
        <td><span class="badge ${rvolBadgeClass}">${s.vol_surge_ratio || 1}x RVOL</span></td>
        <td>
          <span class="badge" style="font-family:var(--font-mono); font-size:13px; font-weight:800; padding:5px 12px; border-radius:6px; ${rsiBadgeStyle}">
            ${rsiVal} <span style="font-size:11px; font-weight:600; opacity:0.85; margin-left:4px;">(${rsiZone})</span>
          </span>
        </td>
      `;

      tr.addEventListener('click', () => {
        switchTab('tab-swot');
        swotTabStockSelect.value = s.symbol;
        swotTabStockSelect.dispatchEvent(new Event('change'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      rsiTableBody.appendChild(tr);
    });
  }

  function setupSwotTab(stocks) {
    swotTabStockSelect.innerHTML = '<option value="">Select a Stock from Watchlist...</option>';
    stocks.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.symbol;
      const bTrig = formatPrice(s.buy_trigger_price || s.current_price);
      opt.textContent = `${s.name} (${s.clean_symbol}) - Score: ${((s.composite_score || 0) / 10).toFixed(1)} / 10 - Buy Trigger: ₹${bTrig}`;

      swotTabStockSelect.appendChild(opt);
    });

    swotTabStockSelect.addEventListener('change', () => {
      const selectedSym = swotTabStockSelect.value;
      if (!selectedSym) {
        swotTabContentDisplay.style.display = 'none';
        return;
      }

      const stock = stocks.find(s => s.symbol === selectedSym);
      if (stock) {
        const buyTrigFormatted = formatPrice(stock.buy_trigger_price || stock.current_price);
        const sellTrigFormatted = formatPrice(stock.sell_trigger_price || stock.swing_stoploss);
        const currPriceFormatted = formatPrice(stock.current_price);
        const changePct = stock.day_change_pct || 0;

        const dayHigh = stock.day_high || (currPrice > 0 ? (changePct >= 0 ? +(currPrice * 1.008).toFixed(2) : +(currPrice * 1.018).toFixed(2)) : currPrice);
        const dayLow = stock.day_low || (currPrice > 0 ? (changePct <= 0 ? +(currPrice * 0.992).toFixed(2) : +(currPrice * 0.982).toFixed(2)) : currPrice);
        const prevClose = stock.prev_close || (currPrice > 0 ? +(currPrice / (1 + changePct / 100)).toFixed(2) : currPrice);
        const high52w = stock['52w_high'] || currPrice;
        const low52w = stock['52w_low'] || currPrice;
        const volToday = stock.volume ? Number(stock.volume).toLocaleString('en-IN') : 'N/A';
        const volAvg = stock.vol_1m_avg ? Number(stock.vol_1m_avg).toLocaleString('en-IN') : 'N/A';
        const rvol = stock.vol_surge_ratio || 1;
        const rsiVal = stock.rsi_14 !== null && stock.rsi_14 !== undefined ? Math.round(stock.rsi_14) : 50;
        const sma20 = stock.sma_20 ? formatPrice(stock.sma_20) : 'N/A';
        const sma50 = stock.sma_50 ? formatPrice(stock.sma_50) : 'N/A';
        const sma200 = stock.sma_200 ? formatPrice(stock.sma_200) : 'N/A';
        const macdVal = stock.macd_val !== undefined ? stock.macd_val : 'N/A';
        const macdHist = stock.macd_hist !== undefined ? stock.macd_hist : 'N/A';
        const peRatio = stock.pe_ratio > 0 ? stock.pe_ratio : 'N/A';
        const roe = stock.roe > 0 ? stock.roe + '%' : 'N/A';
        const debt = stock.debt_status || 'Healthy';
        const promoter = stock.promoter_holding > 0 ? stock.promoter_holding + '%' : 'N/A';
        const pledged = stock.pledged_pct || 0;
        const target1 = formatPrice(stock.swing_target_1);
        const target2 = formatPrice(stock.swing_target_2);
        const brkLevel = formatPrice(stock.breakout_level || currPrice);
        const brkDist = stock.breakout_proximity_pct !== null && stock.breakout_proximity_pct !== undefined ? stock.breakout_proximity_pct + '%' : '0%';

        swotPatternAiContainer.innerHTML = `
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:20px; margin-bottom:20px; box-shadow:var(--shadow-sm);">
            <!-- Header Row -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
              <div>
                <h3 style="font-size:22px; font-weight:800; color:var(--text-primary); margin:0;">${stock.name} (${stock.clean_symbol || stock.symbol})</h3>
                <p style="font-size:13px; color:var(--text-muted); margin:4px 0 0 0;">${stock.sector || 'Equities'} • ${stock.cap_type || 'Equity'} • ${stock.tracking_notes || 'Synced Watchlist'}</p>
              </div>
              <div style="text-align:right;">
                <div style="font-size:24px; font-weight:800; font-family:var(--font-mono); color:var(--text-primary);">₹${currPriceFormatted}</div>
                <div style="font-size:13px; font-weight:700; color:${changePct >= 0 ? 'var(--success)' : 'var(--danger)'};">
                  ${changePct >= 0 ? '▲ +' : '▼ '}${changePct}%
                </div>
              </div>
            </div>

            <!-- Trade Triggers & Targets Row -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:16px;">
              <div style="background:#ecfdf5; border-left:4px solid var(--success); padding:10px 12px; border-radius:var(--radius-sm);">
                <div style="font-size:11px; font-weight:700; color:#047857; text-transform:uppercase;">🟢 BUY TRIGGER</div>
                <div style="font-size:15px; font-weight:800; color:#065f46; font-family:var(--font-mono); margin-top:2px;">&gt; ₹${buyTrigFormatted}</div>
              </div>

              <div style="background:#fef2f2; border-left:4px solid var(--danger); padding:10px 12px; border-radius:var(--radius-sm);">
                <div style="font-size:11px; font-weight:700; color:#b91c1c; text-transform:uppercase;">🔴 STOP LOSS (SL)</div>
                <div style="font-size:15px; font-weight:800; color:#991b1b; font-family:var(--font-mono); margin-top:2px;">&lt; ₹${sellTrigFormatted}</div>
              </div>

              <div style="background:var(--bg-subtle); border-left:4px solid var(--primary); padding:10px 12px; border-radius:var(--radius-sm);">
                <div style="font-size:11px; font-weight:700; color:var(--primary); text-transform:uppercase;">🎯 TARGET 1 (1-7D)</div>
                <div style="font-size:15px; font-weight:800; color:var(--text-primary); font-family:var(--font-mono); margin-top:2px;">₹${target1}</div>
              </div>

              <div style="background:var(--bg-subtle); border-left:4px solid var(--purple); padding:10px 12px; border-radius:var(--radius-sm);">
                <div style="font-size:11px; font-weight:700; color:var(--purple); text-transform:uppercase;">🚀 TARGET 2 (7-15D)</div>
                <div style="font-size:15px; font-weight:800; color:var(--text-primary); font-family:var(--font-mono); margin-top:2px;">₹${target2}</div>
              </div>

              <div style="background:#f0fdf4; border-left:4px solid var(--success); padding:10px 12px; border-radius:var(--radius-sm);">
                <div style="font-size:11px; font-weight:700; color:#166534; text-transform:uppercase;">🏆 SCORE & SETUP</div>
                <div style="font-size:15px; font-weight:800; color:#166534; margin-top:2px;">${((stock.composite_score || 0) / 10).toFixed(1)} / 10</div>
              </div>
            </div>

            <!-- Deep Market & Technical Metrics Grid -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:14px; margin-bottom:16px;">
              
              <!-- Card 1: Day & 52-Week Range -->
              <div style="background:var(--bg-subtle); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:12px; font-weight:800; color:var(--text-primary); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                  <span>📏</span> Price Range (Session & 52W)
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">Day's High:</span>
                  <strong style="color:var(--success); font-family:var(--font-mono);">₹${formatPrice(dayHigh)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">Day's Low:</span>
                  <strong style="color:var(--danger); font-family:var(--font-mono);">₹${formatPrice(dayLow)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">Previous Close:</span>
                  <span style="font-family:var(--font-mono); color:var(--text-primary); font-weight:600;">₹${formatPrice(prevClose)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">52-Week High:</span>
                  <strong style="color:var(--text-primary); font-family:var(--font-mono);">₹${formatPrice(high52w)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:13px;">
                  <span style="color:var(--text-muted);">52-Week Low:</span>
                  <strong style="color:var(--text-primary); font-family:var(--font-mono);">₹${formatPrice(low52w)}</strong>
                </div>
              </div>

              <!-- Card 2: Volume & Momentum Dynamics -->
              <div style="background:var(--bg-subtle); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:12px; font-weight:800; color:var(--text-primary); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                  <span>📊</span> Volume & Momentum Indicators
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">Today's Volume:</span>
                  <strong style="font-family:var(--font-mono); color:var(--text-primary);">${volToday}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">1-Month Avg Vol:</span>
                  <span style="font-family:var(--font-mono); color:var(--text-muted);">${volAvg}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">RVOL (Surge Ratio):</span>
                  <strong style="color:var(--primary); font-family:var(--font-mono);">${rvol}x</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">RSI (14):</span>
                  <strong style="font-family:var(--font-mono); color:${rsiVal >= 70 ? 'var(--danger)' : rsiVal >= 55 ? 'var(--success)' : rsiVal < 45 ? 'var(--primary)' : 'var(--text-primary)'};">${rsiVal} (${rsiVal >= 70 ? 'Overbought' : rsiVal >= 55 ? 'Bullish' : rsiVal < 45 ? 'Oversold' : 'Neutral'})</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:13px;">
                  <span style="color:var(--text-muted);">MACD Indicator:</span>
                  <span style="font-family:var(--font-mono); font-size:12px;">Val: ${macdVal} • Hist: ${macdHist}</span>
                </div>
              </div>

              <!-- Card 3: Moving Averages & Trend Confluence -->
              <div style="background:var(--bg-subtle); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:12px; font-weight:800; color:var(--text-primary); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                  <span>📈</span> Moving Averages & Trend
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">20-Day SMA:</span>
                  <strong style="font-family:var(--font-mono); color:${currPrice >= (stock.sma_20 || currPrice) ? 'var(--success)' : 'var(--danger)'};">₹${sma20}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">50-Day SMA:</span>
                  <strong style="font-family:var(--font-mono); color:${currPrice >= (stock.sma_50 || currPrice) ? 'var(--success)' : 'var(--danger)'};">₹${sma50}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">200-Day SMA:</span>
                  <strong style="font-family:var(--font-mono); color:${currPrice >= (stock.sma_200 || currPrice) ? 'var(--success)' : 'var(--danger)'};">₹${sma200}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">Breakout Ceiling:</span>
                  <span style="font-family:var(--font-mono); font-weight:700; color:#8b5cf6;">₹${brkLevel}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:13px;">
                  <span style="color:var(--text-muted);">Breakout Proximity:</span>
                  <span style="font-family:var(--font-mono); font-weight:700; color:var(--text-primary);">${brkDist} away</span>
                </div>
              </div>

              <!-- Card 4: Fundamental & Valuation Metrics -->
              <div style="background:var(--bg-subtle); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:12px; font-weight:800; color:var(--text-primary); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                  <span>🏢</span> Fundamentals & Health
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">P/E Ratio:</span>
                  <strong style="font-family:var(--font-mono); color:var(--text-primary);">${peRatio}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">Return on Equity (ROE):</span>
                  <strong style="font-family:var(--font-mono); color:var(--success);">${roe}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">Debt Health:</span>
                  <span style="font-size:12px; font-weight:700; color:var(--text-primary);">${debt}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                  <span style="color:var(--text-muted);">Promoter Holding:</span>
                  <span style="font-family:var(--font-mono); color:var(--text-primary); font-weight:600;">${promoter} <small style="color:var(--text-muted);">(Pledged: ${pledged}%)</small></span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:13px;">
                  <span style="color:var(--text-muted);">YoY Net Profit:</span>
                  <strong style="font-family:var(--font-mono); color:var(--success);">${stock.earnings_growth_yoy ? (stock.earnings_growth_yoy >= 0 ? '+' : '') + stock.earnings_growth_yoy + '%' : 'N/A'}</strong>
                </div>
              </div>

            </div>

            <!-- AI Actionable Strategy Suggestion -->
            <div class="ai-suggestion-box" style="font-size:13px; padding:14px;">
              <strong style="font-size:14px;">🤖 AI Actionable Strategy Suggestion:</strong><br/>
              <div style="margin-top:6px; line-height:1.5;">${(stock.ai_suggestion || '').replace(/\*\*/g, '')}</div>
            </div>
          </div>
        `;

        // Render Strengths
        const strengthsList = (stock.strengths || []).filter(item => !item.includes('Upcoming Event') && !item.includes('News'));
        swotTabStrengths.innerHTML = strengthsList.map(str => `<li class="swot-item strength">✔ ${str}</li>`).join('');

        // Render Weaknesses
        swotTabWeaknesses.innerHTML = (stock.weaknesses || []).map(w => `<li class="swot-item weakness">✖ ${w}</li>`).join('');

        // Render Separate Corporate Events Box
        const eventsList = (stock.events || []).filter(e => e.type !== 'Trading Monitoring');
        if (eventsList.length > 0) {
          swotTabEvents.innerHTML = eventsList.map(e => `
            <li class="swot-item" style="color:var(--primary); display:block;">
              <div style="font-weight:700; font-size:13px;">📅 ${e.type} (${e.date_tag || 'Scheduled'})</div>
              <div style="font-size:13px; color:var(--text-primary); margin-top:2px;">${e.title}</div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${e.summary || ''}</div>
            </li>
          `).join('');
        } else {
          swotTabEvents.innerHTML = '<li class="swot-item" style="color:var(--text-muted);">No corporate events scheduled in next 7 days.</li>';
        }

        // Render Separate Recent News & Research Box
        const newsItems = (stock.strengths || []).filter(item => item.includes('News') || item.includes('Recommendation') || item.includes('Result'));
        if (newsItems.length > 0) {
          swotTabNews.innerHTML = newsItems.map(n => `
            <li class="swot-item" style="color:var(--purple); display:block;">
              <div style="font-size:13px; color:var(--text-primary); font-weight:600;">${n}</div>
            </li>
          `).join('');
        } else {
          swotTabNews.innerHTML = '<li class="swot-item" style="color:var(--text-muted);">No major news or analyst research logged today.</li>';
        }

        swotTabContentDisplay.style.display = 'block';
      }
    });
  }



  btnRefresh.addEventListener('click', () => {
    refreshIcon.classList.add('spin');
    btnRefresh.disabled = true;

    // Fast instant refresh from network
    fetchData().finally(() => {
      refreshIcon.classList.remove('spin');
      btnRefresh.disabled = false;
    });

    // Background trigger for local server if running
    fetch('/api/refresh', {
      method: 'POST',
      headers: { 'Bypass-Tunnel-Reminder': 'true', 'Content-Type': 'application/json' }
    }).catch(() => {});
  });





  // Add Stock Modal elements
  const addStockModal = document.getElementById('addStockModal');
  const btnAddStockHeader = document.getElementById('btnAddStockHeader');
  const btnAddStockWatchlist = document.getElementById('btnAddStockWatchlist');
  const btnCloseAddStockModal = document.getElementById('btnCloseAddStockModal');
  const btnCloseAddStockX = document.getElementById('btnCloseAddStockX');
  const btnSubmitAddStock = document.getElementById('btnSubmitAddStock');
  const addStockSymbolInput = document.getElementById('addStockSymbolInput');
  const addStockExchangeSelect = document.getElementById('addStockExchangeSelect');
  const addStockSectorInput = document.getElementById('addStockSectorInput');
  const addStockNameInput = document.getElementById('addStockNameInput');
  const addStockFeedback = document.getElementById('addStockFeedback');
  const addStockBtnIcon = document.getElementById('addStockBtnIcon');
  const addStockBtnText = document.getElementById('addStockBtnText');
  const stockSuggestionsDropdown = document.getElementById('stockSuggestionsDropdown');

  let selectedSuggestionIndex = -1;

  function openAddStockModal() {
    if (!addStockModal) return;
    addStockFeedback.style.display = 'none';
    addStockFeedback.innerHTML = '';
    addStockSymbolInput.value = '';
    addStockNameInput.value = '';
    addStockSectorInput.value = '';
    addStockExchangeSelect.value = 'AUTO';
    if (stockSuggestionsDropdown) {
      stockSuggestionsDropdown.style.display = 'none';
      stockSuggestionsDropdown.innerHTML = '';
    }
    btnSubmitAddStock.disabled = false;
    addStockBtnIcon.textContent = '➕';
    addStockBtnText.textContent = 'Add to Sheet & Watchlist';
    addStockModal.classList.add('active');
    setTimeout(() => addStockSymbolInput.focus(), 100);
  }

  function closeAddStockModal() {
    if (addStockModal) addStockModal.classList.remove('active');
    if (stockSuggestionsDropdown) stockSuggestionsDropdown.style.display = 'none';
  }

  if (btnAddStockHeader) btnAddStockHeader.addEventListener('click', openAddStockModal);
  if (btnAddStockWatchlist) btnAddStockWatchlist.addEventListener('click', openAddStockModal);
  if (btnCloseAddStockModal) btnCloseAddStockModal.addEventListener('click', closeAddStockModal);
  if (btnCloseAddStockX) btnCloseAddStockX.addEventListener('click', closeAddStockModal);

  if (addStockModal) {
    addStockModal.addEventListener('click', (e) => {
      if (e.target === addStockModal) closeAddStockModal();
    });
  }

  // --- Autocomplete Suggestions ---
  function renderSuggestions(query) {
    if (!stockSuggestionsDropdown) return;
    const q = (query || '').trim().toUpperCase();
    if (q.length < 1) {
      stockSuggestionsDropdown.style.display = 'none';
      stockSuggestionsDropdown.innerHTML = '';
      return;
    }

    const dir = window.STOCKS_DIRECTORY || [];
    const results = [];
    const seen = new Set();

    // 1. Symbol prefix or exact match
    for (let i = 0; i < dir.length && results.length < 12; i++) {
      const item = dir[i];
      const s = item.s.toUpperCase();
      if (s === q || s.startsWith(q)) {
        seen.add(s);
        results.push(item);
      }
    }

    // 2. Company name match or symbol contains match
    for (let i = 0; i < dir.length && results.length < 12; i++) {
      const item = dir[i];
      const s = item.s.toUpperCase();
      const n = (item.n || '').toUpperCase();
      if (!seen.has(s) && (s.includes(q) || n.includes(q))) {
        seen.add(s);
        results.push(item);
      }
    }

    // 3. Fallback from current watchlist items
    if (results.length < 6 && currentData && currentData.all_stocks) {
      for (const st of currentData.all_stocks) {
        const cleanS = (st.symbol || '').replace(/\.(NS|BO)$/i, '').toUpperCase();
        const stName = (st.name || '').toUpperCase();
        if (!seen.has(cleanS) && (cleanS.includes(q) || stName.includes(q))) {
          seen.add(cleanS);
          results.push({
            s: cleanS,
            n: st.name || cleanS,
            e: (st.symbol || '').endsWith('.BO') || /^\d+$/.test(cleanS) ? 'BSE' : 'NSE'
          });
          if (results.length >= 12) break;
        }
      }
    }

    if (results.length === 0) {
      stockSuggestionsDropdown.style.display = 'none';
      stockSuggestionsDropdown.innerHTML = '';
      return;
    }

    selectedSuggestionIndex = -1;
    let html = '';
    results.forEach((item, idx) => {
      const badgeClass = item.e === 'BSE' ? 'bse' : 'nse';
      html += `
        <div class="suggestion-item" data-idx="${idx}" data-symbol="${item.s}" data-name="${encodeURIComponent(item.n)}" data-exchange="${item.e}">
          <div class="suggestion-info">
            <div class="suggestion-symbol-row">
              <span class="suggestion-ticker">${item.s}</span>
              <span class="suggestion-badge ${badgeClass}">${item.e}</span>
            </div>
            <div class="suggestion-name">${item.n}</div>
          </div>
          <span style="color:var(--primary); font-size:12px; font-weight:700;">Select ➔</span>
        </div>
      `;
    });

    stockSuggestionsDropdown.innerHTML = html;
    stockSuggestionsDropdown.style.display = 'block';

    stockSuggestionsDropdown.querySelectorAll('.suggestion-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        selectSuggestion(el);
      });
    });
  }

  function selectSuggestion(el) {
    const sym = el.getAttribute('data-symbol');
    const name = decodeURIComponent(el.getAttribute('data-name') || '');
    const exch = el.getAttribute('data-exchange');

    addStockSymbolInput.value = sym;
    if (name) addStockNameInput.value = name;
    if (exch) addStockExchangeSelect.value = exch;

    stockSuggestionsDropdown.style.display = 'none';
    stockSuggestionsDropdown.innerHTML = '';
  }

  function highlightSuggestion(items) {
    items.forEach((item, idx) => {
      if (idx === selectedSuggestionIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  if (addStockSymbolInput) {
    addStockSymbolInput.addEventListener('input', (e) => {
      renderSuggestions(e.target.value);
    });

    addStockSymbolInput.addEventListener('keydown', (e) => {
      const items = stockSuggestionsDropdown ? stockSuggestionsDropdown.querySelectorAll('.suggestion-item') : [];
      if (items.length > 0 && stockSuggestionsDropdown.style.display !== 'none') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
          highlightSuggestion(items);
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedSuggestionIndex = (selectedSuggestionIndex - 1 + items.length) % items.length;
          highlightSuggestion(items);
          return;
        } else if (e.key === 'Enter') {
          if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < items.length) {
            e.preventDefault();
            selectSuggestion(items[selectedSuggestionIndex]);
            return;
          }
        } else if (e.key === 'Escape') {
          stockSuggestionsDropdown.style.display = 'none';
          return;
        }
      }

      if (e.key === 'Enter') {
        btnSubmitAddStock.click();
      }
    });
  }

  // Close suggestions dropdown on outside click
  document.addEventListener('click', (e) => {
    if (stockSuggestionsDropdown && !stockSuggestionsDropdown.contains(e.target) && e.target !== addStockSymbolInput) {
      stockSuggestionsDropdown.style.display = 'none';
    }
  });

  function cleanClientSymbol(sym, exchange) {
    sym = (sym || '').trim().toUpperCase();
    if (!sym) return '';
    if (sym.startsWith('BSE:') || sym.startsWith('BOM:')) {
      exchange = 'BSE';
      sym = sym.split(':', 2)[1].trim();
    } else if (sym.startsWith('NSE:')) {
      exchange = 'NSE';
      sym = sym.split(':', 2)[1].trim();
    }
    if (exchange === 'BSE' || exchange === 'BO') {
      if (sym.endsWith('.NS')) sym = sym.slice(0, -3);
      if (!sym.endsWith('.BO')) sym = sym + '.BO';
    } else if (exchange === 'NSE' || exchange === 'NS') {
      if (sym.endsWith('.BO')) sym = sym.slice(0, -3);
      if (!sym.endsWith('.NS')) sym = sym + '.NS';
    }
    if (!sym.endsWith('.NS') && !sym.endsWith('.BO')) {
      if (/^\d+$/.test(sym)) {
        sym = sym + '.BO';
      } else {
        sym = sym + '.NS';
      }
    }
    return sym;
  }

  if (btnSubmitAddStock) {
    btnSubmitAddStock.addEventListener('click', () => {
      const rawSymbol = addStockSymbolInput.value.trim();
      const exchange = addStockExchangeSelect.value;
      const cleanSym = cleanClientSymbol(rawSymbol, exchange === 'AUTO' ? '' : exchange);
      // Clean symbol without .NS/.BO for Google Sheet column A so Google Finance formulas work
      const sheetSymbol = cleanSym.replace(/\.(NS|BO)$/i, '').trim().toUpperCase();
      const name = addStockNameInput.value.trim();
      const sector = addStockSectorInput.value.trim() || 'User Added';

      if (!cleanSym) {
        addStockFeedback.style.display = 'block';
        addStockFeedback.style.background = 'var(--danger-bg)';
        addStockFeedback.style.color = 'var(--danger)';
        addStockFeedback.textContent = 'Please enter a valid stock ticker or BSE code!';
        addStockSymbolInput.focus();
        return;
      }

      if (stockSuggestionsDropdown) stockSuggestionsDropdown.style.display = 'none';

      btnSubmitAddStock.disabled = true;
      addStockBtnIcon.textContent = '⏳';
      addStockBtnText.textContent = 'Adding...';
      addStockFeedback.style.display = 'block';
      addStockFeedback.style.background = 'var(--bg-subtle)';
      addStockFeedback.style.color = 'var(--text-secondary)';
      addStockFeedback.textContent = `Connecting & adding ${sheetSymbol} to Google Sheet and watchlist...`;

      // Helper for UI success
      function handleSuccess(msg) {
        btnSubmitAddStock.disabled = false;
        addStockBtnIcon.textContent = '➕';
        addStockBtnText.textContent = 'Add to Sheet & Watchlist';
        addStockFeedback.style.background = 'var(--success-bg)';
        addStockFeedback.style.color = 'var(--success)';
        addStockFeedback.innerHTML = msg;

        setTimeout(() => {
          closeAddStockModal();
          refreshIcon.classList.add('spin');
          pollStatus();
          if (typeof fetchData === 'function') fetchData();
        }, 2200);
      }

      // Helper for UI error
      function handleError(msg) {
        btnSubmitAddStock.disabled = false;
        addStockBtnIcon.textContent = '➕';
        addStockBtnText.textContent = 'Add to Sheet & Watchlist';
        addStockFeedback.style.background = 'var(--danger-bg)';
        addStockFeedback.style.color = 'var(--danger)';
        addStockFeedback.innerHTML = msg;
      }

      // Attempt 1: Call backend API if running
      fetch('/api/add_stock', {
        method: 'POST',
        headers: {
          'Bypass-Tunnel-Reminder': 'true',
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: cleanSym,
          exchange: exchange === 'AUTO' ? '' : exchange,
          name: name,
          sector: sector
        })
      })
      .then(res => {
        if (!res.ok && res.status >= 500) {
          throw new Error('Server error ' + res.status);
        }
        return res.json();
      })
      .then(data => {
        if (data.status === 'success' || data.status === 'warning') {
          handleSuccess(data.message || `Added ${sheetSymbol}`);
        } else {
          handleError(data.message || 'Failed to add stock.');
        }
      })
      .catch(err => {
        // Attempt 2: If server is offline (Failed to fetch), send directly from browser to Google Apps Script Webhook!
        const webhookUrl = (document.getElementById('gsheetWebhookUrlInput') ? document.getElementById('gsheetWebhookUrlInput').value.trim() : '') ||
                           localStorage.getItem('gsheet_webhook_url') || '';

        if (webhookUrl && webhookUrl.startsWith('http')) {
          addStockFeedback.innerHTML = `Sending <strong>${sheetSymbol}</strong> directly to your Google Sheet...`;

          // Note: Send sheetSymbol (WITHOUT .NS/.BO) so Google Finance formulas evaluate properly!
          const targetUrl = webhookUrl + (webhookUrl.includes('?') ? '&' : '?') +
            'symbol=' + encodeURIComponent(sheetSymbol) +
            '&name=' + encodeURIComponent(name || sheetSymbol) +
            '&sector=' + encodeURIComponent(sector) +
            '&t=' + Date.now();

          // Try GET first with no-cors (works reliably across origins from browser to Apps Script)
          fetch(targetUrl, { method: 'GET', mode: 'no-cors' })
            .then(() => {
              handleSuccess(`✅ Successfully added <strong>${sheetSymbol}</strong> to Google Sheet <em>"Spark Stock List"</em>!`);
            })
            .catch(() => {
              // Fallback to POST with no-cors
              fetch(webhookUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ symbol: sheetSymbol, name: name || sheetSymbol, sector: sector })
              })
              .then(() => {
                handleSuccess(`✅ Sent <strong>${sheetSymbol}</strong> to Google Sheet <em>"Spark Stock List"</em>!`);
              })
              .catch(postErr => {
                handleError(`Could not reach Google Sheet Webhook: ${postErr.message}`);
              });
            });
        } else {
          handleError(`⚠️ <strong>Connection Error (Local server is not running)</strong><br><br>
            Please choose one of the following to add stocks:<br>
            • <strong>Option A (Local):</strong> Double-click <code>Start_App.bat</code> on your PC to start the server.<br>
            • <strong>Option B (Cloud/Browser):</strong> Click <strong>📊 Google Sheet</strong> above, set up the 1-minute Apps Script Webhook, and paste the URL. This allows adding stocks directly from any browser or phone without running the local server!`);
        }
      });
    });
  }

  // Google Sheet Modal Extra controls
  const btnCloseGsheetModalX = document.getElementById('btnCloseGsheetModalX');
  if (btnCloseGsheetModalX) {
    btnCloseGsheetModalX.addEventListener('click', () => gsheetModal.classList.remove('active'));
  }

  const btnCopyAppsScript = document.getElementById('btnCopyAppsScript');
  if (btnCopyAppsScript) {
    btnCopyAppsScript.addEventListener('click', () => {
      const codeBlock = document.getElementById('appsScriptCodeBlock');
      if (codeBlock) {
        navigator.clipboard.writeText(codeBlock.innerText).then(() => {
          btnCopyAppsScript.textContent = '✅ Copied!';
          setTimeout(() => { btnCopyAppsScript.textContent = '📋 Copy'; }, 2000);
        }).catch(() => {
          alert('Failed to copy. Please select and copy the text manually.');
        });
      }
    });
  }

  document.getElementById('btnSaveGsheet').addEventListener('click', () => {
    const url = document.getElementById('gsheetUrlInput').value.trim();
    const webhookUrl = document.getElementById('gsheetWebhookUrlInput') ? document.getElementById('gsheetWebhookUrlInput').value.trim() : '';
    if (!url) {
      alert('Please paste a Google Sheet URL!');
      return;
    }

    // Always remember in browser localStorage
    localStorage.setItem('gsheet_url', url);
    if (webhookUrl) {
      localStorage.setItem('gsheet_webhook_url', webhookUrl);
    }

    const requestHeaders = {
      'Bypass-Tunnel-Reminder': 'true',
      'ngrok-skip-browser-warning': 'true',
      'Content-Type': 'application/json'
    };

    refreshIcon.classList.add('spin');

    fetch('/api/save_gsheet', {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({ google_sheet_url: url, google_apps_script_url: webhookUrl })
    })
    .then(res => res.json())
    .then(d => {
      alert(d.message || 'Google Sheet configuration saved & syncing...');
      gsheetModal.classList.remove('active');
      pollStatus();
    })
    .catch(() => {
      alert('Google Sheet settings saved in browser! If you have configured the Webhook URL, you can now add stocks directly from the page.');
      gsheetModal.classList.remove('active');
      pollStatus();
    });
  });

  function fetchGsheetConfig() {
    // 1. Load from localStorage immediately for fast UI response
    const savedUrl = localStorage.getItem('gsheet_url');
    const savedWebhook = localStorage.getItem('gsheet_webhook_url');
    if (savedUrl && document.getElementById('gsheetUrlInput')) {
      document.getElementById('gsheetUrlInput').value = savedUrl;
    }
    if (savedWebhook && document.getElementById('gsheetWebhookUrlInput')) {
      document.getElementById('gsheetWebhookUrlInput').value = savedWebhook;
    }

    // 2. Fetch from backend if available
    fetch('/api/get_gsheet_config?t=' + Date.now(), {
      headers: { 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' }
    })
      .then(res => res.json())
      .then(d => {
        if (d.google_sheet_url) {
          document.getElementById('gsheetUrlInput').value = d.google_sheet_url;
          localStorage.setItem('gsheet_url', d.google_sheet_url);
        }
        if (d.google_apps_script_url && document.getElementById('gsheetWebhookUrlInput')) {
          document.getElementById('gsheetWebhookUrlInput').value = d.google_apps_script_url;
          localStorage.setItem('gsheet_webhook_url', d.google_apps_script_url);
        }
      })
      .catch(() => {
        // 3. Fallback: fetch static google_sheet_config.json (works on GitHub Pages!)
        fetch('google_sheet_config.json?t=' + Date.now())
          .then(res => res.json())
          .then(d => {
            if (d.google_sheet_url && !document.getElementById('gsheetUrlInput').value) {
              document.getElementById('gsheetUrlInput').value = d.google_sheet_url;
            }
            if (d.google_apps_script_url && document.getElementById('gsheetWebhookUrlInput') && !document.getElementById('gsheetWebhookUrlInput').value) {
              document.getElementById('gsheetWebhookUrlInput').value = d.google_apps_script_url;
              localStorage.setItem('gsheet_webhook_url', d.google_apps_script_url);
            }
          })
          .catch(() => {});
      });
  }


  document.getElementById('btnSaveEmail').addEventListener('click', () => {
    const recipient = document.getElementById('emailRecipientInput').value.trim();
    const sender = document.getElementById('emailSenderInput').value.trim();
    const pwd = document.getElementById('emailPasswordInput').value.trim();

    fetch('/api/save_email_config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_email: recipient, sender_email: sender, app_password: pwd, enabled: true })
    })
    .then(res => res.json())
    .then(d => {
      alert(d.message);
      emailModal.classList.remove('active');
    });
  });

  document.getElementById('btnTestEmail').addEventListener('click', () => {
    fetch('/api/test_email', { method: 'POST' })
      .then(res => res.json())
      .then(d => alert(d.message));
  });

  function fetchEmailConfig() {
    fetch('/api/get_email_config')
      .then(res => res.json())
      .then(d => {
        document.getElementById('emailRecipientInput').value = d.recipient_email || 'digant73@gmail.com';
        document.getElementById('emailSenderInput').value = d.sender_email || 'digant73@gmail.com';
      });
  }

  searchInput.addEventListener('input', () => {
    if (currentData && currentData.all_stocks) {
      renderWatchlistTable(currentData.all_stocks);
    }
  });

});
