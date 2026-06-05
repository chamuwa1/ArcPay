import { arcKit } from './arc-kit.js';
import { supabase } from './supabase.js';
import { parseUrlParams, formatCurrency, truncateAddress, ARC_TESTNET_CHAIN_ID, showToast } from './utils.js';

(() => {
  const params = parseUrlParams();
  
  // UI Elements
  const merchantName = document.getElementById('merchant-name');
  const memoDisplay = document.getElementById('memo-display');
  const amountValue = document.getElementById('amount-value');
  const btnConnect = document.getElementById('btn-connect-checkout');
  const connectPrompt = document.getElementById('connect-prompt');
  
  const paymentDetailsContainer = document.getElementById('payment-details');
  const networkDisplay = document.getElementById('network-display');
  const subtotalVal = document.getElementById('subtotal-val');
  const feeVal = document.getElementById('fee-val');
  const totalVal = document.getElementById('total-val');
  const btnPay = document.getElementById('btn-pay');
  const successScreen = document.getElementById('success-screen');
  const explorerLink = document.getElementById('explorer-link');
  const bridgeProgress = document.getElementById('bridge-progress');
  const btnSuccessDisconnect = document.getElementById('btn-success-disconnect');
  const checkoutWalletAddr = document.getElementById('checkout-wallet-addr');
  const btnChangeWallet = document.getElementById('btn-change-wallet');
  const walletModal = document.getElementById('wallet-modal');
  const walletList = document.getElementById('wallet-list');
  const btnCloseModal = document.getElementById('btn-close-modal');

  let currentAmount = 0;
  let currentFee = 0;

  const updatePriceDisplays = (amount) => {
    currentAmount = parseFloat(amount);
    amountValue.textContent = currentAmount.toFixed(2);
    subtotalVal.textContent = currentAmount.toFixed(2);
    totalVal.textContent = (currentAmount + currentFee).toFixed(2);
    btnPay.innerHTML = `Pay ${currentAmount.toFixed(2)} USDC`;
  };

  const loadPaymentDetails = async (paymentId) => {
    const { data: paymentInfo, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error || !paymentInfo) {
      merchantName.textContent = "Invalid Payment Link";
      memoDisplay.textContent = "Payment not found.";
      btnConnect.classList.add('hidden');
      return;
    }

    merchantName.textContent = `Pay ${truncateAddress(paymentInfo.merchant)}`;
    memoDisplay.textContent = paymentInfo.memo || 'Payment';
    updatePriceDisplays(paymentInfo.amount);

    if (paymentInfo.status === 'cancelled') {
      paymentDetailsContainer.classList.add('hidden');
      btnConnect.classList.add('hidden');
      connectPrompt.classList.add('hidden');
      document.getElementById('cancelled-screen').classList.remove('hidden');
      return;
    }

    if (paymentInfo.status === 'completed') {
      paymentDetailsContainer.classList.add('hidden');
      btnConnect.classList.add('hidden');
      connectPrompt.classList.add('hidden');
      successScreen.classList.remove('hidden');
      if (paymentInfo.txhash) {
        explorerLink.href = `https://testnet.arcscan.app/tx/${paymentInfo.txhash}`;
      } else {
        explorerLink.style.display = 'none';
      }
      return;
    }

    // Subscribe to real-time updates
    window.paymentSubscription = supabase
      .channel(`payment-${paymentId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: `id=eq.${paymentId}` }, (payload) => {
        const newData = payload.new;
        
        if (newData.status === 'cancelled') {
          paymentDetailsContainer.classList.add('hidden');
          btnConnect.classList.add('hidden');
          connectPrompt.classList.add('hidden');
          document.getElementById('cancelled-screen').classList.remove('hidden');
          return;
        }

        if (newData.amount && newData.amount !== currentAmount) {
          updatePriceDisplays(newData.amount);
          
          // Flash effect
          amountValue.classList.remove('price-flash');
          void amountValue.offsetWidth;
          amountValue.classList.add('price-flash');
          
          showToast("Payment amount was updated by the merchant.");
          // Update URL param silently so the smart contract logic reads the new amount
          const url = new URL(window.location);
          url.searchParams.set('amount', newData.amount);
          window.history.replaceState({}, '', url);
        }
      })
      .subscribe();
  };

  if (params.id) {
    loadPaymentDetails(params.id);
  } else if (params.to && params.amount) {
    // Fallback for legacy static links without an ID
    merchantName.textContent = `Pay ${truncateAddress(params.to)}`;
    memoDisplay.textContent = params.memo || 'Payment';
    updatePriceDisplays(params.amount);
  }

  const updateFeeDisplay = (chainId) => {
    let fee = 0.00;
    
    if (chainId === ARC_TESTNET_CHAIN_ID) {
      networkDisplay.textContent = "Arc Testnet (Native USDC)";
      fee = 0.01;
      bridgeProgress.classList.add('hidden');
    } else {
      networkDisplay.textContent = "Cross-chain Bridge to Arc";
      fee = 0.50;
      bridgeProgress.classList.remove('hidden');
    }
    
    currentFee = fee;
    feeVal.textContent = fee.toFixed(2);
    totalVal.textContent = (currentAmount + fee).toFixed(2);
  };

  const onWalletConnected = (chainId) => {
    walletModal.classList.remove('active');
    connectPrompt.classList.add('hidden');
    paymentDetailsContainer.classList.remove('hidden');
    checkoutWalletAddr.textContent = truncateAddress(arcKit.account);
    updateFeeDisplay(chainId);
  };

  const disconnectAndReset = async () => {
    await arcKit.disconnect();
    paymentDetailsContainer.classList.add('hidden');
    connectPrompt.classList.remove('hidden');
    btnConnect.disabled = false;
    btnConnect.textContent = "Connect Wallet";
    btnPay.disabled = false;
    btnPay.textContent = "Pay with USDC";
  };
  window.disconnectWallet = disconnectAndReset;

  const openWalletModal = () => {
    walletList.innerHTML = '';
    
    if (arcKit.providers.length === 0) {
      walletList.innerHTML = `<div class="text-center text-muted p-4">No wallets detected. Please install a Web3 wallet like MetaMask.</div>`;
    } else {
      arcKit.providers.forEach(p => {
        const btn = document.createElement('div');
        btn.className = 'wallet-option';
        btn.innerHTML = `
          <img src="${p.info.icon}" alt="${p.info.name}" class="wallet-icon">
          <span>${p.info.name}</span>
        `;
        btn.addEventListener('click', async () => {
          walletModal.classList.remove('active');
          btnConnect.disabled = true;
          btnConnect.textContent = "Connecting...";
          try {
            const { chainId } = await arcKit.connect(p.info.uuid);
            onWalletConnected(chainId);
          } catch (error) {
            if (error.code === 4001 || error.message?.includes('User rejected')) {
              showToast("Connection cancelled.", "error");
            } else {
              showToast(error.message || "Failed to connect wallet.", "error");
            }
            btnConnect.disabled = false;
            btnConnect.textContent = "Connect Wallet";
          }
        });
        walletList.appendChild(btn);
      });
    }
    
    walletModal.classList.add('active');
  };

  btnConnect.addEventListener('click', () => {
    setTimeout(openWalletModal, 300);
  });

  // Change Wallet button: disconnect current, open modal to pick new one
  btnChangeWallet?.addEventListener('click', async () => {
    await disconnectAndReset();
    setTimeout(openWalletModal, 300);
  });

  // Success screen disconnect button
  btnSuccessDisconnect?.addEventListener('click', async () => {
    await disconnectAndReset();
    showToast("Wallet disconnected securely", "success");
    // Optionally redirect back to the app home
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
  });

  btnCloseModal?.addEventListener('click', () => {
    walletModal.classList.remove('active');
  });

  walletModal?.addEventListener('click', (e) => {
    if (e.target === walletModal) walletModal.classList.remove('active');
  });

  const runBridgeProgressUI = () => {
    const steps = ['approve', 'burn', 'attest', 'mint'];
    let currentStep = 0;
    
    return setInterval(() => {
      if (currentStep > 0) {
        document.getElementById(`step-${steps[currentStep-1]}`).classList.remove('active');
        document.getElementById(`step-${steps[currentStep-1]}`).classList.add('completed');
        document.getElementById(`step-${steps[currentStep-1]}`).querySelector('.step-icon').innerHTML = '✓';
      }
      
      if (currentStep < steps.length) {
        document.getElementById(`step-${steps[currentStep]}`).classList.add('active');
        currentStep++;
      }
    }, 1500);
  };

  btnPay.addEventListener('click', async () => {
    try {
      btnPay.disabled = true;
      btnPay.textContent = "Processing...";
      
      let progressInterval;
      if (arcKit.chainId !== ARC_TESTNET_CHAIN_ID) {
        progressInterval = runBridgeProgressUI();
      }
      
      // Execute payment
      const amountToSend = String(currentAmount || params.amount);
      let result;
      if (arcKit.chainId === ARC_TESTNET_CHAIN_ID) {
        result = await arcKit.send(params.to, amountToSend);
      } else {
        result = await arcKit.bridge(params.to, amountToSend);
      }
      
      if (progressInterval) clearInterval(progressInterval);
      
      if (result.success) {
        if (params.id) {
          // SECURE VERIFICATION: Send hash to backend instead of trusting client
          const verifyRes = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: params.id, txHash: result.hash })
          });
          
          if (!verifyRes.ok) {
            const errorData = await verifyRes.json();
            throw new Error(errorData.error || 'Verification failed');
          }
        }
        
        paymentDetailsContainer.classList.add('hidden');
        successScreen.classList.remove('hidden');
        if (result.hash && !result.simulated) {
            explorerLink.href = `https://testnet.arcscan.app/tx/${result.hash}`;
        } else {
            explorerLink.style.display = 'none';
        }
        
        window.parent.postMessage({ type: 'ARCPAY_SUCCESS', txHash: result.hash }, '*');
      }
      
    } catch (error) {
      console.error(error);

      // User-friendly toast instead of ugly red text
      if (error.code === 4001 || error.message?.includes('User rejected') || error.message?.includes('User denied')) {
        showToast("Payment cancelled. You can try again when ready.", "error");
      } else if (error.message?.includes('timed out')) {
        showToast("Transaction sent but confirmation timed out. Check ArcScan for status.", "error");
      } else {
        showToast(error.message || "Payment failed. Please try again.", "error");
      }

      btnPay.disabled = false;
      btnPay.textContent = "Pay with USDC";
    }
  });
})();
