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
    // Base Mainnet (LIVE!) - REDEPLOYED Jan 17 2026 (TokenizedStrategy fix)
    mainnet: {
        strategy: '0x8a4C0254258F0D3dB7Bc5C5A43825Bb4EfC81337', // jBTCi Strategy - TokenizedStrategy fix!
        vault: '0x0000000000000000000000000000000000000000',    // Not needed, strategy IS the vault
        cbBTC: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
        wBTC: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',
    },
    // Base Sepolia (testnet) - NEW DEPLOYMENT Jan 15 2026 (bug fix)
    testnet: {
        strategy: '0x43814Da4b3CB4344395A85afF2325282A43cbda6', // jBTCi Strategy (Testnet) - BUG FIXED
        cbBTC: '0x0D1feA7B0f63A9DA5b0dA89faFfBb56192d7cd93',    // Mock cbBTC for testnet
        wBTC: '0x5ed96C75f5F04A94308623A8828B819E7Ef60B1c',     // Mock WBTC for testnet
    }
}
