'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface OnrampModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'light' | 'dark';
    btcPrice: number;
}

// cbBTC contract on Base
const CBBTC_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';

export function OnrampModal({ isOpen, onClose, theme, btcPrice }: OnrampModalProps) {
    const { address, isConnected } = useAccount();
    const [amount, setAmount] = useState<string>('100');

    // Theme colors
    const c = theme === 'dark' ? {
        bg: '#1a1a2e',
        cardBg: '#252540',
        text: '#ffffff',
        textLight: '#a0a0b0',
        border: '#3a3a5a',
        accent: '#0052FF',
        success: '#22C55E',
    } : {
        bg: '#f8f9fa',
        cardBg: '#ffffff',
        text: '#1a1a2e',
        textLight: '#6b7280',
        border: '#e5e7eb',
        accent: '#0052FF',
        success: '#22C55E',
    };

    // Calculate estimated cbBTC
    const usdAmount = parseFloat(amount) || 0;
    const estimatedCbBTC = btcPrice > 0 ? (usdAmount / btcPrice).toFixed(6) : '0';

    const PRESET_AMOUNTS = [100, 250, 500, 1000];

    // Direct links - these work immediately without CDP approval
    const handleCoinbase = () => {
        window.open('https://www.coinbase.com/price/coinbase-wrapped-btc', '_blank');
    };

    const handleUniswap = () => {
        const url = `https://app.uniswap.org/swap?chain=base&outputCurrency=${CBBTC_ADDRESS}`;
        window.open(url, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: c.cardBg,
                    borderRadius: '24px',
                    padding: '32px',
                    maxWidth: '440px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: c.text }}>
                        Get cbBTC
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: c.textLight,
                            padding: '4px',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Description */}
                <p style={{ color: c.textLight, marginBottom: '24px', lineHeight: 1.6 }}>
                    Get cbBTC to deposit into jBTCi. Choose your preferred method:
                </p>

                {/* Amount Estimate */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: c.text, marginBottom: '8px' }}>
                        How much do you want to deposit? (USD)
                    </label>
                    <div style={{ position: 'relative' }}>
                        <span style={{
                            position: 'absolute',
                            left: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '20px',
                            color: c.textLight,
                        }}>
                            $
                        </span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="100"
                            style={{
                                width: '100%',
                                padding: '16px 16px 16px 36px',
                                fontSize: '20px',
                                fontWeight: 600,
                                border: `1px solid ${c.border}`,
                                borderRadius: '12px',
                                backgroundColor: c.bg,
                                color: c.text,
                                outline: 'none',
                            }}
                        />
                    </div>

                    {/* Preset amounts */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        {PRESET_AMOUNTS.map((preset) => (
                            <button
                                key={preset}
                                onClick={() => setAmount(preset.toString())}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: `1px solid ${amount === preset.toString() ? c.accent : c.border}`,
                                    borderRadius: '8px',
                                    backgroundColor: amount === preset.toString() ? `${c.accent}20` : 'transparent',
                                    color: amount === preset.toString() ? c.accent : c.textLight,
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                ${preset}
                            </button>
                        ))}
                    </div>

                    {/* Estimate */}
                    <div style={{
                        backgroundColor: c.bg,
                        borderRadius: '12px',
                        padding: '16px',
                        marginTop: '16px',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: c.textLight, fontSize: '14px' }}>You'll need approximately</span>
                            <span style={{ color: c.text, fontSize: '18px', fontWeight: 600 }}>
                                {estimatedCbBTC} cbBTC
                            </span>
                        </div>
                    </div>
                </div>

                {/* Option 1: Coinbase */}
                <button
                    onClick={handleCoinbase}
                    style={{
                        width: '100%',
                        padding: '16px 20px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: c.accent,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 600,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>🏦</span>
                        <div style={{ textAlign: 'left' }}>
                            <div>Buy on Coinbase</div>
                            <div style={{ fontSize: '12px', opacity: 0.8, fontWeight: 400 }}>
                                Apple Pay • Cards • Bank Transfer
                            </div>
                        </div>
                    </div>
                    <span>→</span>
                </button>

                {/* Option 2: Uniswap */}
                <button
                    onClick={handleUniswap}
                    style={{
                        width: '100%',
                        padding: '16px 20px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'transparent',
                        color: c.text,
                        border: `1px solid ${c.border}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 600,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>🦄</span>
                        <div style={{ textAlign: 'left' }}>
                            <div>Swap on Uniswap</div>
                            <div style={{ fontSize: '12px', color: c.textLight, fontWeight: 400 }}>
                                ETH or any token → cbBTC
                            </div>
                        </div>
                    </div>
                    <span>→</span>
                </button>

                {/* Connected wallet info */}
                {isConnected && address && (
                    <div style={{
                        fontSize: '12px',
                        color: c.success,
                        textAlign: 'center',
                        padding: '12px',
                        backgroundColor: `${c.success}15`,
                        borderRadius: '8px',
                    }}>
                        ✓ Wallet connected: {address.slice(0, 6)}...{address.slice(-4)}
                        <br />
                        <span style={{ color: c.textLight }}>cbBTC will be sent to this address</span>
                    </div>
                )}

                {/* Footer */}
                <div style={{
                    marginTop: '20px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: c.textLight,
                    lineHeight: 1.6,
                }}>
                    After getting cbBTC, return here to deposit into jBTCi
                </div>
            </div>
        </div>
    );
}
