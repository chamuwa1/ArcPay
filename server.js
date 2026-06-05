import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for demo purposes (would be a DB in production)
const payments = new Map();

app.use(express.static(__dirname));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create a payment intent (simulated)
app.post('/api/payments', (req, res) => {
  const { amount, memo, merchant } = req.body;
  const paymentId = `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  const payment = {
    id: paymentId,
    amount,
    memo,
    merchant,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  payments.set(paymentId, payment);
  res.json(payment);
});

// Get payment status
app.get('/api/payments/:id', (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  res.json(payment);
});

// Webhook receiver for Arc smart contract events
app.post('/api/webhook', (req, res) => {
  console.log('Received webhook payload:', JSON.stringify(req.body, null, 2));
  
  const { paymentId, status, txHash } = req.body;
  
  if (paymentId && payments.has(paymentId)) {
    const payment = payments.get(paymentId);
    payment.status = status || 'completed';
    payment.txHash = txHash;
    payment.completedAt = new Date().toISOString();
    payments.set(paymentId, payment);
    console.log(`Updated payment ${paymentId} to ${status}`);
  }
  
  res.status(200).json({ received: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ArcPay Backend running on port ${PORT}`);
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://0.0.0.0:${PORT} (use your PC's local IP for mobile testing)`);
});
