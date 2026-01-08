'use client';

import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useChainId } from 'wagmi';
import { useState, useEffect } from 'react';
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

// Inline gradient style
const gradientStyle = {
    background: `
        radial-gradient(ellipse at top left, rgba(243, 119, 187, 0.12) 0%, transparent 50%),
        radial-gradient(ellipse at bottom right, rgba(243, 119, 187, 0.08) 0%, transparent 50%),
        radial-gradient(ellipse at center, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(0, 82, 255, 0.15) 100%)
    `,
    minHeight: '100vh'
};

export default function Home() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [depositAmount, setDepositAmount] = useState('');
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(true);

    // Check localStorage for terms acceptance
    useEffect(() => {
        const accepted = localStorage.getItem('jbtci-terms-accepted');
        if (accepted === 'true') {
            setHasAcceptedTerms(true);
            setShowTermsModal(false);
        }
    }, []);

    const handleAcceptTerms = () => {
        localStorage.setItem('jbtci-terms-accepted', 'true');
        setHasAcceptedTerms(true);
        setShowTermsModal(false);
    };

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

    // Terms Modal
    if (showTermsModal && !hasAcceptedTerms) {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
            }}>
                <div style={{
                    background: '#1a1a2e',
                    borderRadius: '16px',
                    maxWidth: '600px',
                    width: '100%',
                    padding: '32px',
                    color: 'white'
                }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginBottom: '24px' }}>
                        Disclaimer
                    </h2>

                    <div style={{
                        background: '#0d0d1a',
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '24px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: '#a0a0a0'
                    }}>
                        <p style={{ marginBottom: '16px' }}>
                            IN ACCESSING AND/OR USING jBTCi PROTOCOL, YOU ACKNOWLEDGE AND AGREE THAT:
                        </p>

                        <p style={{ marginBottom: '16px' }}>
                            (a) jBTCi PROTOCOL IS/ARE PROVIDED ON AN "AS-IS" AND "AS AVAILABLE" BASIS, AND JUBILEE LABS ("OPERATOR") AND ITS AFFILIATES (SAVE TO THE EXTENT PROHIBITED BY APPLICABLE LAWS) EXPRESSLY DISCLAIM ANY AND ALL REPRESENTATIONS, WARRANTIES AND/OR CONDITIONS OF ANY KIND IN RESPECT THEREOF, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING ALL WARRANTIES OR CONDITIONS OF MERCHANTABILITY, MERCHANTABLE QUALITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, QUIET ENJOYMENT, ACCURACY, OR NON-INFRINGEMENT.
                        </p>

                        <p style={{ marginBottom: '16px' }}>
                            (b) OPERATOR AND ITS AFFILIATES HAS NOT MADE AND MAKES NO REPRESENTATION, WARRANTY AND/OR CONDITION OF ANY KIND THAT jBTCi PROTOCOL WILL MEET YOUR REQUIREMENTS, OR WILL BE AVAILABLE ON AN UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE BASIS, OR WILL BE ACCURATE, RELIABLE, FREE OF VIRUSES OR OTHER HARMFUL CODE, COMPLETE, LEGAL, OR SAFE.
                        </p>

                        <p style={{ marginBottom: '16px' }}>
                            (c) YOU SHALL HAVE NO CLAIM AGAINST OPERATOR AND/OR ITS AFFILIATES IN RESPECT OF ANY LOSS SUFFERED BY YOU IN RELATION TO OR ARISING FROM YOUR ACCESS AND/OR USE OF jBTCi PROTOCOL.
                        </p>

                        <p style={{ marginBottom: '16px' }}>
                            (d) YOU UNDERSTAND THAT DeFi PROTOCOLS INVOLVE SIGNIFICANT RISKS INCLUDING BUT NOT LIMITED TO: SMART CONTRACT VULNERABILITIES, MARKET VOLATILITY, IMPERMANENT LOSS, ORACLE FAILURES, AND POTENTIAL LOSS OF ALL DEPOSITED FUNDS.
                        </p>

                        <p>
                            (e) THIS IS NOT FINANCIAL ADVICE. YOU ARE SOLELY RESPONSIBLE FOR YOUR OWN INVESTMENT DECISIONS.
                        </p>
                    </div>

                    <button
                        onClick={handleAcceptTerms}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: '#0052FF',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '18px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Accept
                    </button>
                </div>
            </div>
        );
    }

    return (
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
                        <div className="flex gap-8 mb-8 border-b border-gray-200 pb-4">
                            <button
                                onClick={() => setActiveTab('deposit')}
                                className={`text-lg font-semibold transition-colors ${activeTab === 'deposit' ? 'text-[#0052FF]' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Deposit
                            </button>
                            <button
                                onClick={() => setActiveTab('withdraw')}
                                className={`text-lg font-semibold transition-colors ${activeTab === 'withdraw' ? 'text-[#0052FF]' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Withdraw
                            </button>
                        </div>

                        {/* Input Section */}
                        <div className="space-y-6">
                            {/* Input Token */}
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
                                        className="text-3xl font-semibold placeholder:text-gray-300 bg-transparent border-none outline-none w-full"
                                    />
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => setDepositAmount(userBalance ? formatUnits(userBalance, 8) : '0')}
                                            className="text-[#0052FF] text-sm font-medium hover:underline"
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

                            {/* Output Token */}
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
                            {!isConnected ? (
                                <div className="w-full">
                                    <ConnectButton.Custom>
                                        {({ openConnectModal }) => (
                                            <button
                                                onClick={openConnectModal}
                                                className="w-full py-4 mt-2 rounded-full text-lg font-semibold bg-[#0052FF] text-white hover:bg-[#003DBF] transition-all"
                                            >
                                                Connect Wallet
                                            </button>
                                        )}
                                    </ConnectButton.Custom>
                                </div>
                            ) : (
                                <button
                                    className={`w-full py-4 mt-2 rounded-full text-lg font-semibold transition-all ${depositAmount && parseFloat(depositAmount) > 0
                                        ? 'bg-[#0052FF] text-white hover:bg-[#003DBF]'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {depositAmount && parseFloat(depositAmount) > 0 ? (activeTab === 'deposit' ? 'Deposit cbBTC' : 'Withdraw cbBTC') : 'Enter an amount'}
                                </button>
                            )}
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
                            <div className="text-sm font-semibold text-[#0052FF]">6-10%</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                            <div className="text-[10px] text-gray-400 uppercase mb-1">WBTC</div>
                            <div className="text-sm font-semibold text-[#FFA500]">{wbtcPercent.toFixed(0)}%</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                            <div className="text-[10px] text-gray-400 uppercase mb-1">cbBTC</div>
                            <div className="text-sm font-semibold text-[#0052FF]">{cbbtcPercent.toFixed(0)}%</div>
                        </div>
                    </div>

                    {/* Status & Links */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', marginTop: '24px', fontSize: '14px' }}>
                        <span className={strategyStatus?.isPaused ? 'text-red-500' : 'text-green-500'}>
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
    );
}
