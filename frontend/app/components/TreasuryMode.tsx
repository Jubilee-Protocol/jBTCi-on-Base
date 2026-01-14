'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface TreasuryModeProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'light' | 'dark';
}

export function TreasuryMode({ isOpen, onClose, theme }: TreasuryModeProps) {
    const { address, connector } = useAccount();
    const [isSafeWallet, setIsSafeWallet] = useState(false);
    const [step, setStep] = useState<'intro' | 'create' | 'connected'>('intro');

    const c = theme === 'dark' ? {
        bg: 'rgba(20, 20, 35, 0.98)',
        card: '#1a1a2e',
        text: '#ffffff',
        textMuted: '#a0a0b0',
        border: '#2a2a3e',
        accent: '#E040FB',
    } : {
        bg: 'rgba(255, 255, 255, 0.98)',
        card: '#ffffff',
        text: '#1a1a2e',
        textMuted: '#666680',
        border: '#e5e7eb',
        accent: '#E040FB',
    };

    // Detect if running in Safe iframe
    useEffect(() => {
        const checkSafe = () => {
            // Safe apps run in an iframe
            const isInIframe = typeof window !== 'undefined' && window.parent !== window;
            // Check connector name
            const isSafeConnector = connector?.name?.toLowerCase().includes('safe');
            setIsSafeWallet(isInIframe || isSafeConnector || false);

            if (isInIframe || isSafeConnector) {
                setStep('connected');
            }
        };
        checkSafe();
    }, [connector]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
        }}>
            <div style={{
                background: c.card,
                borderRadius: '24px',
                maxWidth: '560px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: `1px solid ${c.border}`,
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    background: `linear-gradient(135deg, #E040FB 0%, #7C4DFF 100%)`,
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '700', margin: 0 }}>
                        🏛️ Treasury Mode
                    </h2>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        color: 'white',
                        cursor: 'pointer',
                    }}>
                        Close
                    </button>
                </div>

                <div style={{ padding: '24px' }}>
                    {step === 'intro' && (
                        <>
                            <h3 style={{ color: c.text, fontSize: '18px', marginBottom: '12px' }}>
                                Multi-Signature Accountability
                            </h3>
                            <p style={{ color: c.textMuted, lineHeight: 1.6, marginBottom: '20px' }}>
                                Just like requiring <strong>two signatures on a church check</strong>,
                                Safe wallets require multiple approvals before any funds can be moved.
                            </p>

                            {/* Benefits */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                <Benefit
                                    icon="✅"
                                    title="Non-Custodial Sovereignty"
                                    description="Your organization controls the keys — not us, not a bank"
                                    theme={theme}
                                />
                                <Benefit
                                    icon="✅"
                                    title="Accountability Trail"
                                    description="Every approval is permanently recorded on-chain"
                                    theme={theme}
                                />
                                <Benefit
                                    icon="✅"
                                    title="Prevent Unauthorized Transfers"
                                    description="No single person can move funds alone"
                                    theme={theme}
                                />
                            </div>

                            {/* Example */}
                            <div style={{
                                background: theme === 'dark' ? '#0d0d1a' : '#f8f9fa',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '24px',
                            }}>
                                <p style={{ color: c.textMuted, fontSize: '13px', margin: 0 }}>
                                    <strong>Example:</strong> Pastor initiates a 1 BTC deposit.
                                    The Treasurer reviews and approves. Only then does the deposit execute.
                                </p>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setStep('create')}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: `linear-gradient(135deg, #E040FB 0%, #7C4DFF 100%)`,
                                        color: 'white',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Create Safe Wallet
                                </button>
                                <a
                                    href="https://app.safe.global"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: `1px solid ${c.border}`,
                                        background: 'transparent',
                                        color: c.text,
                                        fontSize: '15px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        textDecoration: 'none',
                                        textAlign: 'center',
                                    }}
                                >
                                    Already Have One
                                </a>
                            </div>
                        </>
                    )}

                    {step === 'create' && (
                        <>
                            <h3 style={{ color: c.text, fontSize: '18px', marginBottom: '16px' }}>
                                Set Up Your Treasury
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                                <Step
                                    num={1}
                                    text="Go to Safe and click 'Create new Safe'"
                                    theme={theme}
                                />
                                <Step
                                    num={2}
                                    text="Select Base as your network"
                                    theme={theme}
                                />
                                <Step
                                    num={3}
                                    text="Add your signers (e.g., Pastor, Treasurer, Deacon)"
                                    theme={theme}
                                />
                                <Step
                                    num={4}
                                    text="Set threshold (e.g., 2 of 3 signatures required)"
                                    theme={theme}
                                />
                                <Step
                                    num={5}
                                    text="Fund with ETH for gas, then return here"
                                    theme={theme}
                                />
                            </div>

                            <a
                                href="https://app.safe.global/new-safe/create?chain=base"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: `linear-gradient(135deg, #E040FB 0%, #7C4DFF 100%)`,
                                    color: 'white',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                    textAlign: 'center',
                                    marginBottom: '12px',
                                }}
                            >
                                Open Safe App →
                            </a>

                            <button
                                onClick={() => setStep('intro')}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: c.textMuted,
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                }}
                            >
                                ← Back
                            </button>
                        </>
                    )}

                    {step === 'connected' && (
                        <>
                            <div style={{
                                textAlign: 'center',
                                padding: '20px 0',
                            }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '32px',
                                    margin: '0 auto 16px',
                                }}>
                                    ✓
                                </div>
                                <h3 style={{ color: c.text, fontSize: '20px', marginBottom: '8px' }}>
                                    Safe Wallet Connected
                                </h3>
                                <p style={{ color: c.textMuted, fontSize: '14px' }}>
                                    Multi-Signature Accountability is active
                                </p>
                            </div>

                            <div style={{
                                background: theme === 'dark' ? '#0d0d1a' : '#f8f9fa',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '20px',
                            }}>
                                <div style={{ fontSize: '13px', color: c.textMuted, marginBottom: '8px' }}>
                                    Treasury Address
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: c.text,
                                    fontFamily: 'monospace',
                                    wordBreak: 'break-all',
                                }}>
                                    {address}
                                </div>
                            </div>

                            <div style={{
                                background: `${c.accent}10`,
                                borderRadius: '12px',
                                padding: '16px',
                                border: `1px solid ${c.accent}30`,
                            }}>
                                <p style={{ color: c.text, fontSize: '14px', margin: 0 }}>
                                    💡 Transactions will require approval from your designated signers
                                    before executing.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper Components
function Benefit({ icon, title, description, theme }: {
    icon: string;
    title: string;
    description: string;
    theme: 'light' | 'dark';
}) {
    return (
        <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
        }}>
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <div>
                <div style={{
                    color: theme === 'dark' ? '#fff' : '#1a1a2e',
                    fontWeight: '600',
                    fontSize: '14px',
                    marginBottom: '2px',
                }}>
                    {title}
                </div>
                <div style={{
                    color: theme === 'dark' ? '#a0a0b0' : '#666680',
                    fontSize: '13px',
                }}>
                    {description}
                </div>
            </div>
        </div>
    );
}

function Step({ num, text, theme }: { num: number; text: string; theme: 'light' | 'dark' }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        }}>
            <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#E040FB',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: '14px',
                flexShrink: 0,
            }}>
                {num}
            </div>
            <span style={{
                color: theme === 'dark' ? '#e0e0e0' : '#374151',
                fontSize: '14px',
            }}>
                {text}
            </span>
        </div>
    );
}
