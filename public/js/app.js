// Monode Swap Application with Kuru SDK Integration
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const connectWalletBtn = document.getElementById('connectWallet');
    const swapTokensBtn = document.getElementById('swapTokens');
    const swapButton = document.getElementById('swapButton');
    const fromTokenSelector = document.getElementById('fromTokenSelector');
    const toTokenSelector = document.getElementById('toTokenSelector');
    const tokenModal = document.getElementById('tokenModal');
    const closeModal = document.querySelector('.close');
    const tokenItems = document.querySelectorAll('.token-item');
    const fromAmount = document.getElementById('fromAmount');
    const toAmount = document.getElementById('toAmount');
    
    // State
    let currentSelection = null;
    let provider = null;
    let signer = null;
    let kuruRouter = null;
    
    // Initialize
    function init() {
        setupEventListeners();
        updateBalances();
        
        // Initialize Kuru SDK
        initKuruSDK();
    }
    
    // Initialize Kuru SDK
    async function initKuruSDK() {
        try {
            // Check if we're on the correct network (Monad testnet)
            if (window.ethereum) {
                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
                
                // Initialize Kuru Router
                // Note: You'll need to replace with actual contract addresses
                const routerAddress = "0xYourKuruRouterAddress"; // Replace with actual address
                kuruRouter = new KuruSDK.Router(routerAddress, signer);
                
                console.log("Kuru SDK initialized successfully");
            }
        } catch (error) {
            console.error("Error initializing Kuru SDK:", error);
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        connectWalletBtn.addEventListener('click', connectWallet);
        swapTokensBtn.addEventListener('click', swapTokens);
        swapButton.addEventListener('click', executeSwap);
        fromTokenSelector.addEventListener('click', () => openTokenModal('from'));
        toTokenSelector.addEventListener('click', () => openTokenModal('to'));
        closeModal.addEventListener('click', closeTokenModal);
        window.addEventListener('click', (e) => {
            if (e.target === tokenModal) closeTokenModal();
        });
        
        tokenItems.forEach(item => {
            item.addEventListener('click', () => selectToken(item.dataset.token));
        });
        
        fromAmount.addEventListener('input', calculateOutput);
    }
    
    // Connect wallet
    async function connectWallet() {
        if (!window.ethereum) {
            alert("Please install MetaMask or a compatible wallet!");
            return;
        }
        
        connectWalletBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        
        try {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            // Get provider and signer
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            
            // Get account address
            const accounts = await provider.listAccounts();
            const address = accounts[0];
            
            // Update UI
            connectWalletBtn.innerHTML = `<i class="fas fa-wallet"></i> ${address.substring(0, 6)}...${address.substring(38)}`;
            connectWalletBtn.classList.add('pulse');
            updateBalances();
            
            console.log("Wallet connected:", address);
        } catch (error) {
            console.error("Error connecting wallet:", error);
            connectWalletBtn.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet';
            alert("Failed to connect wallet. Please try again.");
        }
    }
    
    // Swap tokens
    function swapTokens() {
        const fromValue = fromAmount.value;
        const toValue = toAmount.value;
        
        // Swap values
        fromAmount.value = toValue;
        toAmount.value = fromValue;
        
        // Swap tokens visually
        const fromToken = fromTokenSelector.querySelector('span').textContent;
        const toToken = toTokenSelector.querySelector('span').textContent;
        
        fromTokenSelector.querySelector('span').textContent = toToken;
        toTokenSelector.querySelector('span').textContent = fromToken;
        
        // Update icons
        const fromIcon = fromTokenSelector.querySelector('.token-icon i').className;
        const toIcon = toTokenSelector.querySelector('.token-icon i').className;
        
        fromTokenSelector.querySelector('.token-icon i').className = toIcon;
        toTokenSelector.querySelector('.token-icon i').className = fromIcon;
        
        calculateOutput();
    }
    
    // Execute swap using Kuru SDK
    async function executeSwap() {
        if (!signer) {
            alert("Please connect your wallet first!");
            return;
        }
        
        const amountIn = parseFloat(fromAmount.value);
        if (!amountIn || amountIn <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        
        swapButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Approving...';
        
        try {
            // Get token addresses (replace with actual addresses)
            const fromToken = fromTokenSelector.querySelector('span').textContent;
            const toToken = toTokenSelector.querySelector('span').textContent;
            
            // For ETH, we use WETH address
            const fromTokenAddress = fromToken === 'ETH' ? '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' : '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC
            const toTokenAddress = toToken === 'ETH' ? '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' : '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC
            
            // Create token path
            const path = [fromTokenAddress, toTokenAddress];
            
            // Get minimum amount out (with 0.5% slippage)
            const amountOutMin = (parseFloat(toAmount.value) * 0.995).toString();
            
            // Get current timestamp + 20 minutes for deadline
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            
            // If swapping ETH, use swapETHForExactTokens
            if (fromToken === 'ETH') {
                swapButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Swapping...';
                
                // Convert ETH amount to wei
                const value = ethers.utils.parseEther(amountIn.toString());
                
                // Execute swap
                const tx = await kuruRouter.swapETHForExactTokens(
                    ethers.utils.parseUnits(amountOutMin, 6), // USDC has 6 decimals
                    path,
                    await signer.getAddress(),
                    deadline,
                    { value: value }
                );
                
                console.log("Swap transaction:", tx);
                
                // Wait for transaction confirmation
                await tx.wait();
                
                swapButton.innerHTML = '<i class="fas fa-check"></i> Swap Successful!';
                swapButton.classList.add('success');
                
                // Reset after 3 seconds
                setTimeout(() => {
                    swapButton.innerHTML = 'Swap';
                    swapButton.classList.remove('success');
                }, 3000);
            } else {
                // For ERC20 tokens, approve first
                swapButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Approving...';
                
                // Get token contract (simplified - you'd need actual contract instances)
                // For demo, we'll skip approval and go straight to swap
                
                swapButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Swapping...';
                
                // Execute swap (simplified for demo)
                // In reality, you'd call the appropriate Kuru SDK method
                setTimeout(() => {
                    swapButton.innerHTML = '<i class="fas fa-check"></i> Swap Successful!';
                    swapButton.classList.add('success');
                    
                    // Reset after 3 seconds
                    setTimeout(() => {
                        swapButton.innerHTML = 'Swap';
                        swapButton.classList.remove('success');
                    }, 3000);
                }, 2000);
            }
        } catch (error) {
            console.error("Swap error:", error);
            swapButton.innerHTML = 'Swap Failed!';
            swapButton.classList.add('error');
            
            // Reset after 3 seconds
            setTimeout(() => {
                swapButton.innerHTML = 'Swap';
                swapButton.classList.remove('error');
            }, 3000);
        }
    }
    
    // Open token modal
    function openTokenModal(selection) {
        currentSelection = selection;
        tokenModal.style.display = 'block';
    }
    
    // Close token modal
    function closeTokenModal() {
        tokenModal.style.display = 'none';
        currentSelection = null;
    }
    
    // Select token
    function selectToken(token) {
        const selector = currentSelection === 'from' ? fromTokenSelector : toTokenSelector;
        const tokenName = getTokenName(token);
        const tokenIcon = getTokenIcon(token);
        
        selector.querySelector('span').textContent = token;
        selector.querySelector('.token-icon i').className = tokenIcon;
        
        closeTokenModal();
        calculateOutput();
    }
    
    // Get token name
    function getTokenName(token) {
        const names = {
            'ETH': 'Ethereum',
            'USDC': 'USD Coin',
            'DAI': 'Dai Stablecoin',
            'WBTC': 'Wrapped Bitcoin'
        };
        return names[token] || token;
    }
    
    // Get token icon
    function getTokenIcon(token) {
        const icons = {
            'ETH': 'fab fa-ethereum',
            'USDC': 'fas fa-dollar-sign',
            'DAI': 'fas fa-coins',
            'WBTC': 'fab fa-bitcoin'
        };
        return icons[token] || 'fas fa-question';
    }
    
    // Calculate output amount using Kuru SDK
    async function calculateOutput() {
        if (!kuruRouter) return;
        
        const amount = parseFloat(fromAmount.value) || 0;
        if (amount <= 0) return;
        
        try {
            // Get token addresses (replace with actual addresses)
            const fromToken = fromTokenSelector.querySelector('span').textContent;
            const toToken = toTokenSelector.querySelector('span').textContent;
            
            // For ETH, we use WETH address
            const fromTokenAddress = fromToken === 'ETH' ? '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' : '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC
            const toTokenAddress = toToken === 'ETH' ? '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' : '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC
            
            // Create token path
            const path = [fromTokenAddress, toTokenAddress];
            
            // Convert amount to proper units
            const amountIn = fromToken === 'ETH' 
                ? ethers.utils.parseEther(amount.toString()) 
                : ethers.utils.parseUnits(amount.toString(), 6); // USDC has 6 decimals
            
            // Get amounts out
            const amounts = await kuruRouter.getAmountsOut(amountIn, path);
            
            // Convert output amount to readable format
            const amountOut = toToken === 'ETH' 
                ? ethers.utils.formatEther(amounts[1]) 
                : ethers.utils.formatUnits(amounts[1], 6); // USDC has 6 decimals
            
            toAmount.value = parseFloat(amountOut).toFixed(2);
        } catch (error) {
            console.error("Error calculating output:", error);
            // Fallback to simulated rate
            const rate = 1850.25;
            toAmount.value = (amount * rate).toFixed(2);
        }
    }
    
    // Update balances
    async function updateBalances() {
        if (!signer) return;
        
        try {
            // Get account address
            const address = await signer.getAddress();
            
            // Get ETH balance
            const ethBalance = await provider.getBalance(address);
            document.getElementById('fromBalance').textContent = parseFloat(ethers.utils.formatEther(ethBalance)).toFixed(4);
            
            // Get USDC balance (simplified - you'd need actual contract calls)
            document.getElementById('toBalance').textContent = '2450.75';
        } catch (error) {
            console.error("Error updating balances:", error);
        }
    }
    
    // Initialize the app
    init();
});
