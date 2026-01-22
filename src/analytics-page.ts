// Analytics dashboard HTML - served at /analytics route
// Uses internal /api/analytics endpoint - no token required
export const ANALYTICS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>x402-api Worker Analytics</title>
  <style>
    :root {
      --bg-primary: #000;
      --bg-secondary: #0a0a0a;
      --bg-tertiary: #111;
      --text-primary: #fafafa;
      --text-secondary: #888;
      --border-color: #333;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      padding: 20px;
    }

    .container { max-width: 1400px; margin: 0 auto; }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
      flex-wrap: wrap;
      gap: 16px;
    }

    h1 { font-size: 24px; font-weight: 600; }
    .worker-name { color: #fff; }

    .controls {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .controls label { color: var(--text-secondary); font-size: 14px; }

    .controls select {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
    }

    .controls button {
      background: #fff;
      color: #000;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    .controls button:hover { background: #eee; }
    .controls button:disabled { background: var(--bg-tertiary); color: #666; cursor: not-allowed; }

    .status-bar {
      background: var(--bg-secondary);
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      border: 1px solid var(--border-color);
    }

    .status-bar .status { display: flex; align-items: center; gap: 8px; }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #fff;
    }

    .status-dot.loading { background: #888; animation: pulse 1s infinite; }
    .status-dot.error { background: #ff0000; }

    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 20px;
      border: 1px solid var(--border-color);
    }

    .metric-card .label {
      color: var(--text-secondary);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .metric-card .value {
      font-size: 24px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .metric-card .value.error { color: #ff6666; }
    .metric-card .value.success { color: #fff; }
    .metric-card .subvalue { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }

    .section {
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
      border: 1px solid var(--border-color);
    }

    .section h2 {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 16px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); }

    th {
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }

    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--bg-tertiary); }
    td { color: var(--text-primary); }

    .mono { font-family: 'SF Mono', Consolas, monospace; font-size: 13px; }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .badge.success { background: #111; color: #fff; border: 1px solid #333; }
    .badge.error { background: #1a0000; color: #ff6666; border: 1px solid #330000; }
    .badge.warning { background: #1a1a00; color: #ffcc00; border: 1px solid #333300; }
    .badge.info { background: #111; color: #fff; border: 1px solid #333; }

    .progress-bar {
      height: 6px;
      background: var(--bg-tertiary);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 8px;
    }

    .progress-bar .fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
    .fill.blue { background: #fff; }
    .fill.green { background: #fff; }
    .fill.red { background: #ff6666; }
    .fill.purple { background: #888; }

    .error-message {
      background: #1a0000;
      border: 1px solid #ff0000;
      border-radius: 8px;
      padding: 16px;
      color: #ff6666;
      margin-bottom: 16px;
    }

    .empty-state { text-align: center; padding: 40px; color: var(--text-secondary); }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Worker Analytics: x402-api</h1>
      <div class="controls">
        <label for="timeRange">Time Range:</label>
        <select id="timeRange" onchange="fetchAnalytics()">
          <option value="1">Last 1 hour</option>
          <option value="6">Last 6 hours</option>
          <option value="24">Last 24 hours</option>
          <option value="72">Last 3 days</option>
          <option value="168" selected>Last 7 days</option>
          <option value="720">Last 30 days</option>
        </select>
        <button onclick="fetchAnalytics()">Refresh</button>
      </div>
    </header>

    <div class="status-bar">
      <div class="status">
        <div id="statusDot" class="status-dot loading"></div>
        <span id="statusText">Loading...</span>
      </div>
      <span id="lastUpdated" style="color: var(--text-secondary); font-size: 13px;"></span>
    </div>

    <div id="errorContainer"></div>

    <!-- Summary Metrics -->
    <div class="grid">
      <div class="metric-card">
        <div class="label">Total Requests</div>
        <div class="value" id="totalRequests">-</div>
      </div>
      <div class="metric-card">
        <div class="label">Total Errors</div>
        <div class="value error" id="totalErrors">-</div>
      </div>
      <div class="metric-card">
        <div class="label">Success Rate</div>
        <div class="value success" id="successRate">-</div>
      </div>
      <div class="metric-card">
        <div class="label">Subrequests</div>
        <div class="value" id="totalSubrequests">-</div>
        <div class="subvalue" id="subrequestRatio">-</div>
      </div>
      <div class="metric-card">
        <div class="label">CPU Time P50</div>
        <div class="value" id="cpuTimeP50">-</div>
      </div>
      <div class="metric-card">
        <div class="label">CPU Time P99</div>
        <div class="value" id="cpuTimeP99">-</div>
      </div>
    </div>

    <div class="two-col">
      <!-- Status Breakdown -->
      <div class="section">
        <h2>Status Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Requests</th>
              <th>Errors</th>
              <th>Error Rate</th>
            </tr>
          </thead>
          <tbody id="statusTable">
            <tr><td colspan="4" class="empty-state">Loading...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Subrequest Origins -->
      <div class="section">
        <h2>Subrequest Origins</h2>
        <table>
          <thead>
            <tr>
              <th>Origin</th>
              <th>Requests</th>
              <th>2xx</th>
              <th>4xx</th>
              <th>5xx</th>
              <th>Avg Response</th>
              <th>Cache</th>
            </tr>
          </thead>
          <tbody id="originsTable">
            <tr><td colspan="7" class="empty-state">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Endpoint Stats (persistent via KV) -->
    <div class="section">
      <h2>Endpoint Stats</h2>
      <table>
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Requests</th>
            <th>Errors</th>
            <th>Error Rate</th>
            <th>Avg Duration</th>
          </tr>
        </thead>
        <tbody id="endpointsTable">
          <tr><td colspan="5" class="empty-state">Loading...</td></tr>
        </tbody>
      </table>
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
        document.getElementById('successRate').textContent = summary.successRate || '-';
        document.getElementById('totalSubrequests').textContent = formatNumber(summary.subrequests);
        document.getElementById('subrequestRatio').textContent = summary.subrequestRatio || '-';
        document.getElementById('cpuTimeP50').textContent = formatDuration(summary.cpuTimeP50);
        document.getElementById('cpuTimeP99').textContent = formatDuration(summary.cpuTimeP99);

        // Render status breakdown
        var statusTable = document.getElementById('statusTable');
        var statusData = data.statusBreakdown || [];
        if (statusData.length > 0) {
          statusTable.innerHTML = statusData.map(function(s) {
            var badgeClass = (s.status === 'ok' || s.status === 'success') ? 'success' : (s.status === 'error' ? 'error' : 'warning');
            return '<tr><td><span class="badge ' + badgeClass + '">' + s.status + '</span></td><td class="mono">' + formatNumber(s.requests) + '</td><td class="mono">' + formatNumber(s.errors) + '</td><td>' + s.errorRate + '</td></tr>';
          }).join('');
        } else {
          statusTable.innerHTML = '<tr><td colspan="4" class="empty-state">No status data</td></tr>';
        }

        // Render origins (subrequest targets from Cloudflare)
        var originsTable = document.getElementById('originsTable');
        var originsData = data.origins || [];
        if (originsData.length > 0) {
          originsTable.innerHTML = originsData.map(function(o) {
            return '<tr>' +
              '<td class="mono">' + o.hostname + '</td>' +
              '<td class="mono">' + formatNumber(o.requests) + '</td>' +
              '<td class="mono">' + formatNumber(o.status['2xx']) + '</td>' +
              '<td class="mono" style="color: #888;">' + formatNumber(o.status['4xx']) + '</td>' +
              '<td class="mono" style="color: #ff6666;">' + formatNumber(o.status['5xx']) + '</td>' +
              '<td class="mono">' + o.avgResponseTime + '</td>' +
              '<td class="mono">' + o.cacheRate + '</td>' +
              '</tr>';
          }).join('');
        } else {
          originsTable.innerHTML = '<tr><td colspan="7" class="empty-state">No subrequest data</td></tr>';
        }

        // Render endpoint stats (in-memory tracking)
        var endpointsTable = document.getElementById('endpointsTable');
        var endpointData = data.endpointStats?.endpoints || [];
        if (endpointData.length > 0) {
          endpointsTable.innerHTML = endpointData.map(function(e) {
            var errorClass = e.errors > 0 ? ' style="color: #ff6666;"' : '';
            return '<tr>' +
              '<td class="mono">' + e.endpoint + '</td>' +
              '<td class="mono">' + formatNumber(e.requests) + '</td>' +
              '<td class="mono"' + errorClass + '>' + formatNumber(e.errors) + '</td>' +
              '<td class="mono">' + e.errorRate + '</td>' +
              '<td class="mono">' + e.avgDuration + ' ms</td>' +
              '</tr>';
          }).join('');
        } else {
          endpointsTable.innerHTML = '<tr><td colspan="5" class="empty-state">No endpoint data yet</td></tr>';
        }

        setStatus('', 'Updated');
        document.getElementById('lastUpdated').textContent = 'Last updated: ' + new Date().toLocaleString();

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
