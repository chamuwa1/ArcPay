import { arcKit } from './arc-kit.js';
import { PaymentStore } from './payment-store.js';
import { parseUrlParams, formatCurrency, truncateAddress, ARC_TESTNET_CHAIN_ID, showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const params = parseUrlParams();
  
  // UI Elements
  const merchantName = document.getElementById('merchant-name');
  const memoDisplay = document.getElementById('memo-display');
  const amountValue = document.getElementById('amount-value');
  const btnConnect = document.getElementById('btn-connect-checkout');
  const connectPrompt = document.getElementById('connect-prompt');
  const paymentDetails = document.getElementById('payment-details');
  const networkDisplay = document.getElementById('network-display');
  const subtotalVal = document.getElementById('subtotal-val');
  const feeVal = document.getElementById('fee-val');
  const totalVal = document.getElementById('total-val');
  const btnPay = document.getElementById('btn-pay');
  const successScreen = document.getElementById('success-screen');
  const explorerLink = document.getElementById('explorer-link');
  const bridgeProgress = document.getElementById('bridge-progress');
  const btnSuccessDisconnect = document.getElementById('btn-success-disconnect');

  // Wallet bar elements
  const checkoutWalletAddr = document.getElementById('checkout-wallet-addr');
  const btnChangeWallet = document.getElementById('btn-change-wallet');

  // Wallet modal elements
  const walletModal = document.getElementById('wallet-modal');
  const walletList = document.getElementById('wallet-list');
  const btnCloseModal = document.getElementById('btn-close-modal');

  if (!params.to || !params.amount) {
    merchantName.textContent = "Invalid Payment Link";
    memoDisplay.textContent = "Missing required parameters (to, amount).";
    btnConnect.classList.add('hidden');
    return;
  }

  // Initial render
  merchantName.textContent = `Pay ${truncateAddress(params.to)}`;
  memoDisplay.textContent = params.memo || 'Payment';
  amountValue.textContent = parseFloat(params.amount).toFixed(2);
  subtotalVal.textContent = parseFloat(params.amount).toFixed(2);

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
    
    feeVal.textContent = fee.toFixed(2);
    totalVal.textContent = (parseFloat(params.amount) + fee).toFixed(2);
  };

  const onWalletConnected = (chainId) => {
    walletModal.classList.remove('active');
    connectPrompt.classList.add('hidden');
    paymentDetails.classList.remove('hidden');
    checkoutWalletAddr.textContent = truncateAddress(arcKit.account);
    updateFeeDisplay(chainId);
  };

  const disconnectAndReset = async () => {
    await arcKit.disconnect();
    paymentDetails.classList.add('hidden');
    connectPrompt.classList.remove('hidden');
    btnConnect.disabled = false;
    btnConnect.textContent = "Connect Wallet";
    btnPay.disabled = false;
    btnPay.textContent = "Pay with USDC";
  };

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
      let result;
      if (arcKit.chainId === ARC_TESTNET_CHAIN_ID) {
        result = await arcKit.send(params.to, params.amount);
      } else {
        result = await arcKit.bridge(params.to, params.amount);
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
        
        paymentDetails.classList.add('hidden');
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
});
