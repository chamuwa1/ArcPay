import { createWalletClient, custom, publicActions, parseUnits, formatUnits } from 'viem';
import { ARC_TESTNET_CHAIN_ID, USDC_ADDRESS, USDC_NATIVE_DECIMALS, arcTestnet, showToast } from './utils.js';

export class ArcPayKit {
  constructor() {
    this.walletClient = null;
    this.account = sessionStorage.getItem('arcpay_connected_account') || null;
    this.chainId = parseInt(sessionStorage.getItem('arcpay_connected_chain')) || null;
    
    // EIP-6963 State
    this.providers = [];
    this.activeProvider = null;
    this.activeProviderId = sessionStorage.getItem('arcpay_connected_provider') || null;
    
    this.setupEIP6963();
  }

  setupEIP6963() {
    window.addEventListener('eip6963:announceProvider', (event) => {
      const { info, provider } = event.detail;
      // Prevent duplicates
      if (!this.providers.find(p => p.info.uuid === info.uuid)) {
        this.providers.push({ info, provider });
        // Restore active provider if it matches
        if (this.activeProviderId === info.uuid && this.account) {
          this.activeProvider = provider;
          this.initClients();
        }
      }
    });

    // Request providers to announce themselves
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    
    // Safety fallback for page reloads: If EIP-6963 fails to restore the provider within 500ms, 
    // but the user is connected, forcefully use window.ethereum to prevent the app from breaking.
    setTimeout(() => {
      if (window.ethereum && !this.activeProvider && this.account) {
        this.activeProvider = window.ethereum;
        this.initClients();
      }
    }, 500);
  }

  initClients() {
    if (!this.account || !this.activeProvider) return;
    this.walletClient = createWalletClient({
      account: this.account,
      chain: arcTestnet,
      transport: custom(this.activeProvider)
    }).extend(publicActions);
  }

  async connect(selectedUuid) {
    const selected = this.providers.find(p => p.info.uuid === selectedUuid);
    if (!selected) {
      throw new Error("Selected wallet not found.");
    }
    
    const provider = selected.provider;

    try {
      // Force permission prompt to guarantee a MetaMask popup every time
      try {
        await provider.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
      } catch (e) {
        // -32002 means a request is already pending in the background
        if (e.code === -32002) {
          throw new Error("You have a pending request in your wallet. Please open the extension to approve it.");
        }
        // 4001 means user rejected
        if (e.code === 4001) throw e; 
      }

      // Request account access
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      this.account = accounts[0];
      this.activeProvider = provider;
      this.activeProviderId = selected.info.uuid;

      // Force switch to Arc Testnet
      await this.switchToArcTestnet();

      // Get confirmed chain ID
      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      this.chainId = parseInt(chainIdHex, 16);

      // Initialize viem client
      this.initClients();

      // Persist session
      sessionStorage.setItem('arcpay_connected_account', this.account);
      sessionStorage.setItem('arcpay_connected_chain', this.chainId);
      sessionStorage.setItem('arcpay_connected_provider', this.activeProviderId);

      // Listen for chain/account changes
      provider.on('chainChanged', () => window.location.reload());
      provider.on('accountsChanged', () => window.location.reload());

      return { account: this.account, chainId: this.chainId };
    } catch (error) {
      console.error("Connection error:", error);
      throw error;
    }
  }

  async disconnect() {
    if (this.activeProvider) {
      try {
        await this.activeProvider.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }]
        });
      } catch (e) {
        console.warn("Wallet does not support revokePermissions", e);
      }
    }

    this.account = null;
    this.chainId = null;
    this.walletClient = null;
    this.activeProvider = null;
    this.activeProviderId = null;
    sessionStorage.removeItem('arcpay_connected_account');
    sessionStorage.removeItem('arcpay_connected_chain');
    sessionStorage.removeItem('arcpay_connected_provider');
  }

  async switchToArcTestnet() {
    if (!this.activeProvider) return;
    
    try {
      showToast("Check your wallet extension to approve the network switch to Arc Testnet.", "success");
      await this.activeProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${ARC_TESTNET_CHAIN_ID.toString(16)}` }],
      });
      this.chainId = ARC_TESTNET_CHAIN_ID;
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await this.activeProvider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`,
                chainName: 'Arc Testnet',
                nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                rpcUrls: ['https://rpc.testnet.arc.network'],
                blockExplorerUrls: ['https://testnet.arcscan.app']
              },
            ],
          });
          this.chainId = ARC_TESTNET_CHAIN_ID;
        } catch (addError) {
          throw new Error("Failed to add Arc Testnet to wallet");
        }
      } else {
        throw switchError;
      }
    }
  }

  async getBalance() {
    // Robust fallback: if EIP-6963 failed to announce the exact UUID in time,
    // but the user has an active account and window.ethereum is available, force use it.
    if (!this.activeProvider && this.account && window.ethereum) {
      this.activeProvider = window.ethereum;
    }

    if (!this.activeProvider || !this.account) throw new Error("Not connected");
    
    // Ensure viem client is ready
    if (!this.walletClient) this.initClients();
    if (!this.walletClient) return "0.0";

    try {
      // Verify the wallet is actually on the Arc Testnet right now
      const currentChainHex = await this.activeProvider.request({ method: 'eth_chainId' });
      const currentChain = parseInt(currentChainHex, 16);

      if (currentChain !== ARC_TESTNET_CHAIN_ID) {
        // If wallet drifted to another network after refresh, force switch back
        await this.switchToArcTestnet();
      }

      // Fetch Native Balance (USDC is the native gas token on Arc — 18 decimals per docs)
      const balance = await this.walletClient.getBalance({ address: this.account });
      return formatUnits(balance, USDC_NATIVE_DECIMALS);
    } catch (err) {
      console.error("Balance fetch failed:", err);
      throw err;
    }
  }

  async send(to, amountStr) {
    if (!this.walletClient || !this.account) throw new Error("Not connected");
    if (this.chainId !== ARC_TESTNET_CHAIN_ID) {
      await this.switchToArcTestnet();
    }

    try {
      const value = parseUnits(amountStr, USDC_NATIVE_DECIMALS);
      const hash = await this.walletClient.sendTransaction({
        to,
        value,
        account: this.account,
        chain: arcTestnet
      });

      // Wait for receipt with a 60-second timeout
      const receipt = await Promise.race([
        this.walletClient.waitForTransactionReceipt({ hash }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction confirmation timed out. Your transaction may still be processing — check ArcScan.')), 60000))
      ]);

      return { success: receipt.status === 'success', hash: receipt.transactionHash, receipt };
    } catch (error) {
      console.error("Send error:", error);
      throw error;
    }
  }

  async bridge(to, amountStr) {
    console.log(`Simulating Bridge from chain ${this.chainId} to Arc Testnet...`);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, hash: "0xsimulated_bridge_tx_hash", simulated: true });
      }, 3000);
    });
  }
}

export const arcKit = new ArcPayKit();
