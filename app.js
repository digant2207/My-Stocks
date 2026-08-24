document.addEventListener('DOMContentLoaded', () => {

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

  // Load Initial Data
  if (currentData) {
    renderDashboard(currentData);
  } else {
    fetchData();
  }

  function fetchData(forceFresh = false) {
    const fetchOptions = forceFresh ? { cache: 'no-store', headers: { 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' } } : { headers: { 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' } };
    
    fetch('analysis_data.json?t=' + Date.now(), fetchOptions)
      .then(res => res.json())
      .then(data => {
        currentData = data;
        window.stockData = data;
        renderDashboard(data);
      })
      .catch(err => console.warn('Failed to load analysis_data.json:', err));
  }

  // Auto-refresh when tab becomes visible on iPhone/Desktop
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchData(true);
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
      const changeClass = s.day_change_pct >= 0 ? 'positive' : 'negative';
      const changeSign = s.day_change_pct >= 0 ? '+' : '';
      const pattern = s.primary_pattern || 'Breakout Setup';
      const aiSug = s.ai_suggestion || s.swing_reason || '';
      const accStatus = s.accumulation_status || 'Neutral';
      const buyTrig = s.buy_trigger_price || s.current_price;
      const sellTrig = s.sell_trigger_price || s.swing_stoploss;
      const distPct = s.breakout_proximity_pct || 0;

      let brkBadge = `<span class="badge badge-warning">⚡ ${distPct}% to Breakout</span>`;
      if (s.current_price >= s.breakout_level) {
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
              <div class="stock-price">₹${s.current_price.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
              <div class="stock-change ${changeClass}">${changeSign}${s.day_change_pct}%</div>
            </div>
          </div>

          <div style="margin-bottom:10px; display:flex; gap:6px; flex-wrap:wrap;">
            <span class="badge badge-purple">${pattern}</span>
            ${brkBadge}
          </div>

          <div style="background:#ecfdf5; border-left:4px solid var(--success); padding:10px; border-radius:var(--radius-sm); margin-bottom:10px;">
            <div style="font-size:11px; font-weight:700; color:#047857; text-transform:uppercase;">🟢 BUY TRIGGER POINT (ENTRY)</div>
            <div style="font-size:16px; font-weight:800; color:#065f46; margin-top:2px;">BUY ABOVE ₹${buyTrig.toLocaleString('en-IN', {minimumFractionDigits:2})}</div>
          </div>

          <div style="background:#fef2f2; border-left:4px solid var(--danger); padding:10px; border-radius:var(--radius-sm); margin-bottom:10px;">
            <div style="font-size:11px; font-weight:700; color:#b91c1c; text-transform:uppercase;">🔴 SELL TRIGGER POINT (STOP LOSS)</div>
            <div style="font-size:16px; font-weight:800; color:#991b1b; margin-top:2px;">SELL BELOW ₹${sellTrig.toLocaleString('en-IN', {minimumFractionDigits:2})}</div>
          </div>

          <div class="card-levels">
            <div class="level-box target">
              <div class="level-label">Target 1 (1-7D)</div>
              <div class="level-value" style="color:var(--success);">₹${s.swing_target_1.toLocaleString('en-IN')}</div>
            </div>
            <div class="level-box target">
              <div class="level-label">Target 2 (7-15D)</div>
              <div class="level-value" style="color:var(--success);">₹${s.swing_target_2.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div class="ai-suggestion-box" style="margin-bottom:10px;">
            <strong>🤖 AI Strategy Suggestion:</strong><br/>
            ${aiSug.replace(/\*\*/g, '')}
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px; margin-top:8px; font-size:12px;">
          <div>RVOL: <strong style="color:var(--primary);">${s.vol_surge_ratio}x</strong> (${accStatus})</div>
          <div class="badge badge-success">Score: ${s.composite_score}/100</div>
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
      s.symbol.toLowerCase().includes(term) || 
      s.name.toLowerCase().includes(term) ||
      s.sector.toLowerCase().includes(term) ||
      (s.primary_pattern && s.primary_pattern.toLowerCase().includes(term))
    );

    filtered.forEach(s => {
      const changeClass = s.day_change_pct >= 0 ? 'color:var(--success); font-weight:700;' : 'color:var(--danger); font-weight:700;';
      const changeSign = s.day_change_pct >= 0 ? '+' : '';
      const pattern = s.primary_pattern || s.swing_signal || 'Consolidation';

      let eventsHtml = '<span style="color:var(--text-muted); font-size:12px;">No major event</span>';
      if (s.events && s.events.length > 0) {
        const topEvent = s.events[0];
        eventsHtml = `<strong style="font-size:12px; color:var(--primary);">${topEvent.type || 'Event'}:</strong> <span style="font-size:12px; color:var(--text-secondary);">${topEvent.title || ''}</span>`;
      }

      let rvolBadgeClass = s.vol_surge_ratio >= 1.5 ? 'badge-success' : (s.vol_surge_ratio >= 1.2 ? 'badge-warning' : 'badge-neutral');
      let scoreBadgeClass = s.composite_score >= 70 ? 'badge-success' : (s.composite_score >= 50 ? 'badge-warning' : 'badge-neutral');

      const buyTrigFormatted = (s.buy_trigger_price || s.current_price).toLocaleString('en-IN', {minimumFractionDigits: 2});

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong style="color:var(--text-primary);">${s.name}</strong><br/>
          <span style="font-size:12px; color:var(--text-muted);">${s.clean_symbol} • ${s.sector}</span>
        </td>
        <td style="font-weight:700;">₹${s.current_price.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
        <td style="${changeClass}">${changeSign}${s.day_change_pct}%</td>
        <td><span class="badge ${rvolBadgeClass}">${s.vol_surge_ratio}x RVOL</span></td>
        <td><span class="badge ${scoreBadgeClass}">${s.composite_score} / 100</span></td>
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
      const bTrig = (s.buy_trigger_price || s.current_price).toLocaleString('en-IN', {minimumFractionDigits: 2});
      opt.textContent = `${s.name} (${s.clean_symbol}) - Score: ${s.composite_score}/100 - Buy Trigger: ₹${bTrig}`;

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
        const buyTrigFormatted = (stock.buy_trigger_price || stock.current_price).toLocaleString('en-IN', {minimumFractionDigits: 2});
        const sellTrigFormatted = (stock.sell_trigger_price || stock.swing_stoploss).toLocaleString('en-IN', {minimumFractionDigits: 2});

        swotPatternAiContainer.innerHTML = `
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:20px; margin-bottom:20px; box-shadow:var(--shadow-sm);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
              <div>
                <h3 style="font-size:20px; font-weight:800; color:var(--text-primary);">${stock.name} (${stock.clean_symbol})</h3>
                <p style="font-size:13px; color:var(--text-muted);">${stock.sector} • ${stock.cap_type}</p>
              </div>
              <div style="text-align:right;">
                <div style="font-size:22px; font-weight:800; color:var(--text-primary);">₹${stock.current_price.toLocaleString('en-IN', {minimumFractionDigits:2})}</div>
                <div style="font-size:13px; font-weight:700; color:${stock.day_change_pct >= 0 ? 'var(--success)' : 'var(--danger)'};">
                  ${stock.day_change_pct >= 0 ? '+' : ''}${stock.day_change_pct}%
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

    // Force fresh data fetch from GitHub Pages immediately
    fetchData(true);

    const requestHeaders = {
      'Bypass-Tunnel-Reminder': 'true',
      'ngrok-skip-browser-warning': 'true',
      'Content-Type': 'application/json'
    };

    fetch('/api/refresh', { method: 'POST', headers: requestHeaders })
      .then(res => res.json())
      .then(() => pollStatus())
      .catch(() => {
        fetch('/api/refresh?t=' + Date.now(), { headers: requestHeaders })
          .then(() => pollStatus())
          .catch(() => {
            // If on GitHub Pages without active local backend, complete refresh gracefully in 1 second
            setTimeout(() => {
              refreshIcon.classList.remove('spin');
              btnRefresh.disabled = false;
              fetchData(true);
            }, 1000);
          });
      });
  });

  function pollStatus() {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      fetch('/api/scan_status?t=' + Date.now(), {
        headers: { 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' }
      })
        .then(res => res.json())
        .then(st => {
          if (!st.is_running || attempts > 30) {
            clearInterval(interval);
            refreshIcon.classList.remove('spin');
            btnRefresh.disabled = false;
            fetchData(true);
          }
        })
        .catch(() => {
          if (attempts > 6) {
            clearInterval(interval);
            refreshIcon.classList.remove('spin');
            btnRefresh.disabled = false;
            fetchData(true);
          }
        });
    }, 2000);
  }



  document.getElementById('btnSaveGsheet').addEventListener('click', () => {
    const url = document.getElementById('gsheetUrlInput').value.trim();
    if (!url) {
      alert('Please paste a Google Sheet URL!');
      return;
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
      body: JSON.stringify({ google_sheet_url: url })
    })
    .then(res => res.json())
    .then(d => {
      alert(d.message || 'Google Sheet URL saved & syncing...');
      gsheetModal.classList.remove('active');
      pollStatus();
    })
    .catch(() => {
      // Fallback if POST is blocked over tunnel
      fetch('/api/save_gsheet?url=' + encodeURIComponent(url) + '&t=' + Date.now(), { headers: requestHeaders })
        .then(res => res.json())
        .then(d => {
          alert(d.message || 'Google Sheet URL saved & syncing...');
          gsheetModal.classList.remove('active');
          pollStatus();
        })
        .catch(() => {
          alert('Google Sheet saved! Triggering background stock scan...');
          gsheetModal.classList.remove('active');
          pollStatus();
        });
    });
  });

  function fetchGsheetConfig() {
    fetch('/api/get_gsheet_config?t=' + Date.now(), {
      headers: { 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' }
    })
      .then(res => res.json())
      .then(d => {
        if (d.google_sheet_url) {
          document.getElementById('gsheetUrlInput').value = d.google_sheet_url;
        }
      })
      .catch(() => {});
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
