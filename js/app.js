import { arcKit } from './arc-kit.js';
import { truncateAddress, showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const btnConnect = document.getElementById('btn-connect');
  const btnGetStarted = document.getElementById('btn-get-started');
  const viewLanding = document.getElementById('view-landing');
  const viewDashboard = document.getElementById('view-dashboard');
  const walletContainer = document.getElementById('wallet-container');
  const walletAddress = document.getElementById('wallet-address');
  const btnDisconnect = document.getElementById('btn-disconnect');
  const logoLink = document.getElementById('logo-link');
  const navDashboardLink = document.getElementById('nav-dashboard-link');
  const navHomeLink = document.getElementById('nav-home-link');
  
  // Modal Elements
  const walletModal = document.getElementById('wallet-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const walletList = document.getElementById('wallet-list');

  const transitionView = (callback) => {
    if (!document.startViewTransition) {
      callback();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    document.startViewTransition(() => {
      callback();
      window.scrollTo(0, 0);
    });
  };

  const showDashboard = () => {
    transitionView(() => {
      viewLanding.classList.remove('active');
      viewDashboard.classList.add('active');
      navHomeLink?.classList.remove('active');
      navDashboardLink?.classList.add('active');
      if (window.updateDashboard) window.updateDashboard();
    });
  };

  const showLanding = () => {
    transitionView(() => {
      viewDashboard.classList.remove('active');
      viewLanding.classList.add('active');
      navDashboardLink?.classList.remove('active');
      navHomeLink?.classList.add('active');
    });
  };

  logoLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (arcKit.account) showDashboard();
    else showLanding();
  });

  navDashboardLink?.addEventListener('click', (e) => {
    e.preventDefault();
    if (arcKit.account) showDashboard();
  });

  navHomeLink?.addEventListener('click', (e) => {
    e.preventDefault();
    if (arcKit.account) showLanding();
  });

  // Modal Logic
  const openModal = () => {
    // Populate wallet list
    walletList.innerHTML = '';
    
    if (arcKit.providers.length === 0) {
      walletList.innerHTML = `<div class="text-center text-muted p-4">No wallets detected. Please install a Web3 wallet.</div>`;
    } else {
      arcKit.providers.forEach(p => {
        const btn = document.createElement('div');
        btn.className = 'wallet-option';
        btn.innerHTML = `
          <img src="${p.info.icon}" alt="${p.info.name}" class="wallet-icon">
          <span>${p.info.name}</span>
        `;
        btn.addEventListener('click', async () => {
          closeModal();
          try {
            const { account } = await arcKit.connect(p.info.uuid);
            updateHeaderState(account);
            showDashboard();
          } catch (error) {
            // Check if error is User Rejected (4001) or a general error
            if (error.code === 4001 || error.message.includes('User rejected')) {
              showToast("Connection cancelled by user.", "error");
            } else {
              showToast(error.message || "Failed to connect.", "error");
            }
          }
        });
        walletList.appendChild(btn);
      });
    }
    
    walletModal.classList.add('active');
  };

  const closeModal = () => walletModal.classList.remove('active');

  btnConnect?.addEventListener('click', openModal);
  btnGetStarted?.addEventListener('click', () => {
    if (!arcKit.account) {
      showToast("Please connect your wallet first to proceed.", "error");
      openModal();
    } else {
      showDashboard();
    }
  });
  btnCloseModal?.addEventListener('click', closeModal);
  walletModal?.addEventListener('click', (e) => {
    if (e.target === walletModal) closeModal();
  });

  btnDisconnect?.addEventListener('click', async () => {
    await arcKit.disconnect();
    updateHeaderState(null);
    showLanding();
  });

  const updateHeaderState = (account) => {
    if (account) {
      btnConnect.classList.add('hidden');
      walletAddress.textContent = truncateAddress(account);
      walletContainer.classList.remove('hidden');
      navDashboardLink?.classList.remove('hidden');
      navHomeLink?.classList.remove('hidden');
    } else {
      btnConnect.classList.remove('hidden');
      walletContainer.classList.add('hidden');
      navDashboardLink?.classList.add('hidden');
      navHomeLink?.classList.add('hidden');
    }
  };

  // --- Scroll Gestures (Up to Home, Down to Dashboard) ---
  let scrollUpAccumulator = 0;
  let scrollDownAccumulator = 0;
  const SCROLL_THRESHOLD = 150;
  const TOUCH_THRESHOLD = 100;

  window.addEventListener('wheel', (e) => {
    // 1. Scroll UP from Dashboard top -> Home
    if (viewDashboard.classList.contains('active')) {
      if (window.scrollY <= 10) { // At top
        if (e.deltaY < 0) {
          scrollUpAccumulator += Math.abs(e.deltaY);
          if (scrollUpAccumulator > SCROLL_THRESHOLD) {
            showLanding();
            scrollUpAccumulator = 0;
          }
        } else {
          scrollUpAccumulator = 0;
        }
      }
    }

    // 2. Scroll DOWN from Landing bottom -> Dashboard (Only if connected)
    if (viewLanding.classList.contains('active') && arcKit.account) {
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10;
      if (isAtBottom) {
        if (e.deltaY > 0) {
          scrollDownAccumulator += e.deltaY;
          if (scrollDownAccumulator > SCROLL_THRESHOLD) {
            scrollDownAccumulator = 0;
            showDashboard();
          }
        } else {
          scrollDownAccumulator = 0;
        }
      }
    }
  }, { passive: true });

  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    const currentY = e.touches[0].clientY;
    
    // 1. Swipe DOWN from Dashboard top -> Home
    if (viewDashboard.classList.contains('active') && window.scrollY <= 10) {
      const diff = currentY - touchStartY; // Positive if swiping down (scrolling up)
      if (diff > TOUCH_THRESHOLD) {
        showLanding();
      }
    }

    // 2. Swipe UP from Landing bottom -> Dashboard (Only if connected)
    if (viewLanding.classList.contains('active') && arcKit.account) {
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10;
      if (isAtBottom) {
        const diff = touchStartY - currentY; // Positive if swiping up (scrolling down)
        if (diff > TOUCH_THRESHOLD) {
          showDashboard();
        }
      }
    }
  }, { passive: true });

  // Check initial state
  // EIP-6963 discovery is async, wait a tiny bit to check state
  setTimeout(() => {
    if (arcKit.account) {
      updateHeaderState(arcKit.account);
      showDashboard();
    }
  }, 100);
});
