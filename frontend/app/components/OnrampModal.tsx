'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { base } from 'wagmi/chains';

interface OnrampModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'light' | 'dark';
    btcPrice: number;
}

// Coinbase Onramp configuration - jBTCi CDP Project
const CDP_PROJECT_ID = '9e7b3e8f-6ede-4580-b829-77c802b3d802';

// cbBTC contract on Base
const CBBTC_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';

// Payment method options
const PAYMENT_METHODS = [
    { id: 'apple_pay', name: 'Apple Pay', icon: '' },
    { id: 'google_pay', name: 'Google Pay', icon: '🔵' },
    { id: 'card', name: 'Debit Card', icon: '💳' },
    { id: 'coinbase', name: 'Coinbase Account', icon: '🔷' },
];

const PRESET_AMOUNTS = [50, 100, 250, 500];

export function OnrampModal({ isOpen, onClose, theme, btcPrice }: OnrampModalProps) {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [amount, setAmount] = useState<string>('100');
    const [destinationAddress, setDestinationAddress] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

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

    // Set destination address when connected
    useEffect(() => {
        if (isConnected && address) {
            setDestinationAddress(address);
        }
    }, [isConnected, address]);

    // Calculate estimated cbBTC
    const usdAmount = parseFloat(amount) || 0;
    const estimatedCbBTC = btcPrice > 0 ? (usdAmount / btcPrice).toFixed(6) : '0';

    // Generate Coinbase Onramp URL
    // Using one-click Buy Widget URL format: https://docs.cdp.coinbase.com/onramp/docs/api-initializing
    const generateOnrampUrl = () => {
        if (!destinationAddress) return '';

        // New Coinbase Onramp URL format (v2)
        // Uses 'addresses' and 'assets' instead of deprecated 'destinationWallets'
        const params = new URLSearchParams({
            appId: CDP_PROJECT_ID,
            // Address where crypto will be sent
            addresses: JSON.stringify({ [destinationAddress]: ['base'] }),
            // Assets to show for purchase
            assets: JSON.stringify(['cbBTC']),
            // Default network
            defaultNetwork: 'base',
            // Default asset
            defaultAsset: 'cbBTC',
            // Preset amount
            presetFiatAmount: amount,
            fiatCurrency: 'USD',
        });

        return `https://pay.coinbase.com/buy/select-asset?${params.toString()}`;
    };

    // Open Coinbase Onramp
    const handleBuyCbBTC = () => {
        if (!destinationAddress) {
            alert('Please enter a destination wallet address');
            return;
        }

        const url = generateOnrampUrl();
        if (url) {
            // Open in popup window
            const width = 500;
            const height = 700;
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;

            window.open(
                url,
                'coinbase-onramp',
                `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
            );
        }
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
                    Buy cbBTC instantly with Apple Pay, Google Pay, or debit card.
                    No Coinbase account required for amounts up to $500/week.
                </p>

                {/* Amount Input */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: c.text, marginBottom: '8px' }}>
                        Amount (USD)
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
                </div>

                {/* Estimated cbBTC */}
                <div style={{
                    backgroundColor: c.bg,
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: c.textLight, fontSize: '14px' }}>You'll receive approximately</span>
                        <span style={{ color: c.text, fontSize: '18px', fontWeight: 600 }}>
                            {estimatedCbBTC} cbBTC
                        </span>
                    </div>
                    <div style={{ fontSize: '12px', color: c.textLight, marginTop: '4px' }}>
                        ≈ {estimatedCbBTC} jBTCi after deposit
                    </div>
                </div>

                {/* Destination Address */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: c.text, marginBottom: '8px' }}>
                        Destination Wallet
                    </label>
                    <input
                        type="text"
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        placeholder="0x... or connect wallet"
                        style={{
                            width: '100%',
                            padding: '14px 16px',
                            fontSize: '14px',
                            border: `1px solid ${c.border}`,
                            borderRadius: '12px',
                            backgroundColor: c.bg,
                            color: c.text,
                            outline: 'none',
                            fontFamily: 'monospace',
                        }}
                    />
                    {isConnected && (
                        <div style={{ fontSize: '12px', color: c.success, marginTop: '6px' }}>
                            ✓ Connected wallet detected
                        </div>
                    )}
                </div>

                {/* Payment Methods Info */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '16px',
                    marginBottom: '24px',
                    padding: '12px',
                    backgroundColor: c.bg,
                    borderRadius: '12px',
                }}>
                    <span style={{ fontSize: '24px' }}></span>
                    <span style={{ fontSize: '24px' }}>🔵</span>
                    <span style={{ fontSize: '24px' }}>💳</span>
                    <span style={{ color: c.textLight, fontSize: '12px', alignSelf: 'center' }}>
                        Apple Pay • Google Pay • Debit Card
                    </span>
                </div>

                {/* Buy Button */}
                <button
                    onClick={handleBuyCbBTC}
                    disabled={!destinationAddress || usdAmount < 1}
                    style={{
                        width: '100%',
                        padding: '18px',
                        fontSize: '16px',
                        fontWeight: 600,
                        backgroundColor: c.accent,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: destinationAddress && usdAmount >= 1 ? 'pointer' : 'not-allowed',
                        opacity: destinationAddress && usdAmount >= 1 ? 1 : 0.5,
                    }}
                >
                    Buy cbBTC with Coinbase
                </button>

                {/* Footer */}
                <div style={{
                    marginTop: '20px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: c.textLight,
                    lineHeight: 1.6,
                }}>
                    Powered by <a href="https://www.coinbase.com/developer-platform" target="_blank" rel="noopener noreferrer" style={{ color: c.accent }}>Coinbase</a>
                    <br />
                    Guest checkout available for US users ($500/week limit)
                </div>
            </div>
        </div>
    );
}
