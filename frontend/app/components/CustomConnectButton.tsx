'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useDisconnect } from 'wagmi';

interface CustomConnectButtonProps {
    theme: 'light' | 'dark';
}

export function CustomConnectButton({ theme }: CustomConnectButtonProps) {
    const { login, logout, authenticated, user, ready } = usePrivy();
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();

    const c = theme === 'dark' ? {
        bg: '#1a1a2e',
        text: '#ffffff',
        textMuted: '#a0a0b0',
        border: '#2a2a3e',
    } : {
        bg: '#F3F4F6',
        text: '#1a1a2e',
        textMuted: '#666680',
        border: '#e5e7eb',
    };

    // Show loading state
    if (!ready) {
        return (
            <button
                disabled
                style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: '12px',
                    padding: '10px 16px',
                    color: c.textMuted,
                    fontSize: '14px',
                    cursor: 'not-allowed',
                }}
            >
                Loading...
            </button>
        );
    }

    // Connected state
    if (authenticated && isConnected && address) {
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: '12px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#22C55E',
                    }} />
                    <span style={{ color: c.text, fontSize: '14px', fontFamily: 'monospace' }}>
                        {shortAddress}
                    </span>
                </div>
                <button
                    onClick={() => {
                        disconnect();
                        logout();
                    }}
                    style={{
                        background: 'transparent',
                        border: `1px solid ${c.border}`,
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: c.textMuted,
                        fontSize: '12px',
                        cursor: 'pointer',
                    }}
                >
                    Disconnect
                </button>
            </div>
        );
    }

    // Authenticated but no wallet connected (shouldn't happen often)
    if (authenticated && !isConnected) {
        return (
            <button
                onClick={() => login()}
                style={{
                    background: 'linear-gradient(135deg, #E040FB 0%, #7C4DFF 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 20px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                }}
            >
                Connect Wallet
            </button>
        );
    }

    // Not connected - show login button
    return (
        <button
            onClick={() => login()}
            style={{
                background: 'linear-gradient(135deg, #E040FB 0%, #7C4DFF 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 20px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            }}
        >
            Connect
        </button>
    );
}
