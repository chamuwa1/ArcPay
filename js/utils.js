export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const truncateAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const parseUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    to: params.get('to'),
    amount: params.get('amount'),
    memo: params.get('memo'),
    id: params.get('id')
  };
};

// ─── Arc Testnet Configuration (from https://docs.arc.io) ─────────────────

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_CCTP_DOMAIN_ID = 26;

// Contract Addresses (Testnet)
// USDC has a DUAL INTERFACE on Arc:
//   • Native (gas): 18 decimals — used for getBalance(), sendTransaction(), gas fees
//   • ERC-20:        6 decimals — used for transfer(), approve(), transferFrom()
// Both interfaces access the SAME underlying balance. No bridging needed between them.
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
export const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

// CCTP V2 (Cross-Chain Transfer Protocol)
export const CCTP = {
  TokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
  MessageTransmitterV2: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  TokenMinterV2: "0xb43db544E2c27092c107639Ad201b3dEfAbcF192",
  MessageV2: "0xbaC0179bB358A8936169a63408C8481D582390C4",
};

// Gateway
export const GATEWAY = {
  Wallet: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9",
  Minter: "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B",
};

// Native gas decimals vs ERC-20 decimals
export const USDC_NATIVE_DECIMALS = 18; // For gas operations (getBalance, sendTransaction)
export const USDC_ERC20_DECIMALS = 6;   // For ERC-20 operations (transfer, approve)

// Full viem chain definition for Arc Testnet
export const arcTestnet = {
  id: ARC_TESTNET_CHAIN_ID,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: USDC_NATIVE_DECIMALS },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
};

export const showToast = (message, type = 'error') => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '';
  if (type === 'error') {
    icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else if (type === 'success') {
    icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
  }

  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);

  // Trigger reflow for animation
  void toast.offsetWidth;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400); // Wait for transition
  }, 4000);
};
