# ArcPay — Decentralized USDC Payment Gateway

ArcPay Live At  - https://arc-pay-blush.vercel.app/

ArcPay is a decentralized payment gateway built for the **Arc Testnet**. Merchants connect their wallet, generate shareable payment links, and receive USDC directly — no middleman, no sign-ups.

## Features

- **Wallet Connect** — Universal EIP-6963 wallet detection (MetaMask, Rabby, etc.)
- **Payment Links** — Generate checkout URLs with amount and memo baked in
- **Live Dashboard** — View USDC balance, recent transactions, and manage payments
- **Edit & Cancel** — Change a payment's amount or cancel it; the customer's checkout page updates in real-time via Supabase Realtime
- **Cross-Chain Bridge** — Customers on other EVM chains can pay via a simulated CCTP bridge
- **Secure Verification** — Server-side `/api/verify` endpoint confirms on-chain transactions before marking payments as complete
- **Fully Responsive** — Optimized for desktop and mobile with a burger menu

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript (ES Modules) |
| Blockchain | Viem, Arc Testnet RPC |
| Database | Supabase (Postgres + Realtime) |
| Backend | Express.js (static server + `/api/verify`) |
| Deployment | Vercel |

## Project Structure

```
arcpay/
├── index.html          # Merchant Dashboard
├── checkout.html       # Customer Payment Page
├── server.js           # Express dev server
├── css/
│   └── style.css       # Full design system
├── js/
│   ├── app.js          # Navigation, wallet UI, burger menu
│   ├── arc-kit.js      # Wallet connect, send, bridge logic
│   ├── checkout.js     # Payment page with real-time updates
│   ├── dashboard.js    # Dashboard rendering, edit/cancel
│   ├── payment-store.js# Supabase CRUD for payments
│   ├── policies.js     # Footer policy modals
│   ├── supabase.js     # Supabase client init
│   └── utils.js        # Shared constants and helpers
├── api/
│   └── verify.js       # Vercel serverless function for tx verification
└── .env                # Supabase keys (not committed)
```

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/chamuwa1/ArcPay.git
cd ArcPay
npm install
```

### 2. Set up environment variables

Create a `.env` file in the root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. Set up Supabase

Run the following SQL in your Supabase SQL Editor to create the `payments` table:

```sql
CREATE TABLE public.payments (
  id TEXT PRIMARY KEY,
  merchant TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  memo TEXT,
  status TEXT DEFAULT 'pending',
  txhash TEXT,
  createdat TIMESTAMPTZ DEFAULT now()
);

-- Allow anyone to insert
CREATE POLICY "Anyone can insert payments"
ON public.payments FOR INSERT WITH CHECK (true);

-- Allow anyone to read
CREATE POLICY "Anyone can read payments"
ON public.payments FOR SELECT USING (true);

-- Allow anyone to update (frontend enforces merchant-only)
CREATE POLICY "Anyone can update payments"
ON public.payments FOR UPDATE USING (true);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
```

Also enable **Realtime** for the `payments` table in your Supabase Dashboard (Database → Replication).

### 4. Run locally

```bash
node server.js
```

Open `http://localhost:3001` in your browser.

### 5. Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add your `.env` variables in Vercel's Environment Variables settings
4. Deploy — the `api/verify.js` file will automatically become a serverless function

## How It Works

1. **Merchant** connects wallet → generates a payment link
2. **Customer** opens the link → connects their wallet → pays in USDC
3. The server-side `verify` function checks the transaction on-chain
4. Payment status updates to `completed` in Supabase
5. Both dashboard and checkout pages update in real-time

## License

MIT
