// Earnings dashboard HTML - served at /earnings route
// Queries Hiro API for transaction history and displays x402 payment earnings
export const EARNINGS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>x402-api Earnings</title>
  <style>
    :root {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-tertiary: #334155;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --accent-blue: #3b82f6;
      --accent-green: #22c55e;
      --accent-orange: #f97316;
      --border-color: #475569;
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
    .stx { color: var(--accent-orange); }

    .controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .controls select, .controls button {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    }

    .controls button { background: var(--accent-blue); border: none; font-weight: 500; }
    .controls button:hover { background: #2563eb; }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid var(--border-color);
    }

    .summary-card.highlight { border-color: var(--accent-orange); }
    .summary-card .label { color: var(--text-secondary); font-size: 12px; text-transform: uppercase; margin-bottom: 8px; }
    .summary-card .value { font-size: 24px; font-weight: 700; }
    .summary-card .value.stx { color: var(--accent-orange); }

    .section {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid var(--border-color);
    }

    .section h2 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section h2::before {
      content: '';
      width: 4px;
      height: 16px;
      background: var(--accent-orange);
      border-radius: 2px;
    }

    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); }
    th { color: var(--text-secondary); font-weight: 500; text-transform: uppercase; font-size: 11px; background: var(--bg-tertiary); }
    th:first-child { border-radius: 6px 0 0 0; }
    th:last-child { border-radius: 0 6px 0 0; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(249, 115, 22, 0.05); }

    .mono { font-family: 'SF Mono', Consolas, monospace; font-size: 13px; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge.success { background: rgba(34, 197, 94, 0.2); color: var(--accent-green); }
    .badge.amount { background: rgba(249, 115, 22, 0.2); color: var(--accent-orange); }

    .tx-link { color: var(--accent-blue); text-decoration: none; }
    .tx-link:hover { text-decoration: underline; }

    .empty-state { text-align: center; padding: 40px; color: var(--text-secondary); }
    .error { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; padding: 16px; color: #ef4444; margin-bottom: 16px; }
    .status { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 13px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-green); }
    .dot.loading { background: #eab308; animation: pulse 1s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>x402 Earnings</h1>
      <div class="controls">
        <select id="limit" onchange="fetchEarnings()">
          <option value="25">25 transactions</option>
          <option value="50" selected>50 transactions</option>
          <option value="100">100 transactions</option>
          <option value="150">150 transactions</option>
        </select>
        <button onclick="fetchEarnings()">Refresh</button>
      </div>
    </header>

    <div id="error"></div>

    <div class="summary">
      <div class="summary-card highlight">
        <div class="label">Total Earnings</div>
        <div class="value stx" id="totalEarnings">-</div>
      </div>
      <div class="summary-card">
        <div class="label">Balance</div>
        <div class="value stx" id="balance">-</div>
      </div>
      <div class="summary-card">
        <div class="label">Payments</div>
        <div class="value" id="paymentCount">-</div>
      </div>
      <div class="summary-card">
        <div class="label">Wallet</div>
        <div class="value mono" id="wallet" style="font-size: 12px;">-</div>
      </div>
    </div>

    <div class="section">
      <h2>Payment Transactions</h2>
      <div class="status" style="margin-bottom: 16px;">
        <div class="dot" id="statusDot"></div>
        <span id="statusText">Loading...</span>
      </div>
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
          <tr><td colspan="5" class="empty-state">Loading...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    function formatSTX(microStx) {
      return (microStx / 1000000).toFixed(6) + ' STX';
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

    // Server address is injected by the worker
    var SERVER_ADDRESS = '{{SERVER_ADDRESS}}';

    async function fetchEarnings() {
      if (!SERVER_ADDRESS || SERVER_ADDRESS === '{{SERVER_ADDRESS}}') {
        document.getElementById('error').innerHTML = '<div class="error">SERVER_ADDRESS not configured</div>';
        setStatus(false, 'Not configured');
        return;
      }
      setStatus(true, 'Fetching...');
      document.getElementById('error').innerHTML = '';

      var limit = parseInt(document.getElementById('limit').value, 10);

      try {
        // Fetch directly from Hiro API (paginate if needed, max 50 per request)
        var allTxs = [];
        var offset = 0;
        var HIRO_MAX = 50;

        while (allTxs.length < limit) {
          var fetchLimit = Math.min(HIRO_MAX, limit - allTxs.length);
          var txUrl = 'https://api.hiro.so/extended/v1/address/' + SERVER_ADDRESS + '/transactions?limit=' + fetchLimit + '&offset=' + offset;

          var txRes = await fetch(txUrl);
          if (!txRes.ok) throw new Error('Hiro API error: ' + txRes.status);

          var txData = await txRes.json();
          if (!txData.results || txData.results.length === 0) break;

          allTxs = allTxs.concat(txData.results);
          offset += txData.results.length;

          if (allTxs.length >= txData.total) break;
        }

        // Fetch balance
        var balRes = await fetch('https://api.hiro.so/extended/v1/address/' + SERVER_ADDRESS + '/balances');
        if (!balRes.ok) throw new Error('Balance API error: ' + balRes.status);
        var balData = await balRes.json();
        var balance = parseInt(balData.stx.balance, 10);

        // Deduplicate by tx_id
        var seen = {};
        var uniqueTxs = allTxs.filter(function(tx) {
          if (seen[tx.tx_id]) return false;
          seen[tx.tx_id] = true;
          return true;
        });

        // Filter for incoming token transfers
        var payments = uniqueTxs
          .filter(function(tx) {
            return tx.tx_type === 'token_transfer' &&
                   tx.tx_status === 'success' &&
                   tx.token_transfer &&
                   tx.token_transfer.recipient_address === SERVER_ADDRESS;
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

        var totalEarnings = payments.reduce(function(sum, p) { return sum + p.amount; }, 0);

        document.getElementById('totalEarnings').textContent = formatSTX(totalEarnings);
        document.getElementById('balance').textContent = formatSTX(balance);
        document.getElementById('paymentCount').textContent = payments.length;
        document.getElementById('wallet').textContent = truncate(SERVER_ADDRESS, 8, 6);

        var tbody = document.getElementById('txTable');

        if (payments.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No payments found</td></tr>';
        } else {
          tbody.innerHTML = payments.map(function(tx) {
            return '<tr>' +
              '<td>' + formatTime(tx.timestamp) + '</td>' +
              '<td><span class="badge amount">' + formatSTX(tx.amount) + '</span></td>' +
              '<td><a href="https://explorer.hiro.so/address/' + tx.sender + '?chain=mainnet" target="_blank" class="tx-link mono">' + truncate(tx.sender, 8, 6) + '</a></td>' +
              '<td><a href="https://explorer.hiro.so/txid/' + tx.txId + '?chain=mainnet" target="_blank" class="tx-link mono">' + truncate(tx.txId, 10, 0) + '</a></td>' +
              '<td><span class="badge success">' + tx.status + '</span></td>' +
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
