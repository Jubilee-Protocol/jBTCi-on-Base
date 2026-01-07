import { http } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

export const config = getDefaultConfig({
    appName: 'jBTCi - Jubilee Bitcoin Index',
    projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from cloud.walletconnect.com
    chains: [base, baseSepolia],
    transports: {
        [base.id]: http('https://mainnet.base.org'),
        [baseSepolia.id]: http('https://sepolia.base.org'),
    },
})

// Contract addresses
export const CONTRACTS = {
    // Base Mainnet (LIVE!)
    mainnet: {
        strategy: '0x8080d5Ac768B69Cb64d37524A2659d31281f8bA3', // jBTCi Strategy - DEPLOYED!
        vault: '0x0000000000000000000000000000000000000000',    // TODO: Deploy Jan 8th
        cbBTC: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
        wBTC: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',
    },
    // Base Sepolia (testnet)
    testnet: {
        strategy: '0xd0d92320555F3883fB20D84A6b372A511DD538C4',
        cbBTC: '0xfE7984100E4DAc864b1B0FfeebC25bADA0D2C782',
        wBTC: '0xbf7690ec2cD04F1B108f2a6e10D80039dcb589bb',
    }
}
