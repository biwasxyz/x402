# x402 Payment Demo

This demo shows how x402-stacks enables automatic HTTP-level payments.

## How It Works

### The Payment Flow

```
┌─────────┐                    ┌─────────┐                    ┌──────────────┐
│ Client  │                    │ Server  │                    │ Facilitator  │
└────┬────┘                    └────┬────┘                    └──────┬───────┘
     │                              │                                │
     │ 1. GET /api/personal-data    │                                │
     ├─────────────────────────────>│                                │
     │                              │                                │
     │ 2. 402 Payment Required      │                                │
     │    {amount, address, nonce}  │                                │
     │<─────────────────────────────┤                                │
     │                              │                                │
     │ 3. Sign STX transaction      │                                │
     │    (NOT broadcast)           │                                │
     │                              │                                │
     │ 4. Retry with X-PAYMENT      │                                │
     │    header (signed tx)        │                                │
     ├─────────────────────────────>│                                │
     │                              │                                │
     │                              │ 5. POST /api/v1/settle         │
     │                              │    {signed_transaction, ...}   │
     │                              ├───────────────────────────────>│
     │                              │                                │
     │                              │                                │ 6. Broadcast
     │                              │                                │    to Stacks
     │                              │                                │    blockchain
     │                              │                                │
     │                              │ 7. Settlement result           │
     │                              │    {tx_id, status, block}      │
     │                              │<───────────────────────────────┤
     │                              │                                │
     │ 8. 200 OK + Data             │                                │
     │    X-PAYMENT-RESPONSE header │                                │
     │<─────────────────────────────┤                                │
     │                              │                                │
```

### Key Points

1. **First Request**: Client tries to access `/api/personal-data`
2. **402 Response**: Server responds with HTTP 402 Payment Required + payment details
3. **Client Signs**: Client automatically signs a STX transfer transaction
4. **Retry with Payment**: Client retries the request with `X-PAYMENT` header
5. **Server Settles**: Server sends signed tx to facilitator
6. **Facilitator Confirms**: Facilitator broadcasts and waits for blockchain confirmation
7. **Access Granted**: Server returns the data with payment confirmation

## Running the Demo

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Testnet STX

Visit the [Stacks Testnet Faucet](https://explorer.stacks.co/sandbox/faucet?chain=testnet) and get testnet STX for your client address.

### 3. Set Environment Variables

```bash
export CLIENT_PRIVATE_KEY="your-private-key-hex"
```

Or generate a new keypair:

```typescript
import { generateKeypair } from "x402-stacks";
const wallet = generateKeypair("testnet");
console.log(wallet);
```

### 4. Start the Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

### 5. Run the Client (in another terminal)

```bash
npx tsx client.ts
```

## Testing Manually with curl

### Step 1: Get Payment Requirements

```bash
curl http://localhost:3000/api/personal-data
```

Response (402):

```json
{
  "maxAmountRequired": "1000",
  "resource": "/api/personal-data",
  "payTo": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  "network": "testnet",
  "nonce": "abc123...",
  "expiresAt": "2024-01-01T12:05:00Z",
  "tokenType": "STX"
}
```

### Step 2: Make Payment

You'll need to sign a transaction and include it in the header. The easiest way is to use the client library which handles this automatically.

## What's Happening Under the Hood

### Server Middleware (`x402PaymentRequired`)

```typescript
x402PaymentRequired({
  amount: STXtoMicroSTX(0.001), // Amount to charge
  address: SERVER_ADDRESS, // Where payment goes
  network: NETWORK, // testnet or mainnet
  facilitatorUrl: "...", // Who broadcasts the tx
});
```

The middleware:

- Checks for `X-PAYMENT` header
- If missing: returns 402 with payment details
- If present: validates and settles via facilitator
- If confirmed: calls next middleware (your handler)

### Client Interceptor (`withPaymentInterceptor`)

```typescript
const api = withPaymentInterceptor(axios.create(), account);
```

The interceptor:

- Watches for 402 responses
- Automatically signs payment transactions
- Retries the request with `X-PAYMENT` header
- Decodes payment confirmation from response

## Customizing the Endpoint

### Dynamic Pricing

```typescript
app.get(
  "/api/data",
  x402PaymentRequired({
    amount: (req) =>
      req.query.premium ? STXtoMicroSTX(0.01) : STXtoMicroSTX(0.001),
    address: SERVER_ADDRESS,
    network: NETWORK,
  }),
  handler
);
```

### Rate Limiting

```typescript
import { paymentRateLimit } from "x402-stacks";

app.get(
  "/api/data",
  paymentRateLimit({
    freeRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    paymentConfig: {
      amount: STXtoMicroSTX(0.001),
      address: SERVER_ADDRESS,
      network: NETWORK,
    },
  }),
  handler
);
```

### Using sBTC Instead

```typescript
import { BTCtoSats, getDefaultSBTCContract } from "x402-stacks";

app.get(
  "/api/data",
  x402PaymentRequired({
    amount: BTCtoSats(0.00001), // 0.00001 BTC
    address: SERVER_ADDRESS,
    network: NETWORK,
    tokenType: "sBTC",
    tokenContract: getDefaultSBTCContract("testnet"),
  }),
  handler
);
```

## Troubleshooting

### "Insufficient balance"

Get testnet STX from the faucet: https://explorer.stacks.co/sandbox/faucet?chain=testnet

### "Invalid signature"

Make sure your private key is correct and matches the account address.

### "Transaction timeout"

The facilitator waits up to 10 minutes for confirmation. Stacks blocks take ~10 minutes.

## Next Steps

- Add authentication alongside payments
- Implement tiered pricing
- Add usage analytics
- Deploy to production (switch to mainnet)
