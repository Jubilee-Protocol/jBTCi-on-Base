"use client";

import * as React from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import {
    RainbowKitProvider,
    darkTheme,
} from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { PrivyProvider } from '@privy-io/react-auth';
import { config } from '../config';
import { base } from 'viem/chains';

const queryClient = new QueryClient();

// Privy App ID from environment variable
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'your-privy-app-id';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <PrivyProvider
            appId={PRIVY_APP_ID}
            config={{
                // Login methods: Email, Google, LinkedIn, plus wallet
                loginMethods: ['email', 'google', 'linkedin', 'wallet'],

                // Appearance
                appearance: {
                    theme: 'dark',
                    accentColor: '#E040FB',
                    logo: '/jubilee-logo-pink.png',
                    showWalletLoginFirst: false,
                },

                // Default chain
                defaultChain: base,
                supportedChains: [base],

                // Embedded wallet for non-crypto users
                embeddedWallets: {
                    createOnLogin: 'users-without-wallets',
                },
            }}
        >
            <WagmiProvider config={config}>
                <QueryClientProvider client={queryClient}>
                    <RainbowKitProvider
                        theme={darkTheme({
                            accentColor: '#E040FB',
                            accentColorForeground: 'white',
                            borderRadius: 'large',
                            fontStack: 'system',
                        })}
                    >
                        {children}
                    </RainbowKitProvider>
                </QueryClientProvider>
            </WagmiProvider>
        </PrivyProvider>
    );
}
