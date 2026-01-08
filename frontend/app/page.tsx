'use client';

import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useChainId, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { CONTRACTS } from '../config';

// Min deposit constant
const MIN_DEPOSIT_BTC = 0.01;

// Strategy ABI - deposit, redeem, and status
const STRATEGY_ABI = [
    {
        name: 'getStrategyStatus',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{
            type: 'tuple',
            components: [
                { name: 'isPaused', type: 'bool' },
                { name: 'isCBTriggered', type: 'bool' },
                { name: 'isInOracleFailureMode', type: 'bool' },
                { name: 'totalHoldings', type: 'uint256' },
                { name: 'dailySwapUsed', type: 'uint256' },
                { name: 'dailySwapLimit', type: 'uint256' },
                { name: 'lastGasCost', type: 'uint256' },
                { name: 'rebalancesExecuted', type: 'uint256' },
                { name: 'rebalancesFailed', type: 'uint256' },
                { name: 'swapsExecuted', type: 'uint256' },
                { name: 'swapsFailed', type: 'uint256' },
                { name: 'wbtcAlloc', type: 'uint256' },
                { name: 'cbbtcAlloc', type: 'uint256' },
                { name: 'failCount', type: 'uint256' },
                { name: 'timeUntilReset', type: 'uint256' },
            ]
        }]
    },
    {
        name: 'deposit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'assets', type: 'uint256' },
            { name: 'receiver', type: 'address' }
        ],
        outputs: [{ name: 'shares', type: 'uint256' }]
    },
    {
        name: 'redeem',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'shares', type: 'uint256' },
            { name: 'receiver', type: 'address' },
            { name: 'owner', type: 'address' }
        ],
        outputs: [{ name: 'assets', type: 'uint256' }]
    },
] as const;

const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }]
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
        ],
        outputs: [{ type: 'uint256' }]
    },
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ type: 'bool' }]
    },
] as const;

// Stronger gradient with 30% color saturation
const gradientStyle = {
    background: `
        radial-gradient(ellipse at top left, rgba(243, 119, 187, 0.30) 0%, transparent 60%),
        radial-gradient(ellipse at bottom right, rgba(243, 119, 187, 0.22) 0%, transparent 60%),
        radial-gradient(ellipse at center, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.85) 40%, rgba(0, 82, 255, 0.25) 100%)
    `,
    minHeight: '100vh'
};

// Toast component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'pending'; onClose: () => void }) {
    useEffect(() => {
        if (type !== 'pending') {
            const timer = setTimeout(onClose, 5000);
            return () => clearTimeout(timer);
        }
    }, [type, onClose]);

    const bgColor = type === 'success' ? '#22C55E' : type === 'error' ? '#EF4444' : '#0052FF';

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: bgColor,
            color: 'white',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 9999,
            maxWidth: '400px',
            animation: 'slideIn 0.3s ease'
        }}>
            {type === 'pending' && (
                <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
            )}
            {type === 'success' && <span>✓</span>}
            {type === 'error' && <span>✕</span>}
            <span style={{ flex: 1 }}>{message}</span>
            {type !== 'pending' && (
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}>×</button>
            )}
        </div>
    );
}

export default function Home() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [depositAmount, setDepositAmount] = useState('');
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(true);
    const [btcPrice, setBtcPrice] = useState(91000);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'pending' } | null>(null);

    // Contract write hooks
    const { writeContract: approveToken, data: approveHash, isPending: isApproving } = useWriteContract();
    const { writeContract: depositAssets, data: depositHash, isPending: isDepositing } = useWriteContract();
    const { writeContract: redeemShares, data: redeemHash, isPending: isRedeeming } = useWriteContract();

    // Wait for transaction receipts
    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
    const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositHash });
    const { isLoading: isRedeemConfirming, isSuccess: isRedeemSuccess } = useWaitForTransactionReceipt({ hash: redeemHash });

    // Fetch live BTC price from CoinGecko
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
                const data = await res.json();
                if (data?.bitcoin?.usd) {
                    setBtcPrice(data.bitcoin.usd);
                }
            } catch (err) {
                console.log('Price fetch failed, using fallback');
            }
        };
        fetchPrice();
        const interval = setInterval(fetchPrice, 60000);
        return () => clearInterval(interval);
    }, []);

    // Check localStorage for terms acceptance
    useEffect(() => {
        const accepted = localStorage.getItem('jbtci-terms-accepted');
        if (accepted === 'true') {
            setHasAcceptedTerms(true);
            setShowTermsModal(false);
        }
    }, []);

    // Handle transaction success toasts
    useEffect(() => {
        if (isDepositSuccess) {
            setToast({ message: 'Deposit successful! You received jBTCi tokens.', type: 'success' });
            setDepositAmount('');
        }
    }, [isDepositSuccess]);

    useEffect(() => {
        if (isRedeemSuccess) {
            setToast({ message: 'Withdrawal successful! cbBTC sent to your wallet.', type: 'success' });
            setDepositAmount('');
        }
    }, [isRedeemSuccess]);

    useEffect(() => {
        if (isApproveSuccess && depositAmount) {
            // After approval succeeds, execute deposit
            handleDeposit();
        }
    }, [isApproveSuccess]);

    const handleAcceptTerms = () => {
        localStorage.setItem('jbtci-terms-accepted', 'true');
        setHasAcceptedTerms(true);
        setShowTermsModal(false);
    };

    const isMainnet = chainId === 8453;
    const contracts = isMainnet ? CONTRACTS.mainnet : CONTRACTS.testnet;
    const strategyAddress = contracts.strategy as `0x${string}`;
    const cbBTCAddress = contracts.cbBTC as `0x${string}`;

    // Read contract data
    const { data: strategyStatus, refetch: refetchStatus } = useReadContract({
        address: strategyAddress,
        abi: STRATEGY_ABI,
        functionName: 'getStrategyStatus',
    });

    const { data: cbBTCBalance, refetch: refetchCbBTC } = useReadContract({
        address: cbBTCAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    // jBTCi balance (strategy shares)
    const { data: jBTCiBalance, refetch: refetchJBTCi } = useReadContract({
        address: strategyAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    // Check cbBTC allowance for strategy
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: cbBTCAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, strategyAddress] : undefined,
    });

    const wbtcPercent = strategyStatus ? Number(strategyStatus.wbtcAlloc) / 100 : 50;
    const cbbtcPercent = strategyStatus ? Number(strategyStatus.cbbtcAlloc) / 100 : 50;
    const totalHoldings = strategyStatus ? Number(formatUnits(strategyStatus.totalHoldings, 8)) : 0;
    const depositUsdValue = (parseFloat(depositAmount || '0') * btcPrice);

    // Handle deposit
    const handleDeposit = async () => {
        if (!address || !depositAmount) return;

        try {
            const amountWei = parseUnits(depositAmount, 8); // cbBTC has 8 decimals

            // Check if approval is needed
            if (!allowance || allowance < amountWei) {
                setToast({ message: 'Approving cbBTC...', type: 'pending' });
                approveToken({
                    address: cbBTCAddress,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [strategyAddress, amountWei],
                });
                return; // Will continue after approval success
            }

            setToast({ message: 'Depositing cbBTC...', type: 'pending' });
            depositAssets({
                address: strategyAddress,
                abi: STRATEGY_ABI,
                functionName: 'deposit',
                args: [amountWei, address],
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
            setToast({ message: errorMessage, type: 'error' });
        }
    };

    // Handle withdraw
    const handleWithdraw = async () => {
        if (!address || !depositAmount) return;

        try {
            const sharesWei = parseUnits(depositAmount, 8);
            setToast({ message: 'Withdrawing cbBTC...', type: 'pending' });
            redeemShares({
                address: strategyAddress,
                abi: STRATEGY_ABI,
                functionName: 'redeem',
                args: [sharesWei, address, address],
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
            setToast({ message: errorMessage, type: 'error' });
        }
    };

    // Refetch balances after successful transactions
    useEffect(() => {
        if (isDepositSuccess || isRedeemSuccess) {
            refetchCbBTC();
            refetchJBTCi();
            refetchStatus();
            refetchAllowance();
        }
    }, [isDepositSuccess, isRedeemSuccess]);

    const isLoading = isApproving || isDepositing || isRedeeming || isApproveConfirming || isDepositConfirming || isRedeemConfirming;

    // Terms Modal - Light theme matching jBTCi brand
    if (showTermsModal && !hasAcceptedTerms) {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    maxWidth: '560px',
                    width: '100%',
                    padding: '40px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(0, 82, 255, 0.1)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
                            <Image src="/jubilee-logo.png" alt="Jubilee" width={36} height={36} />
                            <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#3B3B3B' }}>jBTCi</span>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#0052FF' }}>
                            Terms of Use
                        </h2>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, rgba(243, 119, 187, 0.08) 0%, rgba(0, 82, 255, 0.08) 100%)',
                        borderRadius: '16px',
                        padding: '24px',
                        marginBottom: '28px',
                        maxHeight: '320px',
                        overflowY: 'auto',
                        fontSize: '13px',
                        lineHeight: '1.7',
                        color: '#4B5563',
                        border: '1px solid rgba(0, 82, 255, 0.1)'
                    }}>
                        <p style={{ marginBottom: '16px', fontWeight: '600', color: '#3B3B3B' }}>
                            By using jBTCi, a product of Jubilee Protocol operated by Jubilee Labs, you acknowledge and agree:
                        </p>

                        <p style={{ marginBottom: '14px' }}>
                            <strong style={{ color: '#0052FF' }}>(a)</strong> jBTCi is provided on an "AS-IS" and "AS AVAILABLE" basis. Jubilee Labs and its affiliates expressly disclaim all representations, warranties, and conditions of any kind, whether express, implied, or statutory.
                        </p>

                        <p style={{ marginBottom: '14px' }}>
                            <strong style={{ color: '#0052FF' }}>(b)</strong> Jubilee Labs makes no warranty that jBTCi will meet your requirements, be available on an uninterrupted, timely, secure, or error-free basis, or be accurate, reliable, or free of harmful code.
                        </p>

                        <p style={{ marginBottom: '14px' }}>
                            <strong style={{ color: '#0052FF' }}>(c)</strong> You shall have no claim against Jubilee Labs or its affiliates for any loss arising from your use of jBTCi or Jubilee Protocol products.
                        </p>

                        <p style={{ marginBottom: '14px' }}>
                            <strong style={{ color: '#FFA500' }}>(d)</strong> DeFi protocols carry significant risks including: smart contract vulnerabilities, market volatility, oracle failures, and potential total loss of deposited funds.
                        </p>

                        <p>
                            <strong style={{ color: '#FFA500' }}>(e)</strong> This is not financial, legal, or tax advice. You are solely responsible for your own investment decisions and due diligence.
                        </p>
                    </div>

                    <button
                        onClick={handleAcceptTerms}
                        style={{
                            width: '100%',
                            padding: '20px 40px',
                            background: 'linear-gradient(135deg, #0052FF 0%, #003DBF 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            fontSize: '20px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(0, 82, 255, 0.4)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        I Understand & Accept
                    </button>

                    <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#9CA3AF' }}>
                        By clicking Accept, you agree to the Jubilee Labs Terms of Service
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* CSS for animations */}
            <style jsx global>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>

            {/* Toast notifications */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <main style={gradientStyle} className="flex flex-col">
                {/* Header */}
                <header className="px-6 py-5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Image src="/jubilee-logo.png" alt="Jubilee" width={28} height={28} />
                        <span className="text-xl font-bold text-[#3B3B3B]">jBTCi</span>
                    </div>
                    <ConnectButton />
                </header>

                {/* Main Content */}
                <div className="flex-1 flex items-center justify-center px-6 py-8">
                    <div className="w-full max-w-[480px]">
                        {/* Card */}
                        <div className="bg-white rounded-2xl p-8 shadow-lg border border-blue-100">
                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '32px', marginBottom: '32px', borderBottom: '1px solid #E5E7EB', paddingBottom: '16px' }}>
                                <button
                                    onClick={() => setActiveTab('deposit')}
                                    style={{
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: activeTab === 'deposit' ? '#0052FF' : '#9CA3AF',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Deposit
                                </button>
                                <button
                                    onClick={() => setActiveTab('withdraw')}
                                    style={{
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: activeTab === 'withdraw' ? '#0052FF' : '#9CA3AF',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Withdraw
                                </button>
                            </div>

                            {/* Input Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Input Token */}
                                <div style={{ background: '#F9FAFB', borderRadius: '16px', padding: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
                                        <span>{activeTab === 'deposit' ? 'You deposit' : 'You withdraw'}</span>
                                        <span>
                                            Balance: <span style={{ color: '#3B3B3B', fontWeight: '500' }}>
                                                {activeTab === 'deposit'
                                                    ? (cbBTCBalance ? parseFloat(formatUnits(cbBTCBalance, 8)).toFixed(4) : '0.00')
                                                    : (jBTCiBalance ? parseFloat(formatUnits(jBTCiBalance, 8)).toFixed(4) : '0.00')
                                                }
                                            </span>
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0"
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                            style={{
                                                fontSize: '28px',
                                                fontWeight: '600',
                                                background: 'transparent',
                                                border: 'none',
                                                outline: 'none',
                                                width: '100%',
                                                color: '#3B3B3B'
                                            }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                            <button
                                                onClick={() => {
                                                    const balance = activeTab === 'deposit' ? cbBTCBalance : jBTCiBalance;
                                                    setDepositAmount(balance ? formatUnits(balance, 8) : '0');
                                                }}
                                                style={{ color: '#0052FF', fontSize: '14px', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                Max
                                            </button>
                                            {activeTab === 'deposit' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#DBEAFE', borderRadius: '20px', padding: '6px 12px' }}>
                                                    <div style={{ width: '20px', height: '20px', background: '#0052FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ color: 'white', fontSize: '9px', fontWeight: 'bold' }}>cb</span>
                                                    </div>
                                                    <span style={{ color: '#3B3B3B', fontSize: '14px', fontWeight: '500' }}>cbBTC</span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FEF3C7', borderRadius: '20px', padding: '6px 12px' }}>
                                                    <div style={{ width: '20px', height: '20px', background: '#FFA500', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ color: 'white', fontSize: '9px', fontWeight: 'bold' }}>j</span>
                                                    </div>
                                                    <span style={{ color: '#3B3B3B', fontSize: '14px', fontWeight: '500' }}>jBTCi</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '12px' }}>≈ ${depositUsdValue.toLocaleString()}</div>
                                </div>

                                {/* Arrow - Click to toggle */}
                                <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0' }}>
                                    <button
                                        onClick={() => setActiveTab(activeTab === 'deposit' ? 'withdraw' : 'deposit')}
                                        style={{
                                            background: 'white',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '50%',
                                            padding: '12px',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B3B3B" strokeWidth="2">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <polyline points="19 12 12 19 5 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Output Token */}
                                <div style={{ background: '#F9FAFB', borderRadius: '16px', padding: '20px' }}>
                                    <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>You receive</div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '28px', fontWeight: '600', color: '#3B3B3B' }}>{depositAmount || '0'}</span>
                                        {activeTab === 'deposit' ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF3C7', borderRadius: '20px', padding: '8px 16px' }}>
                                                <div style={{ width: '24px', height: '24px', background: '#FFA500', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>j</span>
                                                </div>
                                                <span style={{ color: '#3B3B3B', fontSize: '14px', fontWeight: '500' }}>jBTCi</span>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#DBEAFE', borderRadius: '20px', padding: '8px 16px' }}>
                                                <div style={{ width: '24px', height: '24px', background: '#0052FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>cb</span>
                                                </div>
                                                <span style={{ color: '#3B3B3B', fontSize: '14px', fontWeight: '500' }}>cbBTC</span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '12px' }}>1 {activeTab === 'deposit' ? 'cbBTC' : 'jBTCi'} = 1 {activeTab === 'deposit' ? 'jBTCi' : 'cbBTC'}</div>
                                </div>

                                {/* Min deposit + Get cbBTC hint */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9CA3AF', padding: '0 8px' }}>
                                    <span>Min. deposit: {MIN_DEPOSIT_BTC} BTC ≈ ${(MIN_DEPOSIT_BTC * btcPrice).toFixed(0)}</span>
                                    <a
                                        href="https://app.uniswap.org/swap?chain=base&outputCurrency=0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#0052FF', textDecoration: 'underline' }}
                                    >
                                        Get cbBTC →
                                    </a>
                                </div>

                                {/* Action Button */}
                                {!isConnected ? (
                                    <div style={{ width: '100%' }}>
                                        <ConnectButton.Custom>
                                            {({ openConnectModal }) => (
                                                <button
                                                    onClick={openConnectModal}
                                                    style={{
                                                        width: '100%',
                                                        padding: '18px',
                                                        marginTop: '8px',
                                                        borderRadius: '50px',
                                                        fontSize: '18px',
                                                        fontWeight: '600',
                                                        background: 'linear-gradient(135deg, #0052FF 0%, #003DBF 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 14px rgba(0, 82, 255, 0.3)'
                                                    }}
                                                >
                                                    Connect Wallet
                                                </button>
                                            )}
                                        </ConnectButton.Custom>
                                    </div>
                                ) : (
                                    <button
                                        onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
                                        disabled={isLoading || !depositAmount || parseFloat(depositAmount) <= 0}
                                        style={{
                                            width: '100%',
                                            padding: '18px',
                                            marginTop: '8px',
                                            borderRadius: '50px',
                                            fontSize: '18px',
                                            fontWeight: '600',
                                            background: (depositAmount && parseFloat(depositAmount) > 0 && !isLoading)
                                                ? 'linear-gradient(135deg, #0052FF 0%, #003DBF 100%)'
                                                : '#E5E7EB',
                                            color: (depositAmount && parseFloat(depositAmount) > 0 && !isLoading) ? 'white' : '#9CA3AF',
                                            border: 'none',
                                            cursor: (depositAmount && parseFloat(depositAmount) > 0 && !isLoading) ? 'pointer' : 'not-allowed',
                                            boxShadow: (depositAmount && parseFloat(depositAmount) > 0 && !isLoading) ? '0 4px 14px rgba(0, 82, 255, 0.3)' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        {isLoading && (
                                            <div style={{
                                                width: '18px',
                                                height: '18px',
                                                border: '2px solid currentColor',
                                                borderTopColor: 'transparent',
                                                borderRadius: '50%',
                                                animation: 'spin 1s linear infinite'
                                            }} />
                                        )}
                                        {isLoading
                                            ? 'Processing...'
                                            : (depositAmount && parseFloat(depositAmount) > 0
                                                ? (activeTab === 'deposit' ? 'Deposit cbBTC' : 'Withdraw cbBTC')
                                                : 'Enter an amount'
                                            )
                                        }
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '24px' }}>
                            <div style={{ background: 'white', borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F3F4F6' }}>
                                <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px' }}>TVL</div>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#3B3B3B' }}>{totalHoldings.toFixed(2)}</div>
                            </div>
                            <div style={{ background: 'white', borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F3F4F6' }}>
                                <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px' }}>APY</div>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0052FF' }}>6-10%</div>
                            </div>
                            <div style={{ background: 'white', borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F3F4F6' }}>
                                <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px' }}>WBTC</div>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFA500' }}>{wbtcPercent.toFixed(0)}%</div>
                            </div>
                            <div style={{ background: 'white', borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F3F4F6' }}>
                                <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px' }}>cbBTC</div>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0052FF' }}>{cbbtcPercent.toFixed(0)}%</div>
                            </div>
                        </div>

                        {/* User Balances */}
                        {isConnected && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '13px', color: '#6B7280' }}>
                                <span>
                                    Your cbBTC: <strong style={{ color: '#0052FF' }}>{cbBTCBalance ? parseFloat(formatUnits(cbBTCBalance, 8)).toFixed(4) : '0'}</strong>
                                </span>
                                <span>
                                    Your jBTCi: <strong style={{ color: '#FFA500' }}>{jBTCiBalance ? parseFloat(formatUnits(jBTCiBalance, 8)).toFixed(4) : '0'}</strong>
                                </span>
                            </div>
                        )}

                        {/* Status & Links */}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', marginTop: '20px', fontSize: '14px' }}>
                            <span style={{ color: strategyStatus?.isPaused ? '#EF4444' : '#22C55E' }}>
                                ● {strategyStatus?.isPaused ? 'Paused' : 'Active'}
                            </span>
                            <a href="https://basescan.org/address/0x7d0Ae1Fa145F3d5B511262287fF686C25000816D" target="_blank" rel="noopener noreferrer" style={{ color: '#9CA3AF' }}>
                                Contract ↗
                            </a>
                            <a href="https://github.com/Jubilee-Protocol/jBTCi-on-Base/blob/main/docs/AUDIT_REPORT.md" target="_blank" rel="noopener noreferrer" style={{ color: '#9CA3AF' }}>
                                Audit ↗
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer style={{ padding: '24px', textAlign: 'center', fontSize: '14px', color: '#9CA3AF' }}>
                    2026 © Jubilee Labs
                </footer>
            </main>
        </>
    );
}
