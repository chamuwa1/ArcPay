import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http, parseUnits } from 'viem';
import { arcTestnet } from './js/utils.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup Supabase using Service Key (or Anon key as fallback for local testing)
const supabaseUrl = process.env.SUPABASE_URL || 'https://opfealrrtdfszyfvbhsj.supabase.co';
// WARNING: Locally, if you only have the Anon key, RLS might block the update. 
// You should add SUPABASE_SERVICE_ROLE_KEY to your local .env file.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZmVhbHJydGRmc3p5ZnZiaHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDM4NzUsImV4cCI6MjA5NjIxOTg3NX0.p3KaKulCf04iPhYLX7qqIwIekcP6Woiuj2VYt3j750c';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Viem Client for Arc Testnet
const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http()
});

app.use(express.static(__dirname));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Secure Verification Endpoint
app.post('/api/verify', async (req, res) => {
  const { paymentId, txHash } = req.body;

  if (!paymentId || !txHash) {
    return res.status(400).json({ error: 'Missing paymentId or txHash' });
  }

  try {
    // 1. Fetch the expected payment details
    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (dbError || !payment) {
      return res.status(404).json({ error: 'Payment not found in database' });
    }

    if (payment.status === 'completed') {
      return res.status(400).json({ error: 'Payment already completed' });
    }

    // 2. Fetch the transaction from the Arc Testnet
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    
    if (receipt.status !== 'success') {
      return res.status(400).json({ error: 'Transaction failed on-chain' });
    }

    // 3. Fetch transaction details to verify amount and recipient
    const transaction = await publicClient.getTransaction({ hash: txHash });

    const expectedValue = parseUnits(payment.amount.toString(), 18);
    const expectedTo = payment.merchant.toLowerCase();

    if (transaction.to.toLowerCase() !== expectedTo) {
      return res.status(400).json({ error: 'Transaction sent to wrong address' });
    }

    if (transaction.value < expectedValue) {
      return res.status(400).json({ error: 'Transaction value is less than required amount' });
    }

    // 4. All checks passed! Update Supabase securely
    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        status: 'completed', 
        txhash: txHash, 
        completedat: new Date().toISOString() 
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error("Supabase Update Error:", updateError);
      return res.status(500).json({ error: 'Failed to update database. If testing locally, ensure you have SUPABASE_SERVICE_ROLE_KEY in your .env file or add an UPDATE policy to Supabase.' });
    }

    return res.status(200).json({ success: true, message: 'Payment verified and completed' });

  } catch (error) {
    console.error('Verification Error:', error);
    return res.status(500).json({ error: 'Internal Server Error during verification: ' + error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ArcPay Backend running on port ${PORT}`);
  console.log(`Local:   http://localhost:${PORT}`);
});
