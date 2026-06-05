import { arcKit } from './arc-kit.js';
import { PaymentStore } from './payment-store.js';
import { supabase } from './supabase.js';
import { formatCurrency, truncateAddress, showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const formPayment = document.getElementById('form-payment');
  const linkResult = document.getElementById('link-result');
  const checkoutUrl = document.getElementById('checkout-url');
  const usdcBalance = document.getElementById('usdc-balance');
  const txBody = document.getElementById('tx-body');

  window.updateDashboard = async () => {
    if (!arcKit.account) return;
    
    // Update balance
    try {
      usdcBalance.textContent = "Loading...";
      const balance = await arcKit.getBalance();
      usdcBalance.textContent = `${parseFloat(balance).toFixed(2)} USDC`;
    } catch (e) {
      console.error("Failed to get balance", e);
      usdcBalance.textContent = `Err: ${e.message || "Unknown error"}`;
      usdcBalance.style.color = "red";
      usdcBalance.style.fontSize = "0.8rem";
    }
    
    // Render transactions
    renderTransactions();

    // Setup Supabase Realtime subscription
    if (window.currentSubscription) {
      supabase.removeChannel(window.currentSubscription);
    }
    
    window.currentSubscription = supabase
      .channel(`payments-${arcKit.account.toLowerCase()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `merchant=eq.${arcKit.account.toLowerCase()}` }, () => {
        renderTransactions();
      })
      .subscribe();
  };

  const renderTransactions = async () => {
    txBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Loading...</td></tr>`;
    const txs = await PaymentStore.getRecentPayments(arcKit.account);
    
    if (txs.length === 0) {
      txBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No transactions yet</td></tr>`;
      return;
    }
    
    txBody.innerHTML = txs.map(tx => `
      <tr>
        <td>
          <div style="font-weight: 500">${tx.memo}</div>
          <div class="text-muted" style="font-size: 0.8rem">${new Date(tx.createdat).toLocaleString()}</div>
        </td>
        <td style="font-weight: 700; font-family: var(--font-family-headings-custom)">
          ${formatCurrency(tx.amount)}
        </td>
        <td>
          <span class="status-badge status-${tx.status}">
            ${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
          </span>
          ${tx.txhash ? `<div style="font-size: 0.8rem; margin-top: 4px"><a href="https://testnet.arcscan.app/tx/${tx.txhash}" target="_blank" style="color: var(--primary-light)">View on Explorer</a></div>` : ''}
        </td>
      </tr>
    `).join('');
  };

  formPayment?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!arcKit.account) {
      showToast("Please connect your wallet first.", "error");
      return;
    }
    
    const amount = document.getElementById('amount').value;
    const memo = document.getElementById('memo').value;
    
    try {
      // Create payment record
      const payment = await PaymentStore.createPayment(arcKit.account, amount, memo);
      
      // Generate URL
      const url = new URL(window.location.origin + window.location.pathname.replace('index.html', '') + 'checkout.html');
      url.searchParams.set('id', payment.id);
      url.searchParams.set('to', arcKit.account);
      url.searchParams.set('amount', amount);
      url.searchParams.set('memo', memo);
      
      checkoutUrl.href = url.toString();
      checkoutUrl.textContent = url.toString();
      linkResult.classList.remove('hidden');
      
      // Update UI
      renderTransactions();
      formPayment.reset();
      showToast("Payment link generated successfully!", "success");
      
    } catch (error) {
      showToast("Failed to create payment link: " + error.message, "error");
    }
  });
  
  // Initial render if loaded directly into dashboard
  setTimeout(() => {
    if (document.getElementById('view-dashboard').classList.contains('active')) {
      window.updateDashboard();
    }
  }, 500);

  // Auto-refresh when user switches back to this tab (e.g. from checkout tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && document.getElementById('view-dashboard').classList.contains('active')) {
      renderTransactions();
    }
  });

  // Legacy storage fallback (optional, mostly replaced by Supabase Realtime)
  window.addEventListener('storage', (e) => {
    if (e.key === 'arcpay_transactions') {
      renderTransactions();
    }
  });
});
