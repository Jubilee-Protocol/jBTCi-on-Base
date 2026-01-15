import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { safe } from 'wagmi/connectors'
import {
    rainbowWallet,
    walletConnectWallet,
    coinbaseWallet,
    metaMaskWallet,
    safeWallet
} from '@rainbow-me/rainbowkit/wallets'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

// Create connectors with Farcaster mini app support + Safe wallet
const connectors = connectorsForWallets(
    [
        {
            groupName: 'Recommended',
            wallets: [coinbaseWallet, metaMaskWallet, rainbowWallet, walletConnectWallet, safeWallet],
        },
    ],
    {
        appName: 'jBTCi - Jubilee Bitcoin Index',
        projectId: '6f385306b6aa92e6c664d8e5759748c2',
    }
)

// Create config with Safe connector + Farcaster + RainbowKit wallets
export const config = createConfig({
    chains: [base, baseSepolia],
    connectors: [
        safe({
            allowedDomains: [/app\.safe\.global$/],
            debug: false,
        }),
        farcasterMiniApp(), // Farcaster mini app connector (auto-connects in Base App)
        ...connectors,
    ],
    transports: {
        [base.id]: http('https://mainnet.base.org'),
        [baseSepolia.id]: http('https://sepolia.base.org'),
    },
})

// Contract addresses
export const CONTRACTS = {
    // Base Mainnet (LIVE!)
    mainnet: {
        strategy: '0x7d0Ae1Fa145F3d5B511262287fF686C25000816D', // jBTCi Strategy - DEPLOYED Jan 7 2026!
        vault: '0x0000000000000000000000000000000000000000',    // TODO: Deploy Jan 8th
        cbBTC: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
        wBTC: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',
    },
    // Base Sepolia (testnet) - FIXED addresses Jan 14 2026
    testnet: {
        strategy: '0x08F793B353e9C0EF52c9c00aa579c69F6D9DAA1A', // jBTCi Strategy (Testnet) - WORKING
        cbBTC: '0x5552ce4C7c6821A43fD53aB2E4fBd28d2B8c5A5d',    // Mock cbBTC for testnet
        wBTC: '0xbf7690ec2cD04F1B108f2a6e10D80039dcb589bb',
    }
}
