// Earnings dashboard HTML - served at /earnings route
// Queries Hiro API for transaction history and displays x402 payment earnings
export const EARNINGS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>x402 Earnings</title>
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

    /* Ambient glow effect */
    .ambient-glow {
      position: fixed;
      top: -200px;
      right: -200px;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(249, 115, 22, 0.08) 0%, transparent 70%);
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

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-8px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes countUp {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .animate-in {
      opacity: 0;
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .delay-1 { animation-delay: 0.1s; }
    .delay-2 { animation-delay: 0.2s; }
    .delay-3 { animation-delay: 0.3s; }
    .delay-4 { animation-delay: 0.4s; }

    /* Header */
    header {
      margin-bottom: 3.5rem;
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
      background: var(--accent-soft);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      border: 1px solid rgba(249, 115, 22, 0.2);
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

    .controls button:active {
      transform: translateY(0);
    }

    /* Summary Cards */
    .summary {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 768px) {
      .summary { grid-template-columns: 1fr; }
    }

    .summary-card {
      background: var(--card);
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid var(--border);
      transition: all 0.25s;
      position: relative;
      overflow: hidden;
    }

    .summary-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: transparent;
      transition: background 0.25s;
    }

    .summary-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
    }

    .summary-card.highlight {
      background: linear-gradient(135deg, var(--card) 0%, rgba(249, 115, 22, 0.08) 100%);
      border-color: rgba(249, 115, 22, 0.3);
    }

    .summary-card.highlight::before {
      background: linear-gradient(90deg, var(--accent), rgba(249, 115, 22, 0.3));
    }

    .summary-card .label {
      color: var(--muted-foreground);
      font-size: 0.6875rem;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
      letter-spacing: 0.08em;
      font-weight: 400;
    }

    .summary-card .value {
      font-size: 2rem;
      font-weight: 500;
      letter-spacing: -0.03em;
      color: var(--foreground);
      font-family: 'JetBrains Mono', monospace;
    }

    .summary-card.highlight .value {
      color: var(--accent);
      text-shadow: 0 0 40px rgba(249, 115, 22, 0.3);
    }

    .summary-card .value small {
      font-size: 0.875rem;
      font-weight: 400;
      opacity: 0.7;
      margin-left: 0.25rem;
    }

    .summary-card .subvalue {
      font-size: 0.6875rem;
      color: var(--muted-foreground);
      margin-top: 0.25rem;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Section */
    .section {
      background: var(--card);
      border-radius: 12px;
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background: var(--muted);
    }

    .section h2 {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--foreground);
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .section h2::before {
      content: '';
      display: block;
      width: 4px;
      height: 16px;
      background: var(--accent);
      border-radius: 2px;
    }

    .status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--muted-foreground);
      font-size: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
    }

    .dot.loading {
      background: var(--accent);
      box-shadow: 0 0 8px rgba(249, 115, 22, 0.5);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.9); }
    }

    .section-body {
      padding: 0;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }

    th, td {
      padding: 1rem 1.5rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    th {
      color: var(--muted-foreground);
      font-weight: 400;
      text-transform: uppercase;
      font-size: 0.6875rem;
      letter-spacing: 0.06em;
      background: var(--background);
    }

    tr:last-child td { border-bottom: none; }

    tr {
      transition: background 0.15s;
    }

    tbody tr:hover {
      background: var(--muted);
    }

    .mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      font-size: 0.6875rem;
      font-weight: 500;
      font-family: 'JetBrains Mono', monospace;
    }

    .badge.success {
      background: rgba(34, 197, 94, 0.12);
      color: var(--success);
    }

    .badge.amount {
      background: var(--accent-soft);
      color: var(--accent);
      font-weight: 500;
    }

    /* Links */
    .tx-link {
      color: var(--muted-foreground);
      text-decoration: none;
      transition: color 0.2s;
      position: relative;
    }

    .tx-link::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 0;
      height: 1px;
      background: var(--foreground);
      transition: width 0.2s;
    }

    .tx-link:hover {
      color: var(--foreground);
    }

    .tx-link:hover::after {
      width: 100%;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--muted-foreground);
    }

    .empty-state-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    /* Error */
    .error {
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

    .error::before {
      content: '⚠';
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
  </style>
</head>
<body>
  <div class="ambient-glow"></div>

  <div class="container">
    <header class="animate-in">
      <div class="header-top">
        <div class="header-content">
          <div class="logo-icon">💰</div>
          <div>
            <h1>x402 <span>Earnings</span></h1>
            <p class="subtitle">Payment transaction history</p>
          </div>
        </div>
        <nav class="nav-links">
          <a href="/earnings" class="nav-link active">Earnings</a>
          <a href="/analytics" class="nav-link">Analytics</a>
        </nav>
      </div>
      <div class="controls">
        <select id="limit" onchange="fetchEarnings()">
          <option value="25">25 transactions</option>
          <option value="50" selected>50 transactions</option>
          <option value="100">100 transactions</option>
          <option value="150">150 transactions</option>
        </select>
        <button onclick="fetchEarnings()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Refresh
        </button>
      </div>
    </header>

    <div id="error"></div>

    <div class="summary animate-in delay-1">
      <div class="summary-card highlight">
        <div class="label">Total Earnings</div>
        <div class="value" id="totalEarnings">—<small>STX</small></div>
      </div>
      <div class="summary-card">
        <div class="label">Total Payments</div>
        <div class="value" id="paymentCount">—</div>
        <div class="subvalue" id="paymentsShown">—</div>
      </div>
      <div class="summary-card">
        <div class="label">Wallet</div>
        <div class="value mono" id="wallet" style="font-size: 0.8rem;">—</div>
      </div>
    </div>

    <div class="section animate-in delay-2">
      <div class="section-header">
        <h2>Transactions</h2>
        <div class="status">
          <div class="dot" id="statusDot"></div>
          <span id="statusText">Loading...</span>
        </div>
      </div>
      <div class="section-body">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Amount</th>
              <th>From</th>
              <th>TX ID</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="txTable">
            <tr><td colspan="5" class="empty-state">
              <div class="empty-state-icon">📊</div>
              Loading transactions...
            </td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer-link animate-in delay-3">
      <a href="/">← Back to API</a>
    </div>
  </div>

  <script>
    function formatSTX(microStx) {
      var stx = microStx / 1000000;
      return stx.toFixed(stx < 1 ? 6 : 2);
    }

    function truncate(str, start, end) {
      if (!str || str.length < start + end + 3) return str;
      if (end === 0) return str.slice(0, start) + '...';
      return str.slice(0, start) + '...' + str.slice(-end);
    }

    function formatTime(ts) {
      return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function setStatus(loading, text) {
      document.getElementById('statusDot').className = 'dot' + (loading ? ' loading' : '');
      document.getElementById('statusText').textContent = text;
    }

    var SERVER_ADDRESS = '{{SERVER_ADDRESS}}';
    var HIRO_API = 'https://api.hiro.so/extended/v1';

    async function fetchEarnings() {
      if (!SERVER_ADDRESS || SERVER_ADDRESS === '{{SERVER_ADDRESS}}') {
        document.getElementById('error').innerHTML = '<div class="error">SERVER_ADDRESS not configured</div>';
        setStatus(false, 'Not configured');
        return;
      }
      setStatus(true, 'Fetching...');
      document.getElementById('error').innerHTML = '';

      var displayLimit = parseInt(document.getElementById('limit').value, 10);

      try {
        // Fetch transactions and balance in parallel directly from Hiro API
        var [txRes, balRes] = await Promise.all([
          fetch(HIRO_API + '/address/' + SERVER_ADDRESS + '/transactions?limit=' + displayLimit),
          fetch(HIRO_API + '/address/' + SERVER_ADDRESS + '/balances')
        ]);

        if (!txRes.ok) throw new Error('Failed to fetch transactions: ' + txRes.status);
        if (!balRes.ok) throw new Error('Failed to fetch balance: ' + balRes.status);

        var [txData, balData] = await Promise.all([txRes.json(), balRes.json()]);

        var balance = parseInt(balData.stx?.balance || '0', 10);
        var totalAvailable = txData.total || 0;

        // Filter for incoming STX transfers
        var payments = (txData.results || [])
          .filter(function(tx) {
            return tx.tx_type === 'token_transfer' &&
                   tx.tx_status === 'success' &&
                   tx.token_transfer?.recipient_address === SERVER_ADDRESS;
          })
          .map(function(tx) {
            return {
              txId: tx.tx_id,
              timestamp: tx.burn_block_time_iso,
              amount: parseInt(tx.token_transfer.amount, 10),
              sender: tx.sender_address,
              status: tx.tx_status
            };
          });

        document.getElementById('totalEarnings').innerHTML = formatSTX(balance) + '<small>STX</small>';
        document.getElementById('paymentCount').textContent = payments.length + (totalAvailable > displayLimit ? '+' : '');
        document.getElementById('paymentsShown').textContent = 'of ' + totalAvailable + ' txs';
        document.getElementById('wallet').textContent = truncate(SERVER_ADDRESS, 8, 6);

        var tbody = document.getElementById('txTable');

        if (payments.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-state-icon">📭</div>No payments found</td></tr>';
        } else {
          tbody.innerHTML = payments.map(function(tx) {
            return '<tr>' +
              '<td>' + formatTime(tx.timestamp) + '</td>' +
              '<td><span class="badge amount">' + formatSTX(tx.amount) + ' STX</span></td>' +
              '<td><a href="https://explorer.hiro.so/address/' + tx.sender + '?chain=mainnet" target="_blank" class="tx-link mono">' + truncate(tx.sender, 8, 6) + '</a></td>' +
              '<td><a href="https://explorer.hiro.so/txid/' + tx.txId + '?chain=mainnet" target="_blank" class="tx-link mono">' + truncate(tx.txId, 10, 0) + '</a></td>' +
              '<td><span class="badge success">✓ ' + tx.status + '</span></td>' +
              '</tr>';
          }).join('');
        }

        setStatus(false, 'Updated ' + new Date().toLocaleTimeString());

      } catch (err) {
        document.getElementById('error').innerHTML = '<div class="error">Failed: ' + err.message + '</div>';
        setStatus(false, 'Error');
      }
    }

    fetchEarnings();
    setInterval(fetchEarnings, 60000);
  </script>
</body>
</html>`;
