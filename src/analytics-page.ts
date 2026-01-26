// Analytics dashboard HTML - served at /analytics route
// Uses internal /api/analytics endpoint - no token required
export const ANALYTICS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>x402 Analytics</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --background: #0c0c0c;
      --foreground: #e8e4df;
      --card: #141414;
      --muted: #1c1c1c;
      --muted-foreground: #8a8680;
      --accent: #f97316;
      --accent-soft: rgba(249, 115, 22, 0.12);
      --border: #2a2a28;
      --border-hover: #3a3a38;
      --success: #22c55e;
      --warning: #eab308;
      --error: #ef4444;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
      font-weight: 300;
      background: var(--background);
      color: var(--foreground);
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overflow-x: hidden;
    }

    /* Subtle grain overlay */
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      opacity: 0.02;
      pointer-events: none;
      z-index: 1000;
    }

    /* Ambient glow effect - positioned differently for analytics */
    .ambient-glow {
      position: fixed;
      top: 50%;
      left: -300px;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(249, 115, 22, 0.06) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
      transform: translateY(-50%);
    }

    .ambient-glow-2 {
      position: fixed;
      bottom: -200px;
      right: -100px;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(34, 197, 94, 0.04) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    ::selection {
      background: var(--accent);
      color: var(--background);
    }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #444; }

    .container {
      max-width: 56rem;
      margin: 0 auto;
      padding: 4rem 1.5rem;
      position: relative;
      z-index: 1;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-12px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .animate-in {
      opacity: 0;
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .delay-1 { animation-delay: 0.1s; }
    .delay-2 { animation-delay: 0.2s; }
    .delay-3 { animation-delay: 0.3s; }
    .delay-4 { animation-delay: 0.4s; }
    .delay-5 { animation-delay: 0.5s; }

    /* Header */
    header {
      margin-bottom: 2.5rem;
    }

    .header-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .logo-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(249, 115, 22, 0.1) 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 500;
      letter-spacing: -0.03em;
      color: var(--foreground);
      line-height: 1.2;
    }

    h1 span {
      color: var(--accent);
    }

    .subtitle {
      color: var(--muted-foreground);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .nav-links {
      display: flex;
      gap: 0.5rem;
    }

    .nav-link {
      color: var(--muted-foreground);
      text-decoration: none;
      font-size: 0.8125rem;
      padding: 0.5rem 0.875rem;
      border-radius: 6px;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

    .nav-link:hover {
      color: var(--foreground);
      background: var(--muted);
    }

    .nav-link.active {
      color: var(--foreground);
      background: var(--card);
      border-color: var(--border);
    }

    /* Controls */
    .controls {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }

    .controls label {
      color: var(--muted-foreground);
      font-size: 0.8125rem;
    }

    .controls select {
      background: var(--muted);
      border: 1px solid var(--border);
      color: var(--foreground);
      padding: 0.625rem 1rem;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-family: 'JetBrains Mono', monospace;
      cursor: pointer;
      transition: all 0.2s;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%238a8680' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      padding-right: 2.5rem;
    }

    .controls select:hover { border-color: var(--border-hover); }
    .controls select:focus { outline: none; border-color: var(--accent); }

    .controls button {
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--muted-foreground);
      padding: 0.625rem 1.25rem;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-family: 'Poppins', sans-serif;
      font-weight: 400;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .controls button:hover {
      border-color: var(--foreground);
      color: var(--foreground);
      transform: translateY(-1px);
    }

    .controls button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    /* Status Bar */
    .status-bar {
      background: var(--card);
      padding: 0.875rem 1.25rem;
      border-radius: 10px;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid var(--border);
    }

    .status-bar .status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      color: var(--muted-foreground);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
    }

    .status-dot.loading {
      background: var(--accent);
      box-shadow: 0 0 8px rgba(249, 115, 22, 0.5);
      animation: pulse 1.5s ease-in-out infinite;
    }

    .status-dot.error {
      background: var(--error);
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.9); }
    }

    .last-updated {
      color: var(--muted-foreground);
      font-size: 0.6875rem;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Metric Cards Grid */
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 768px) {
      .grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 480px) {
      .grid { grid-template-columns: 1fr; }
    }

    .metric-card {
      background: var(--card);
      border-radius: 12px;
      padding: 1.25rem;
      border: 1px solid var(--border);
      transition: all 0.25s;
      position: relative;
    }

    .metric-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
    }

    .metric-card .label {
      color: var(--muted-foreground);
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 0.5rem;
      font-weight: 400;
    }

    .metric-card .value {
      font-size: 1.5rem;
      font-weight: 500;
      letter-spacing: -0.03em;
      color: var(--foreground);
      font-family: 'JetBrains Mono', monospace;
    }

    .metric-card .value.error { color: var(--error); }
    .metric-card .value.success { color: var(--success); }

    .metric-card .subvalue {
      font-size: 0.625rem;
      color: var(--muted-foreground);
      margin-top: 0.25rem;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Sections */
    .section {
      background: var(--card);
      border-radius: 12px;
      margin-bottom: 1.5rem;
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .section-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
      background: var(--muted);
    }

    .section h2 {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--foreground);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section h2::before {
      content: '';
      display: block;
      width: 4px;
      height: 14px;
      background: var(--accent);
      border-radius: 2px;
    }

    /* Two Column Layout */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    @media (max-width: 768px) {
      .two-col { grid-template-columns: 1fr; }
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }

    th, td {
      padding: 0.875rem 1.25rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    th {
      color: var(--muted-foreground);
      font-weight: 400;
      text-transform: uppercase;
      font-size: 0.5625rem;
      letter-spacing: 0.08em;
      background: var(--background);
    }

    tr:last-child td { border-bottom: none; }

    tr { transition: background 0.15s; }

    tbody tr:hover { background: var(--muted); }

    td { color: var(--foreground); }

    .mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.5625rem;
      font-weight: 500;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
    }

    .badge.success {
      background: rgba(34, 197, 94, 0.12);
      color: var(--success);
    }

    .badge.error {
      background: rgba(239, 68, 68, 0.12);
      color: var(--error);
    }

    .badge.warning {
      background: rgba(234, 179, 8, 0.12);
      color: var(--warning);
    }

    .badge.info {
      background: var(--accent-soft);
      color: var(--accent);
    }

    /* Progress Bars */
    .progress-bar {
      height: 4px;
      background: var(--muted);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 0.5rem;
    }

    .progress-bar .fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .fill.green { background: var(--success); }
    .fill.red { background: var(--error); }
    .fill.orange { background: var(--accent); }

    /* Error Message */
    .error-message {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 10px;
      padding: 1rem 1.25rem;
      color: var(--error);
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .error-message::before {
      content: '⚠';
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 2.5rem 1.5rem;
      color: var(--muted-foreground);
    }

    .empty-state-icon {
      font-size: 1.5rem;
      margin-bottom: 0.75rem;
      opacity: 0.5;
    }

    /* Footer link */
    .footer-link {
      margin-top: 2rem;
      text-align: center;
    }

    .footer-link a {
      color: var(--muted-foreground);
      text-decoration: none;
      font-size: 0.8125rem;
      transition: color 0.2s;
    }

    .footer-link a:hover {
      color: var(--accent);
    }

    /* Status color indicators in tables */
    .status-2xx { color: var(--success); }
    .status-4xx { color: var(--warning); }
    .status-5xx { color: var(--error); }
  </style>
</head>
<body>
  <div class="ambient-glow"></div>
  <div class="ambient-glow-2"></div>

  <div class="container">
    <header class="animate-in">
      <div class="header-top">
        <div class="header-content">
          <div class="logo-icon">📊</div>
          <div>
            <h1>x402 <span>Analytics</span></h1>
            <p class="subtitle">Worker performance metrics</p>
          </div>
        </div>
        <nav class="nav-links">
          <a href="/earnings" class="nav-link">Earnings</a>
          <a href="/analytics" class="nav-link active">Analytics</a>
        </nav>
      </div>
      <div class="controls">
        <label for="timeRange">Range</label>
        <select id="timeRange" onchange="fetchAnalytics()">
          <option value="1">1 hour</option>
          <option value="6">6 hours</option>
          <option value="24">24 hours</option>
          <option value="72">3 days</option>
          <option value="168" selected>7 days</option>
          <option value="720">30 days</option>
        </select>
        <button onclick="fetchAnalytics()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Refresh
        </button>
      </div>
    </header>

    <div class="status-bar animate-in delay-1">
      <div class="status">
        <div id="statusDot" class="status-dot loading"></div>
        <span id="statusText">Loading...</span>
      </div>
      <span id="lastUpdated" class="last-updated"></span>
    </div>

    <div id="errorContainer"></div>

    <!-- Summary Metrics -->
    <div class="grid animate-in delay-1">
      <div class="metric-card">
        <div class="label">Total Requests</div>
        <div class="value" id="totalRequests">—</div>
      </div>
      <div class="metric-card">
        <div class="label">Total Errors</div>
        <div class="value error" id="totalErrors">—</div>
      </div>
      <div class="metric-card">
        <div class="label">Success Rate</div>
        <div class="value success" id="successRate">—</div>
      </div>
      <div class="metric-card">
        <div class="label">Subrequests</div>
        <div class="value" id="totalSubrequests">—</div>
        <div class="subvalue" id="subrequestRatio">—</div>
      </div>
      <div class="metric-card">
        <div class="label">CPU P50</div>
        <div class="value" id="cpuTimeP50">—</div>
      </div>
      <div class="metric-card">
        <div class="label">CPU P99</div>
        <div class="value" id="cpuTimeP99">—</div>
      </div>
    </div>

    <div class="two-col animate-in delay-2">
      <!-- Status Breakdown -->
      <div class="section">
        <div class="section-header">
          <h2>Status</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Requests</th>
              <th>Errors</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody id="statusTable">
            <tr><td colspan="4" class="empty-state">
              <div class="empty-state-icon">⏳</div>
              Loading...
            </td></tr>
          </tbody>
        </table>
      </div>

      <!-- Subrequest Origins -->
      <div class="section">
        <div class="section-header">
          <h2>Origins</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Host</th>
              <th>Reqs</th>
              <th>2xx</th>
              <th>4xx</th>
              <th>5xx</th>
              <th>Avg</th>
              <th>Cache</th>
            </tr>
          </thead>
          <tbody id="originsTable">
            <tr><td colspan="7" class="empty-state">
              <div class="empty-state-icon">🌐</div>
              Loading...
            </td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Endpoint Stats -->
    <div class="section animate-in delay-3">
      <div class="section-header">
        <h2>Endpoints</h2>
      </div>
      <table>
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Requests</th>
            <th>Errors</th>
            <th>Rate</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody id="endpointsTable">
          <tr><td colspan="5" class="empty-state">
            <div class="empty-state-icon">🔗</div>
            Loading...
          </td></tr>
        </tbody>
      </table>
    </div>

    <div class="footer-link animate-in delay-4">
      <a href="/">← Back to API</a>
    </div>
  </div>

  <script>
    function formatDuration(microseconds) {
      if (!microseconds || microseconds === 0) return '0 us';
      if (microseconds < 1000) return microseconds.toFixed(0) + ' us';
      if (microseconds < 1000000) return (microseconds / 1000).toFixed(2) + ' ms';
      return (microseconds / 1000000).toFixed(2) + ' s';
    }

    function formatNumber(num) { return (num || 0).toLocaleString('en-US'); }

    function setStatus(status, text) {
      document.getElementById('statusDot').className = 'status-dot ' + status;
      document.getElementById('statusText').textContent = text;
    }

    function showError(message) {
      document.getElementById('errorContainer').innerHTML = '<div class="error-message">' + message + '</div>';
    }

    function clearError() { document.getElementById('errorContainer').innerHTML = ''; }

    async function fetchAnalytics() {
      setStatus('loading', 'Fetching analytics...');
      clearError();

      var hours = document.getElementById('timeRange').value;

      try {
        var response = await fetch('/api/analytics?hours=' + hours);
        var data = await response.json();

        if (!data.success) {
          showError('Error: ' + (data.error || 'Unknown error'));
          setStatus('error', 'Error');
          return;
        }

        // Update summary cards
        var summary = data.summary || {};
        document.getElementById('totalRequests').textContent = formatNumber(summary.requests);
        document.getElementById('totalErrors').textContent = formatNumber(summary.errors);
        document.getElementById('successRate').textContent = summary.successRate || '—';
        document.getElementById('totalSubrequests').textContent = formatNumber(summary.subrequests);
        document.getElementById('subrequestRatio').textContent = summary.subrequestRatio || '—';
        document.getElementById('cpuTimeP50').textContent = formatDuration(summary.cpuTimeP50);
        document.getElementById('cpuTimeP99').textContent = formatDuration(summary.cpuTimeP99);

        // Render status breakdown
        var statusTable = document.getElementById('statusTable');
        var statusData = data.statusBreakdown || [];
        if (statusData.length > 0) {
          statusTable.innerHTML = statusData.map(function(s) {
            var badgeClass = (s.status === 'ok' || s.status === 'success') ? 'success' : (s.status === 'error' ? 'error' : 'warning');
            return '<tr>' +
              '<td><span class="badge ' + badgeClass + '">' + s.status + '</span></td>' +
              '<td class="mono">' + formatNumber(s.requests) + '</td>' +
              '<td class="mono">' + formatNumber(s.errors) + '</td>' +
              '<td class="mono">' + s.errorRate + '</td>' +
              '</tr>';
          }).join('');
        } else {
          statusTable.innerHTML = '<tr><td colspan="4" class="empty-state"><div class="empty-state-icon">📭</div>No status data</td></tr>';
        }

        // Render origins (subrequest targets from Cloudflare)
        var originsTable = document.getElementById('originsTable');
        var originsData = data.origins || [];
        if (originsData.length > 0) {
          originsTable.innerHTML = originsData.map(function(o) {
            return '<tr>' +
              '<td class="mono">' + o.hostname + '</td>' +
              '<td class="mono">' + formatNumber(o.requests) + '</td>' +
              '<td class="mono status-2xx">' + formatNumber(o.status['2xx']) + '</td>' +
              '<td class="mono status-4xx">' + formatNumber(o.status['4xx']) + '</td>' +
              '<td class="mono status-5xx">' + formatNumber(o.status['5xx']) + '</td>' +
              '<td class="mono">' + o.avgResponseTime + '</td>' +
              '<td class="mono">' + o.cacheRate + '</td>' +
              '</tr>';
          }).join('');
        } else {
          originsTable.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">🌐</div>No subrequest data</td></tr>';
        }

        // Render endpoint stats (in-memory tracking)
        var endpointsTable = document.getElementById('endpointsTable');
        var endpointData = data.endpointStats?.endpoints || [];
        if (endpointData.length > 0) {
          endpointsTable.innerHTML = endpointData.map(function(e) {
            var errorClass = e.errors > 0 ? ' status-5xx' : '';
            return '<tr>' +
              '<td class="mono">' + e.endpoint + '</td>' +
              '<td class="mono">' + formatNumber(e.requests) + '</td>' +
              '<td class="mono' + errorClass + '">' + formatNumber(e.errors) + '</td>' +
              '<td class="mono">' + e.errorRate + '</td>' +
              '<td class="mono">' + e.avgDuration + ' ms</td>' +
              '</tr>';
          }).join('');
        } else {
          endpointsTable.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-state-icon">🔗</div>No endpoint data yet</td></tr>';
        }

        setStatus('', 'Updated');
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();

      } catch (error) {
        console.error('Fetch error:', error);
        showError('Failed to fetch analytics: ' + error.message);
        setStatus('error', 'Fetch failed');
      }
    }

    // Initial fetch
    fetchAnalytics();

    // Auto-refresh every 30 seconds
    setInterval(fetchAnalytics, 30 * 1000);
  </script>
</body>
</html>`;
