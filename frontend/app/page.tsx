'use client';

import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useChainId } from 'wagmi';
import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { CONTRACTS } from '../config';

// BTC price constant (Jan 2026)
const BTC_PRICE_USD = 98500;
const MIN_DEPOSIT_BTC = 0.001;

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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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

    if (!mounted) {
        return (
            <main className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-gray-600 animate-pulse">Loading...</div>
            </main>
        );
    }

    // ========== LANDING PAGE ==========
    if (!isConnected) {
        return (
            <main className="min-h-screen bg-black flex flex-col">
                {/* Header - minimal */}
                <header className="px-6 py-5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Image src="/jubilee-logo.png" alt="jBTCi" width={24} height={24} />
                        <span className="text-sm font-medium text-pink-400">jBTCi</span>
                    </div>
                    <ConnectButton />
                </header>

                {/* Main Content - Lots of space */}
                <div className="flex-1 flex items-center justify-center px-4 pb-20">
                    <div className="w-full max-w-[480px] text-center">
                        {/* Logo with glow */}
                        <div className="flex justify-center mb-8">
                            <div className="relative">
                                <div className="absolute inset-0 bg-pink-500/30 blur-3xl rounded-full scale-150"></div>
                                <Image
                                    src="/jubilee-logo.png"
                                    alt="jBTCi"
                                    width={72}
                                    height={72}
                                    className="relative z-10"
                                    priority
                                />
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl sm:text-5xl font-bold mb-3">
                            <span className="text-pink-400">The Bitcoin</span>
                            <br />
                            <span className="text-white">Index Fund</span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-gray-400 text-lg mb-10">
                            Earn <span className="text-pink-400 font-semibold">6-10% APY</span> on your Bitcoin
                        </p>

                        {/* Card */}
                        <div className="bg-[#141414] rounded-2xl border border-gray-800/50 overflow-hidden text-left">
                            {/* Stats Row */}
                            <div className="flex justify-between items-start px-6 pt-5 pb-4">
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">TVL</div>
                                    <div className="text-lg font-semibold text-white">{totalHoldings.toFixed(4)} BTC</div>
                                    <div className="text-xs text-gray-600">${(totalHoldings * BTC_PRICE_USD).toLocaleString()}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Target APY</div>
                                    <div className="text-lg font-semibold text-pink-400">6-10%</div>
                                </div>
                            </div>

                            {/* Allocation Row */}
                            <div className="px-6 py-5 border-t border-gray-800/50">
                                <div className="flex items-center justify-center gap-4 mb-6">
                                    {/* WBTC */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                                            <span className="text-white font-bold text-sm">W</span>
                                        </div>
                                        <div>
                                            <div className="text-white font-medium">WBTC</div>
                                            <div className="text-gray-500 text-sm">50%</div>
                                        </div>
                                    </div>

                                    <span className="text-gray-600 text-xl">+</span>

                                    {/* cbBTC */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                            <span className="text-white font-bold text-xs">cb</span>
                                        </div>
                                        <div>
                                            <div className="text-white font-medium">cbBTC</div>
                                            <div className="text-gray-500 text-sm">50%</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Connect Wallet Button - Orange */}
                                <div className="flex justify-center">
                                    <button
                                        onClick={() => {
                                            const connectBtn = document.querySelector('[data-testid="rk-connect-button"]') as HTMLButtonElement;
                                            if (connectBtn) connectBtn.click();
                                        }}
                                        className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full transition-all hover:scale-105"
                                    >
                                        Connect Wallet
                                    </button>
                                </div>
                            </div>

                            {/* Minimum Deposit Row */}
                            <div className="px-6 py-4 border-t border-gray-800/50 flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Minimum Deposit</span>
                                <span className="text-white text-sm">
                                    <span className="font-medium">{MIN_DEPOSIT_BTC} BTC</span>
                                    <span className="text-gray-500">(≈${(MIN_DEPOSIT_BTC * BTC_PRICE_USD).toFixed(1)})</span>
                                </span>
                            </div>

                            {/* Trust Badges */}
                            <div className="px-6 py-4 border-t border-gray-800/50 flex justify-center gap-6 text-xs text-gray-500">
                                <span>✓ Yearn V3</span>
                                <span>✓ Base</span>
                                <span>✓ No Lock-ups</span>
                            </div>
                        </div>

                        {/* Links */}
                        <div className="flex justify-center gap-8 mt-8 text-sm text-gray-500">
                            <a href="https://basescan.org/address/0x8080d5Ac768B69Cb64d37524A2659d31281f8bA3" target="_blank" className="hover:text-white transition-colors">Contract ↗</a>
                            <a href="https://github.com/Jubilee-Protocol/jBTCi-on-Base" target="_blank" className="hover:text-white transition-colors">Docs ↗</a>
                            <a href="https://jubileeprotocol.xyz" target="_blank" className="hover:text-white transition-colors">Jubilee ↗</a>
                        </div>
                    </div>
                </div>

                {/* Hidden RainbowKit button */}
                <div className="fixed -top-full">
                    <ConnectButton />
                </div>

                {/* Footer */}
                <footer className="py-6 text-center text-gray-600 text-xs">
                    2026 © Jubilee Labs
                </footer>
            </main>
        );
    }

    // ========== DASHBOARD ==========
    return (
        <main className="min-h-screen bg-black flex flex-col">
            {/* Header */}
            <header className="px-4 sm:px-6 py-4 flex justify-between items-center border-b border-gray-800/30">
                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                        <Image src="/jubilee-logo.png" alt="jBTCi" width={24} height={24} />
                        <span className="text-sm font-medium text-pink-400">jBTCi</span>
                    </div>
                    <nav className="hidden sm:flex items-center gap-1 text-sm">
                        <button className="px-3 py-1.5 text-white rounded-lg bg-white/10">Vault</button>
                        <a href="https://basescan.org/address/0x8080d5Ac768B69Cb64d37524A2659d31281f8bA3" target="_blank" className="px-3 py-1.5 text-gray-400 hover:text-white transition-colors">Contract</a>
                        <a href="https://github.com/Jubilee-Protocol/jBTCi-on-Base" target="_blank" className="px-3 py-1.5 text-gray-400 hover:text-white transition-colors">Docs</a>
                    </nav>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isMainnet ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {isMainnet ? 'Base' : 'Testnet'}
                    </span>
                    <ConnectButton />
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-[420px]">
                    {/* Card */}
                    <div className="bg-[#141414] rounded-2xl border border-gray-800/50 overflow-hidden">
                        {/* Tabs */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/30">
                            <div className="flex gap-4 text-sm">
                                <button
                                    onClick={() => setActiveTab('deposit')}
                                    className={`font-medium transition-colors ${activeTab === 'deposit' ? 'text-pink-400' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Deposit
                                </button>
                                <button
                                    onClick={() => setActiveTab('withdraw')}
                                    className={`font-medium transition-colors ${activeTab === 'withdraw' ? 'text-pink-400' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Withdraw
                                </button>
                            </div>
                            <button className="text-gray-500 hover:text-white transition-colors">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
                                </svg>
                            </button>
                        </div>

                        {/* Input Section */}
                        <div className="p-5 space-y-4">
                            {/* You deposit */}
                            <div className="bg-[#1a1a1a] rounded-xl p-4">
                                <div className="flex justify-between text-sm text-gray-500 mb-3">
                                    <span>{activeTab === 'deposit' ? 'You deposit' : 'You withdraw'}</span>
                                    <span>Balance: <span className="text-white">{userBalance ? parseFloat(formatUnits(userBalance, 8)).toFixed(4) : '0.00'}</span></span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        className="bg-transparent text-3xl font-medium text-white outline-none w-full placeholder:text-gray-600"
                                    />
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => setDepositAmount(userBalance ? formatUnits(userBalance, 8) : '0')}
                                            className="text-pink-400 text-sm font-medium hover:text-pink-300"
                                        >
                                            Max
                                        </button>
                                        <div className="flex items-center gap-1.5 bg-blue-500/20 rounded-full px-3 py-1.5">
                                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-[10px] font-bold">cb</span>
                                            </div>
                                            <span className="text-white text-sm font-medium">cbBTC</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600 mt-2">≈ ${depositUsdValue.toLocaleString()}</div>
                            </div>

                            {/* Arrow */}
                            <div className="flex justify-center -my-2">
                                <div className="bg-[#141414] border border-gray-800 rounded-lg p-1.5">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <polyline points="19 12 12 19 5 12" />
                                    </svg>
                                </div>
                            </div>

                            {/* You receive */}
                            <div className="bg-[#1a1a1a] rounded-xl p-4">
                                <div className="text-sm text-gray-500 mb-3">You receive</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-3xl font-medium text-white">{depositAmount || '0'}</span>
                                    <div className="flex items-center gap-1.5 bg-pink-500/20 rounded-full px-3 py-1.5">
                                        <Image src="/jubilee-logo.png" alt="jBTCi" width={20} height={20} />
                                        <span className="text-white text-sm font-medium">jBTCi</span>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600 mt-2">1 cbBTC = 1 jBTCi share</div>
                            </div>

                            {/* Min deposit notice */}
                            <div className="flex justify-between text-xs text-gray-500 px-1">
                                <span>Min. deposit: {MIN_DEPOSIT_BTC} BTC</span>
                                <span>≈ ${(MIN_DEPOSIT_BTC * BTC_PRICE_USD).toFixed(1)}</span>
                            </div>

                            {/* Action Button */}
                            <button
                                className={`w-full py-4 rounded-xl text-lg font-semibold transition-all ${depositAmount && parseFloat(depositAmount) > 0
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {depositAmount && parseFloat(depositAmount) > 0 ? 'Enter an amount' : 'Enter an amount'}
                            </button>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-4 gap-2 mt-6">
                        <div className="bg-[#141414] rounded-xl p-3 text-center border border-gray-800/30">
                            <div className="text-[10px] text-gray-500 uppercase">TVL</div>
                            <div className="text-sm font-medium text-white">{totalHoldings.toFixed(2)}</div>
                        </div>
                        <div className="bg-[#141414] rounded-xl p-3 text-center border border-gray-800/30">
                            <div className="text-[10px] text-gray-500 uppercase">APY</div>
                            <div className="text-sm font-medium text-pink-400">6-10%</div>
                        </div>
                        <div className="bg-[#141414] rounded-xl p-3 text-center border border-gray-800/30">
                            <div className="text-[10px] text-gray-500 uppercase">WBTC</div>
                            <div className="text-sm font-medium text-orange-400">{wbtcPercent.toFixed(0)}%</div>
                        </div>
                        <div className="bg-[#141414] rounded-xl p-3 text-center border border-gray-800/30">
                            <div className="text-[10px] text-gray-500 uppercase">cbBTC</div>
                            <div className="text-sm font-medium text-blue-400">{cbbtcPercent.toFixed(0)}%</div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex justify-center gap-4 mt-4 text-sm">
                        <span className={strategyStatus?.isPaused ? 'text-red-400' : 'text-green-400'}>
                            ● {strategyStatus?.isPaused ? 'Paused' : 'Active'}
                        </span>
                        <span className="text-gray-600">
                            {strategyStatus ? strategyStatus.rebalancesExecuted.toString() : '0'} rebalances
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="py-6 text-center text-gray-600 text-xs border-t border-gray-800/30">
                2026 © Jubilee Labs
            </footer>
        </main>
    );
}
