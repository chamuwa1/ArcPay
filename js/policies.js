const policyContent = {
  terms: {
    title: "Terms of Service",
    body: `
      <h4>1. Acceptance of Terms</h4>
      <p>By using ArcPay, you agree to these Terms of Service. ArcPay is a decentralized payment gateway interface for the Arc Testnet.</p>
      
      <h4>2. Non-Custodial Nature</h4>
      <p>ArcPay does not hold, custody, or process funds directly. All transactions occur peer-to-peer on the Arc blockchain network.</p>

      <h4>3. Testnet Disclaimer</h4>
      <p>ArcPay currently operates on the Arc Testnet. Funds used (such as testnet USDC) hold no real-world value. We are not liable for any testnet assets lost or burned.</p>

      <h4>4. Merchant Responsibilities</h4>
      <p>Merchants are solely responsible for ensuring the accuracy of the payment links they generate and confirming transaction finality before releasing goods or services.</p>
    `
  },
  privacy: {
    title: "Privacy Policy",
    body: `
      <h4>1. Data Collection</h4>
      <p>ArcPay collects minimal data required for operations. We store transaction intent metadata (memo, amount, merchant address) in our database to facilitate the checkout flow.</p>

      <h4>2. Wallet Addresses</h4>
      <p>Your connected public wallet address is stored in your local browser session and logged in our database only when you generate or fulfill a payment. We do not have access to your private keys.</p>

      <h4>3. Third-Party Services</h4>
      <p>We use Supabase for database hosting and Viem/RPC endpoints for blockchain interactions. Your public on-chain activity is visible on the Arc blockchain explorer.</p>
    `
  },
  security: {
    title: "Security Policy",
    body: `
      <h4>1. Cryptographic Verification</h4>
      <p>ArcPay uses robust serverless functions to cryptographically verify all transactions directly against the Arc RPC before marking them as completed.</p>

      <h4>2. Client-Side Security</h4>
      <p>Our frontend interfaces do not handle sensitive keys. Wallet interactions are isolated using EIP-6963 provider standards, ensuring your wallet handles all signing securely.</p>

      <h4>3. Bug Reporting</h4>
      <p>If you discover a vulnerability in the ArcPay protocol or interface, please contact the development team immediately. Avoid exploiting the vulnerability on public networks.</p>
    `
  }
};

(() => {
  const policyModal = document.getElementById('policy-modal');
  const policyTitle = document.getElementById('policy-title');
  const policyContentDiv = document.getElementById('policy-content');
  const btnClosePolicy = document.getElementById('btn-close-policy');

  // Add click listeners to all policy links
  document.querySelectorAll('.policy-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const policyKey = e.target.getAttribute('data-policy');
      const policy = policyContent[policyKey];
      
      if (policy) {
        policyTitle.textContent = policy.title;
        policyContentDiv.innerHTML = policy.body;
        policyModal.classList.add('active');
      }
    });
  });

  // Close modal when clicking the X
  btnClosePolicy?.addEventListener('click', () => {
    policyModal.classList.remove('active');
  });

  // Close modal when clicking outside the card
  policyModal?.addEventListener('click', (e) => {
    if (e.target === policyModal) {
      policyModal.classList.remove('active');
    }
  });
})();
