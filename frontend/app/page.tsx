'use client';

import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useChainId } from 'wagmi';
import { useState } from 'react';
import { formatUnits } from 'viem';
import { CONTRACTS } from '../config';

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
    {
        name: 'totalAssets',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }]
    }
] as const;

const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }]
    }
] as const;

export default function Home() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [depositAmount, setDepositAmount] = useState('');

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

    // ========== HERO SECTION (Pre-connect) ==========
    if (!isConnected) {
        return (
            <main className="min-h-screen bg-[#0a0a0a]">
                {/* Header */}
                <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-800/50">
                    <div className="flex items-center gap-3">
                        <Image src="/jubilee-logo.png" alt="Jubilee" width={40} height={40} className="rounded-lg" />
                        <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent">
                            jBTCi
                        </span>
                    </div>
                    <ConnectButton />
                </header>

                {/* Hero */}
                <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20">
                    <div className="text-center max-w-3xl mx-auto">
                        {/* Logo */}
                        <div className="w-28 h-28 mx-auto mb-8 logo-glow rounded-2xl overflow-hidden">
                            <Image src="/jubilee-logo.png" alt="jBTCi" width={112} height={112} />
                        </div>

                        {/* Title */}
                        <h1 className="text-6xl md:text-7xl font-bold mb-4">
                            <span className="bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-400 bg-clip-text text-transparent">
                                jBTCi
                            </span>
                        </h1>

                        <p className="text-2xl md:text-3xl text-gray-300 font-light mb-8">
                            The Bitcoin Index Fund
                        </p>

                        {/* Stats */}
                        <div className="flex flex-wrap justify-center gap-12 mb-10">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-orange-400">6-10%</div>
                                <div className="text-sm text-gray-500 uppercase tracking-wider mt-1">Target APY</div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-white">50/50</div>
                                <div className="text-sm text-gray-500 uppercase tracking-wider mt-1">WBTC • cbBTC</div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-green-400">100%</div>
                                <div className="text-sm text-gray-500 uppercase tracking-wider mt-1">Bitcoin</div>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
                            A passive, diversified Bitcoin strategy that automatically rebalances
                            between WBTC and cbBTC while capturing arbitrage opportunities.
                        </p>

                        {/* CTA */}
                        <div className="flex flex-wrap gap-4 justify-center mb-16">
                            <ConnectButton />
                            <a
                                href="https://jubileelabs.xyz"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-3 border border-gray-600 rounded-xl text-gray-300 hover:border-orange-500 hover:text-orange-400 transition-all"
                            >
                                Learn More ↗
                            </a>
                        </div>

                        {/* Trust Badges */}
                        <div className="flex flex-wrap gap-6 justify-center text-sm text-gray-500">
                            <span>✓ Powered by Yearn V3</span>
                            <span>✓ Built on Base</span>
                            <span>✓ No Lock-ups</span>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="py-24 px-6 border-t border-gray-800/50">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-3xl font-bold text-center mb-16 text-white">Why jBTCi?</h2>

                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700/50 hover:border-orange-500/50 transition-all">
                                <div className="text-4xl mb-4">📊</div>
                                <h3 className="text-xl font-semibold mb-3 text-white">Passive Strategy</h3>
                                <p className="text-gray-400">Set it, forget it, earn BTC. Automated rebalancing without active management.</p>
                            </div>

                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700/50 hover:border-orange-500/50 transition-all">
                                <div className="text-4xl mb-4">🔐</div>
                                <h3 className="text-xl font-semibold mb-3 text-white">Battle-Tested Security</h3>
                                <p className="text-gray-400">Built on Yearn V3 with multi-layered circuit breakers and MEV protection.</p>
                            </div>

                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700/50 hover:border-orange-500/50 transition-all">
                                <div className="text-4xl mb-4">⚡</div>
                                <h3 className="text-xl font-semibold mb-3 text-white">100% Capital Efficiency</h3>
                                <p className="text-gray-400">No idle capital. Your Bitcoin is always working on Base.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-10 border-t border-gray-800/50 text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Image src="/jubilee-logo.png" alt="Jubilee" width={32} height={32} className="rounded-lg" />
                        <span className="text-gray-400">Built by <a href="https://jubileelabs.xyz" target="_blank" className="text-orange-400 hover:underline">Jubilee Labs</a></span>
                    </div>
                    <p className="text-xs text-gray-600">Powered by Yearn V3 • Deployed on Base • Verified on <a href="https://basescan.org/address/0x8080d5Ac768B69Cb64d37524A2659d31281f8bA3" target="_blank" className="text-orange-400 hover:underline">BaseScan</a></p>
                </footer>
            </main>
        );
    }

    // ========== DASHBOARD (Connected) ==========
    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Header */}
            <header className="px-6 py-4 flex justify-between items-center border-b border-gray-800/50">
                <div className="flex items-center gap-3">
                    <Image src="/jubilee-logo.png" alt="Jubilee" width={36} height={36} className="rounded-lg" />
                    <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent">
                        jBTCi
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isMainnet ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                        {isMainnet ? 'MAINNET' : 'TESTNET'}
                    </span>
                </div>
                <ConnectButton />
            </header>

            {/* Dashboard */}
            <div className="max-w-4xl mx-auto px-6 py-10">
                {/* Stats Grid */}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                        <div className="text-sm text-gray-500 mb-2">Total Holdings</div>
                        <div className="text-3xl font-bold">
                            {strategyStatus ? formatUnits(strategyStatus.totalHoldings, 8) : '0.00'}
                            <span className="text-lg text-orange-400 ml-2">BTC</span>
                        </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                        <div className="text-sm text-gray-500 mb-2">Target APY</div>
                        <div className="text-3xl font-bold text-green-400">6-10%</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                        <div className="text-sm text-gray-500 mb-2">Allocation</div>
                        <div className="text-3xl font-bold">50/50</div>
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
                    {/* Allocation */}
                    <h3 className="text-lg font-semibold mb-6">Current Allocation</h3>

                    <div className="space-y-4 mb-8">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-orange-400 font-medium">WBTC</span>
                                <span className="text-gray-400">{strategyStatus ? `${(Number(strategyStatus.wbtcAlloc) / 100).toFixed(1)}%` : '50%'}</span>
                            </div>
                            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-500" style={{ width: strategyStatus ? `${Number(strategyStatus.wbtcAlloc) / 100}%` : '50%' }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-blue-400 font-medium">cbBTC</span>
                                <span className="text-gray-400">{strategyStatus ? `${(Number(strategyStatus.cbbtcAlloc) / 100).toFixed(1)}%` : '50%'}</span>
                            </div>
                            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400" style={{ width: strategyStatus ? `${Number(strategyStatus.cbbtcAlloc) / 100}%` : '50%' }} />
                            </div>
                        </div>
                    </div>

                    {/* Deposit */}
                    <div className="border-t border-gray-800 pt-8">
                        <h3 className="text-lg font-semibold mb-4">Deposit cbBTC</h3>
                        <div className="flex gap-3">
                            <input
                                type="number"
                                placeholder="0.00"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                className="flex-1"
                            />
                            <button
                                onClick={() => setDepositAmount(userBalance ? formatUnits(userBalance, 8) : '0')}
                                className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors text-gray-300"
                            >
                                MAX
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                            Balance: {userBalance ? formatUnits(userBalance, 8) : '0.00'} cbBTC
                        </p>
                        <button className="w-full mt-4 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl font-bold text-lg hover:from-orange-600 hover:to-yellow-600 transition-all text-white">
                            Deposit
                        </button>
                    </div>
                </div>

                {/* Status */}
                {strategyStatus && (
                    <div className="mt-6 flex gap-6 justify-center text-sm text-gray-500">
                        <span className={strategyStatus.isPaused ? 'text-red-400' : 'text-green-400'}>
                            {strategyStatus.isPaused ? '⏸️ Paused' : '✓ Active'}
                        </span>
                        <span>↻ {strategyStatus.rebalancesExecuted.toString()} rebalances</span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="py-8 border-t border-gray-800/50 text-center text-gray-600 text-sm">
                Built by <a href="https://jubileelabs.xyz" target="_blank" className="text-orange-400 hover:underline">Jubilee Labs</a> • Verified on <a href="https://basescan.org/address/0x8080d5Ac768B69Cb64d37524A2659d31281f8bA3" target="_blank" className="text-orange-400 hover:underline">BaseScan</a>
            </footer>
        </main>
    );
}
