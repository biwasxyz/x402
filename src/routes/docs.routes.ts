import { Router, Request, Response } from "express";

const router = Router();

/**
 * @route   GET /
 * @desc    API Documentation
 * @access  Public
 */
router.get("/", (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.json({
    name: "x402-stacks API",
    version: "1.0.0",
    description: "Payment-protected API services for Stacks blockchain",
    documentation: `${baseUrl}/docs`,
    endpoints: {
      health: {
        path: "/health",
        method: "GET",
        description: "Health check endpoint",
        cost: "Free"
      },
      news: {
        path: "/api/news",
        method: "GET",
        description: "Get latest Stacks & Bitcoin news powered by Grok AI",
        cost: "0.001 STX",
        payment: "Required via x402 protocol"
      },
      audit: {
        path: "/api/audit",
        method: "POST",
        description: "Comprehensive Clarity smart contract security audit",
        cost: "0.02 STX",
        payment: "Required via x402 protocol",
        body: {
          contractIdentifier: "SP000...CONTRACT_NAME"
        }
      },
      walletClassifier: {
        path: "/api/wallet/classify",
        method: "POST",
        description: "Classify wallet behavior as trader, dao, bridge, bot, or whale",
        cost: "0.005 STX",
        payment: "Required via x402 protocol",
        body: {
          address: "SP... or SM..."
        }
      },
      userResearch: {
        path: "/api/research/user",
        method: "POST",
        description: "Research a user using AI with real-time web search",
        cost: "0.005 STX",
        payment: "Required via x402 protocol",
        body: {
          username: "@username or username"
        }
      }
    },
    payment: {
      protocol: "x402",
      network: process.env.NETWORK || "testnet",
      paymentAddress: process.env.SERVER_ADDRESS || "ST...",
      facilitator: process.env.FACILITATOR_URL || "https://facilitator.x402stacks.xyz",
      info: "All paid endpoints require x402 payment verification"
    },
    links: {
      documentation: `${baseUrl}/docs`,
      health: `${baseUrl}/health`,
      github: "https://github.com/tony1908/x402Stacks",
      stacks: "https://docs.stacks.co"
    }
  });
});

/**
 * @route   GET /docs
 * @desc    Detailed API Documentation (HTML)
 * @access  Public
 */
router.get("/docs", (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>x402-stacks API Documentation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        h2 { color: #667eea; margin: 30px 0 15px; font-size: 1.8em; }
        h3 { color: #764ba2; margin: 20px 0 10px; font-size: 1.3em; }
        .endpoint {
            background: white;
            padding: 25px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .method {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.85em;
            margin-right: 10px;
        }
        .get { background: #10b981; color: white; }
        .post { background: #3b82f6; color: white; }
        .cost {
            display: inline-block;
            background: #fbbf24;
            color: #78350f;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 0.9em;
            font-weight: bold;
        }
        .free { background: #10b981; color: white; }
        code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        pre {
            background: #1f2937;
            color: #e5e7eb;
            padding: 20px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 15px 0;
        }
        pre code {
            background: none;
            color: #e5e7eb;
            padding: 0;
        }
        .badge {
            display: inline-block;
            background: #e5e7eb;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 0.85em;
            margin: 5px 5px 5px 0;
        }
        .info-box {
            background: #dbeafe;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .warning-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        a { color: #667eea; text-decoration: none; }
        a:hover { text-decoration: underline; }
        footer {
            text-align: center;
            margin-top: 50px;
            padding: 20px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <header>
        <h1>🚀 x402-stacks API</h1>
        <p>Payment-protected API services for Stacks blockchain</p>
        <p style="margin-top: 10px;">
            <span class="badge">Network: ${process.env.NETWORK || 'testnet'}</span>
            <span class="badge">Protocol: x402</span>
        </p>
    </header>

    <h2>📋 Quick Start</h2>
    <div class="info-box">
        <strong>Base URL:</strong> <code>${baseUrl}</code><br>
        <strong>Payment Protocol:</strong> x402 (micropayments on Stacks)<br>
        <strong>Payment Address:</strong> <code>${process.env.SERVER_ADDRESS || 'ST...'}</code>
    </div>

    <h2>🔌 Endpoints</h2>

    <!-- Health Check -->
    <div class="endpoint">
        <h3>
            <span class="method get">GET</span>
            <code>/health</code>
            <span class="cost free">FREE</span>
        </h3>
        <p>Health check endpoint to verify API status.</p>
    </div>

    <!-- News Endpoint -->
    <div class="endpoint">
        <h3>
            <span class="method get">GET</span>
            <code>/api/news</code>
            <span class="cost">0.001 STX</span>
        </h3>
        <p>Get latest Stacks & Bitcoin news powered by Grok AI.</p>

        <div class="warning-box">
            <strong>⚠️ Payment Required:</strong> This endpoint requires x402 payment verification.
            Use the x402-stacks client library to make authenticated requests.
        </div>
    </div>

    <!-- Audit Endpoint -->
    <div class="endpoint">
        <h3>
            <span class="method post">POST</span>
            <code>/api/audit</code>
            <span class="cost">0.02 STX</span>
        </h3>
        <p>Comprehensive security audit for Clarity smart contracts.</p>

        <div class="warning-box">
            <strong>⚠️ Payment Required:</strong> This endpoint requires x402 payment verification.
        </div>

        <h4>Request Body:</h4>
        <pre><code>{
  "contractIdentifier": "SP000000000000000000002Q6VF78.pox"
}</code></pre>
    </div>

    <!-- Wallet Classifier Endpoint -->
    <div class="endpoint">
        <h3>
            <span class="method post">POST</span>
            <code>/api/wallet/classify</code>
            <span class="cost">0.005 STX</span>
        </h3>
        <p>Classify wallet behavior as trader, dao, bridge, bot, or whale using AI analysis of on-chain activity.</p>

        <div class="warning-box">
            <strong>⚠️ Payment Required:</strong> This endpoint requires x402 payment verification.
        </div>

        <h4>Request Body:</h4>
        <pre><code>{
  "address": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7"
}</code></pre>

        <h4>Response:</h4>
        <pre><code>{
  "success": true,
  "data": {
    "address": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    "classification": "trader",
    "confidence": 0.85,
    "reasoning": "High DEX interaction frequency...",
    "metrics": {
      "stxBalance": "1000000000",
      "totalTransactions": 50,
      "uniqueContractsInteracted": 12,
      "fungibleTokensHeld": 5,
      "nftCount": 0,
      "avgTransactionFrequency": "2 hours",
      "largestTransaction": "500000000"
    }
  },
  "meta": { "timestamp": "...", "payment": {...} }
}</code></pre>
    </div>

    <!-- User Research Endpoint -->
    <div class="endpoint">
        <h3>
            <span class="method post">POST</span>
            <code>/api/research/user</code>
            <span class="cost">0.005 STX</span>
        </h3>
        <p>Research a user using AI with real-time web and social media search (powered by Grok).</p>

        <div class="warning-box">
            <strong>⚠️ Payment Required:</strong> This endpoint requires x402 payment verification.
        </div>

        <h4>Request Body:</h4>
        <pre><code>{
  "username": "@elikitten"
}</code></pre>

        <h4>Response:</h4>
        <pre><code>{
  "success": true,
  "data": {
    "username": "elikitten",
    "platform": "X/Twitter",
    "summary": "Comprehensive user profile...",
    "keyFindings": ["Key fact 1", "Key fact 2"],
    "sentiment": "positive",
    "topics": ["crypto", "stacks", "bitcoin"],
    "sources": ["https://x.com/..."]
  },
  "meta": { "timestamp": "...", "payment": {...} }
}</code></pre>
    </div>

    <h2>🔐 Authentication & Payment</h2>
    <div class="info-box">
        <p>This API uses the <strong>x402 payment protocol</strong> for micropayments on Stacks blockchain.</p>
        <ul style="margin: 10px 0 0 20px;">
            <li>All paid endpoints require payment verification</li>
            <li>Payments are made in STX (Stacks tokens)</li>
            <li>Use the <code>x402-stacks</code> client library for automatic payment handling</li>
        </ul>
    </div>

    <h2>📊 Rate Limits</h2>
    <div class="info-box">
        <p>Currently no rate limits enforced. Fair usage policy applies.</p>
    </div>

    <h2>🔗 Resources</h2>
    <ul style="margin-left: 20px;">
        <li><a href="https://github.com/tony1908/x402Stacks" target="_blank">x402-stacks GitHub</a></li>
        <li><a href="https://docs.stacks.co" target="_blank">Stacks Documentation</a></li>
        <li><a href="https://book.clarity-lang.org/" target="_blank">Clarity Language Book</a></li>
    </ul>

    <h2>❓ Support</h2>
    <p>For issues or questions, please open an issue on the GitHub repository.</p>

    <footer>
        <p>Built with ❤️ using x402-stacks | <a href="${baseUrl}">API Home</a></p>
    </footer>
</body>
</html>
  `);
});

export default router;
