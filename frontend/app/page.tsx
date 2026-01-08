'use client';

import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useChainId } from 'wagmi';
import { useState } from 'react';
import { formatUnits } from 'viem';
import { CONTRACTS } from '../config';

// BTC price constant (Jan 2026)
const BTC_PRICE_USD = 98500;
const MIN_DEPOSIT_BTC = 0.01;

// Strategy ABI
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
] as const;

const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }]
    },
] as const;

export default function Home() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [depositAmount, setDepositAmount] = useState('');
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

    const isMainnet = chainId === 8453;
    const contracts = isMainnet ? CONTRACTS.mainnet : CONTRACTS.testnet;
    const strategyAddress = contracts.strategy as `0x${string}`;
    const cbBTCAddress = contracts.cbBTC as `0x${string}`;

    const { data: strategyStatus } = useReadContract({
        address: strategyAddress,
        abi: STRATEGY_ABI,
        functionName: 'getStrategyStatus',
    });

    const { data: userBalance } = useReadContract({
        address: cbBTCAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    const wbtcPercent = strategyStatus ? Number(strategyStatus.wbtcAlloc) / 100 : 50;
    const cbbtcPercent = strategyStatus ? Number(strategyStatus.cbbtcAlloc) / 100 : 50;
    const totalHoldings = strategyStatus ? Number(formatUnits(strategyStatus.totalHoldings, 8)) : 0;
    const depositUsdValue = (parseFloat(depositAmount || '0') * BTC_PRICE_USD);

    // ========== LANDING PAGE ==========
    if (!isConnected) {
        return (
            <main className="bg-vignette min-h-screen flex flex-col">
                {/* Hidden RainbowKit button for programmatic access */}
                <div className="fixed -top-full">
                    <ConnectButton />
                </div>

                {/* Main Content - Centered */}
                <div className="flex-1 flex items-center justify-center px-6 py-12">
                    <div className="text-center max-w-xl">
                        {/* Main Headline */}
                        <h1 className="text-3xl sm:text-4xl font-bold text-[#3B3B3B] mb-4 leading-tight">
                            <span className="font-bold">jBTCi</span> is automated{' '}
                            <span className="text-btc-orange font-bold">BTC</span> yield. 50/50 cbBTC + wBTC.
                        </h1>

                        {/* Subheadlines */}
                        <p className="text-xl sm:text-2xl text-[#3B3B3B] mb-2">
                            Deposit cbBTC—Mint jBTCi
                        </p>
                        <p className="text-xl sm:text-2xl text-[#3B3B3B] mb-10">
                            Earn Bitcoin on <span className="text-blue-primary font-semibold">Base</span>
                        </p>

                        {/* Connect Wallet Button - Pill shaped, Base Blue */}
                        <button
                            onClick={() => {
                                const connectBtn = document.querySelector('[data-testid="rk-connect-button"]') as HTMLButtonElement;
                                if (connectBtn) connectBtn.click();
                            }}
                            className="btn-blue text-lg mb-10"
                        >
                            Connect Wallet
                        </button>

                        {/* Social Icons */}
                        <div className="flex justify-center gap-6 mb-8">
                            {/* Base icon */}
                            <a href="https://base.org" target="_blank" rel="noopener noreferrer" className="social-icon">
                                <svg width="24" height="24" viewBox="0 0 111 111" fill="none">
                                    <circle cx="55.5" cy="55.5" r="55.5" fill="#0052FF" />
                                    <path d="M55.5 95C77.315 95 95 77.315 95 55.5C95 33.685 77.315 16 55.5 16C33.685 16 16 33.685 16 55.5C16 77.315 33.685 95 55.5 95Z" fill="#0052FF" />
                                    <path d="M55.4949 94.3373C77.0196 94.3373 94.4775 76.8793 94.4775 55.3546C94.4775 33.83 77.0196 16.372 55.4949 16.372C35.4598 16.372 18.9278 31.6306 16.6797 51.0631H67.0558V59.6462H16.6797C18.9278 79.0787 35.4598 94.3373 55.4949 94.3373Z" fill="white" />
                                </svg>
                            </a>
                            {/* X/Twitter */}
                            <a href="https://x.com/jubileelabs" target="_blank" rel="noopener noreferrer" className="social-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#3B3B3B">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </a>
                            {/* GitHub */}
                            <a href="https://github.com/Jubilee-Protocol/jBTCi-on-Base" target="_blank" rel="noopener noreferrer" className="social-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="#3B3B3B">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                            </a>
                        </div>

                        {/* Footer */}
                        <p className="text-sm text-gray-500">2026 © Jubilee Labs</p>
                    </div>
                </div>
            </main>
        );
    }

    // ========== DASHBOARD (Connected) ==========
    return (
        <main className="bg-vignette min-h-screen flex flex-col">
            {/* Header */}
            <header className="px-6 py-5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Image src="/jubilee-logo.png" alt="Jubilee" width={28} height={28} />
                    <span className="text-xl font-bold text-[#3B3B3B]">jBTCi</span>
                </div>
                <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" />
            </header>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-[480px]">
                    {/* Card */}
                    <div className="bg-white rounded-2xl p-8 shadow-lg border border-blue-100">
                        {/* Tabs */}
                        <div className="flex gap-8 mb-8 border-b border-gray-200 pb-4">
                            <button
                                onClick={() => setActiveTab('deposit')}
                                className={`text-lg font-semibold transition-colors ${activeTab === 'deposit' ? 'text-blue-primary' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Deposit
                            </button>
                            <button
                                onClick={() => setActiveTab('withdraw')}
                                className={`text-lg font-semibold transition-colors ${activeTab === 'withdraw' ? 'text-blue-primary' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Withdraw
                            </button>
                        </div>

                        {/* Input Section */}
                        <div className="space-y-6">
                            {/* Input Token (cbBTC for deposit, jBTCi for withdraw) */}
                            <div className="bg-gray-50 rounded-2xl p-5">
                                <div className="flex justify-between text-sm text-gray-500 mb-4">
                                    <span>{activeTab === 'deposit' ? 'You deposit' : 'You withdraw'}</span>
                                    <span>Balance: <span className="text-[#3B3B3B] font-medium">{userBalance ? parseFloat(formatUnits(userBalance, 8)).toFixed(4) : '0.00'}</span></span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        className="text-3xl font-semibold placeholder:text-gray-300"
                                    />
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => setDepositAmount(userBalance ? formatUnits(userBalance, 8) : '0')}
                                            className="text-blue-primary text-sm font-medium hover:underline"
                                        >
                                            Max
                                        </button>
                                        {activeTab === 'deposit' ? (
                                            <div className="flex items-center gap-1.5 bg-blue-100 rounded-full px-3 py-1.5">
                                                <div className="w-5 h-5 bg-[#0052FF] rounded-full flex items-center justify-center">
                                                    <span className="text-white text-[9px] font-bold">cb</span>
                                                </div>
                                                <span className="text-[#3B3B3B] text-sm font-medium">cbBTC</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 bg-orange-100 rounded-full px-3 py-1.5">
                                                <div className="w-5 h-5 bg-[#FFA500] rounded-full flex items-center justify-center">
                                                    <span className="text-white text-[9px] font-bold">j</span>
                                                </div>
                                                <span className="text-[#3B3B3B] text-sm font-medium">jBTCi</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-sm text-gray-400 mt-3">≈ ${depositUsdValue.toLocaleString()}</div>
                            </div>

                            {/* Arrow - Click to toggle */}
                            <div className="flex justify-center -my-1">
                                <button
                                    onClick={() => setActiveTab(activeTab === 'deposit' ? 'withdraw' : 'deposit')}
                                    className="bg-white border border-gray-200 rounded-full p-3 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B3B3B" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <polyline points="19 12 12 19 5 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Output Token (jBTCi for deposit, cbBTC for withdraw) */}
                            <div className="bg-gray-50 rounded-2xl p-5">
                                <div className="text-sm text-gray-500 mb-4">You receive</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-3xl font-semibold text-[#3B3B3B]">{depositAmount || '0'}</span>
                                    {activeTab === 'deposit' ? (
                                        <div className="flex items-center gap-2 bg-orange-100 rounded-full px-4 py-2">
                                            <div className="w-6 h-6 bg-[#FFA500] rounded-full flex items-center justify-center">
                                                <span className="text-white text-[10px] font-bold">j</span>
                                            </div>
                                            <span className="text-[#3B3B3B] text-sm font-medium">jBTCi</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 bg-blue-100 rounded-full px-4 py-2">
                                            <div className="w-6 h-6 bg-[#0052FF] rounded-full flex items-center justify-center">
                                                <span className="text-white text-[10px] font-bold">cb</span>
                                            </div>
                                            <span className="text-[#3B3B3B] text-sm font-medium">cbBTC</span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-sm text-gray-400 mt-3">1 {activeTab === 'deposit' ? 'cbBTC' : 'jBTCi'} = 1 {activeTab === 'deposit' ? 'jBTCi' : 'cbBTC'}</div>
                            </div>

                            {/* Min deposit notice */}
                            <div className="flex justify-between text-xs text-gray-400 px-2 mt-2">
                                <span>Min. deposit: {MIN_DEPOSIT_BTC} BTC</span>
                                <span>≈ ${(MIN_DEPOSIT_BTC * BTC_PRICE_USD).toFixed(0)}</span>
                            </div>

                            {/* Action Button */}
                            <button
                                className={`w-full py-4 mt-2 rounded-full text-lg font-semibold transition-all ${depositAmount && parseFloat(depositAmount) > 0
                                    ? 'btn-blue'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {depositAmount && parseFloat(depositAmount) > 0 ? (activeTab === 'deposit' ? 'Deposit cbBTC' : 'Withdraw cbBTC') : 'Enter an amount'}
                            </button>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-4 gap-3 mt-6">
                        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                            <div className="text-[10px] text-gray-400 uppercase mb-1">TVL</div>
                            <div className="text-sm font-semibold text-[#3B3B3B]">{totalHoldings.toFixed(2)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                            <div className="text-[10px] text-gray-400 uppercase mb-1">APY</div>
                            <div className="text-sm font-semibold text-blue-primary">6-10%</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                            <div className="text-[10px] text-gray-400 uppercase mb-1">WBTC</div>
                            <div className="text-sm font-semibold text-btc-orange">{wbtcPercent.toFixed(0)}%</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                            <div className="text-[10px] text-gray-400 uppercase mb-1">cbBTC</div>
                            <div className="text-sm font-semibold text-blue-primary">{cbbtcPercent.toFixed(0)}%</div>
                        </div>
                    </div>

                    {/* Status & Links */}
                    <div className="flex justify-center items-center gap-8 mt-8 text-sm">
                        <span className={strategyStatus?.isPaused ? 'text-red-500' : 'text-green-500'}>
                            ● {strategyStatus?.isPaused ? 'Paused' : 'Active'}
                        </span>
                        <a href="https://basescan.org/address/0x7d0Ae1Fa145F3d5B511262287fF686C25000816D" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-primary transition-colors">
                            Contract ↗
                        </a>
                        <a href="https://github.com/Jubilee-Protocol/jBTCi-on-Base" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-primary transition-colors">
                            Docs ↗
                        </a>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="py-6 text-center text-gray-400 text-sm">
                2026 © Jubilee Labs
            </footer>
        </main>
    );
}
