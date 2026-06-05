import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http, parseUnits } from 'viem';
import { arcTestnet } from '../js/utils.js';

// Initialize Supabase with Service Role Key (bypasses RLS for secure updates)
const supabaseUrl = process.env.SUPABASE_URL || 'https://opfealrrtdfszyfvbhsj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error("CRITICAL: Missing Supabase Service Key in environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || 'dummy_key_to_prevent_startup_crash');

// Initialize Viem Client for Arc Testnet
const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http()
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { paymentId, txHash } = req.body;

  if (!paymentId || !txHash) {
    return res.status(400).json({ error: 'Missing paymentId or txHash' });
  }

  try {
    // 1. Fetch the expected payment details from Supabase
    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (dbError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      return res.status(400).json({ error: 'Payment already completed' });
    }

    // 2. Fetch the transaction from the Arc Testnet
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    
    // Check if transaction was successful
    if (receipt.status !== 'success') {
      return res.status(400).json({ error: 'Transaction failed on-chain' });
    }

    // 3. Fetch transaction details to verify amount and recipient
    const transaction = await publicClient.getTransaction({ hash: txHash });

    // Arc specific verification:
    // - Native USDC uses 18 decimals for gas/transfers
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
      throw new Error(`Failed to update database: ${updateError.message}`);
    }

    return res.status(200).json({ success: true, message: 'Payment verified and completed' });

  } catch (error) {
    console.error('Verification Error:', error);
    return res.status(500).json({ error: 'Internal Server Error during verification' });
  }
}
