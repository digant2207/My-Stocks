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

  // Tab Switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.style.display = 'none');

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.style.display = 'block';
    });
  });

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
    lastUpdatedBadge.textContent = 'Updated: ' + (summary.last_updated || 'Just now');
    totalScannedPill.textContent = `📊 Scanned: ${scannedCount} Stocks`;
    swingPicksPill.textContent = `⚡ ${summary.near_breakout_zone_count || top20Swing.length} Near Breakout Zone`;


    renderSwingCards(top20Swing);
    renderWatchlistTable(allStocks);
    setupSwotTab(allStocks);
  }

  function renderSwingCards(stocks) {
    swingCardsGrid.innerHTML = '';
    if (!stocks || stocks.length === 0) {
      swingCardsGrid.innerHTML = '<div style="padding:20px; color:var(--text-muted);">No swing candidates available right now. Click Refresh to scan.</div>';
      return;
    }

    stocks.forEach((s, idx) => {
      const changePct = s.day_change_pct || 0;
      const changeClass = changePct >= 0 ? 'positive' : 'negative';
      const changeSign = changePct >= 0 ? '+' : '';
      const pattern = s.primary_pattern || 'Breakout Setup';
      const aiSug = s.ai_suggestion || s.swing_reason || '';
      const accStatus = s.accumulation_status || 'Neutral';
      const buyTrig = s.buy_trigger_price || s.current_price;
      const sellTrig = s.sell_trigger_price || s.swing_stoploss;
      const distPct = s.breakout_proximity_pct || 0;
      const currPrice = s.current_price || 0;

      let brkBadge = `<span class="badge badge-warning">⚡ ${distPct}% to Breakout</span>`;
      if (currPrice >= (s.breakout_level || currPrice)) {
        brkBadge = `<span class="badge badge-success">🔥 BREAKOUT TRIGGERED</span>`;
      }

      const card = document.createElement('div');
      card.className = 'stock-card';
      card.innerHTML = `
        <div>
          <div class="card-header">
            <div>
              <div class="stock-name">#${idx + 1} ${s.name}</div>
              <div class="stock-symbol">${s.clean_symbol} • ${s.sector}</div>
            </div>
            <div class="stock-price-block">
              <div class="stock-price">₹${formatPrice(currPrice)}</div>
              <div class="stock-change ${changeClass}">${changeSign}${changePct}%</div>
            </div>
          </div>

          <div style="margin-bottom:10px; display:flex; gap:6px; flex-wrap:wrap;">
            <span class="badge badge-purple">${pattern}</span>
            ${brkBadge}
          </div>

          <div style="background:#ecfdf5; border-left:4px solid var(--success); padding:10px; border-radius:var(--radius-sm); margin-bottom:10px;">
            <div style="font-size:11px; font-weight:700; color:#047857; text-transform:uppercase;">🟢 BUY TRIGGER POINT (ENTRY)</div>
            <div style="font-size:16px; font-weight:800; color:#065f46; margin-top:2px;">BUY ABOVE ₹${formatPrice(buyTrig)}</div>
          </div>

          <div style="background:#fef2f2; border-left:4px solid var(--danger); padding:10px; border-radius:var(--radius-sm); margin-bottom:10px;">
            <div style="font-size:11px; font-weight:700; color:#b91c1c; text-transform:uppercase;">🔴 SELL TRIGGER POINT (STOP LOSS)</div>
            <div style="font-size:16px; font-weight:800; color:#991b1b; margin-top:2px;">SELL BELOW ₹${formatPrice(sellTrig)}</div>
          </div>

          <div class="card-levels">
            <div class="level-box target">
              <div class="level-label">Target 1 (1-7D)</div>
              <div class="level-value" style="color:var(--success);">₹${formatPrice(s.swing_target_1, 0)}</div>
            </div>
            <div class="level-box target">
              <div class="level-label">Target 2 (7-15D)</div>
              <div class="level-value" style="color:var(--success);">₹${formatPrice(s.swing_target_2, 0)}</div>
            </div>
          </div>

          <div class="ai-suggestion-box" style="margin-bottom:10px;">
            <strong>🤖 AI Strategy Suggestion:</strong><br/>
            ${aiSug.replace(/\*\*/g, '')}
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px; margin-top:8px; font-size:12px;">
          <div>RVOL: <strong style="color:var(--primary);">${s.vol_surge_ratio || 1}x</strong> (${accStatus})</div>
          <div class="badge badge-success">Score: ${s.composite_score || 0}/100</div>
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
        <td><span class="badge ${scoreBadgeClass}">${s.composite_score || 0} / 100</span></td>
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

  function setupSwotTab(stocks) {
    swotTabStockSelect.innerHTML = '<option value="">Select a Stock from Watchlist...</option>';
    stocks.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.symbol;
      const bTrig = formatPrice(s.buy_trigger_price || s.current_price);
      opt.textContent = `${s.name} (${s.clean_symbol}) - Score: ${s.composite_score || 0}/100 - Buy Trigger: ₹${bTrig}`;

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

        swotPatternAiContainer.innerHTML = `
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:20px; margin-bottom:20px; box-shadow:var(--shadow-sm);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
              <div>
                <h3 style="font-size:20px; font-weight:800; color:var(--text-primary);">${stock.name} (${stock.clean_symbol})</h3>
                <p style="font-size:13px; color:var(--text-muted);">${stock.sector} • ${stock.cap_type}</p>
              </div>
              <div style="text-align:right;">
                <div style="font-size:22px; font-weight:800; color:var(--text-primary);">₹${currPriceFormatted}</div>
                <div style="font-size:13px; font-weight:700; color:${changePct >= 0 ? 'var(--success)' : 'var(--danger)'};">
                  ${changePct >= 0 ? '+' : ''}${changePct}%
                </div>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:16px;">
              <div style="background:#ecfdf5; border-left:4px solid var(--success); padding:10px 14px; border-radius:var(--radius-sm);">
                <div style="font-size:11px; font-weight:700; color:#047857; text-transform:uppercase;">🟢 BUY TRIGGER POINT</div>
                <div style="font-size:16px; font-weight:800; color:#065f46; margin-top:2px;">BUY ABOVE ₹${buyTrigFormatted}</div>
              </div>

              <div style="background:#fef2f2; border-left:4px solid var(--danger); padding:10px 14px; border-radius:var(--radius-sm);">
                <div style="font-size:11px; font-weight:700; color:#b91c1c; text-transform:uppercase;">🔴 SELL TRIGGER (STOP LOSS)</div>
                <div style="font-size:16px; font-weight:800; color:#991b1b; margin-top:2px;">SELL BELOW ₹${sellTrigFormatted}</div>
              </div>

              <div style="background:#f0fdf4; border-left:4px solid var(--success); padding:10px 14px; border-radius:var(--radius-sm);">
                <div style="font-size:11px; font-weight:700; color:#166534; text-transform:uppercase;">🏆 COMPOSITE SCORE</div>
                <div style="font-size:16px; font-weight:800; color:#166534; margin-top:2px;">${stock.composite_score} / 100 <span style="font-size:12px; font-weight:600;">(${stock.long_term_signal})</span></div>
              </div>

              <div style="background:var(--purple-bg); border-left:4px solid var(--purple); padding:10px 14px; border-radius:var(--radius-sm);">
                <div style="font-size:11px; font-weight:700; color:var(--purple); text-transform:uppercase;">Chart Pattern</div>
                <div style="font-size:14px; font-weight:800; color:#4c1d95; margin-top:2px;">${stock.primary_pattern || 'Range Consolidation'}</div>
              </div>

              <div style="background:var(--bg-subtle); border-left:4px solid var(--primary); padding:10px 14px; border-radius:var(--radius-sm);">
                <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Volume Analysis</div>
                <div style="font-size:14px; font-weight:800; color:var(--text-primary); margin-top:2px;">${stock.vol_surge_ratio}x RVOL (${stock.accumulation_status})</div>
              </div>
            </div>


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
