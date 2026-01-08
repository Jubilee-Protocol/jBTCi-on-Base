import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from './providers';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'jBTCi | Bitcoin Index Fund on Base',
    description: 'The first Bitcoin Index Fund on Base. Earn yield on diversified BTC exposure through cbBTC and WBTC via Yearn V3.',
    keywords: ['jBTCi', 'Bitcoin', 'Index Fund', 'Base', 'DeFi', 'Yearn', 'cbBTC', 'WBTC'],
    icons: {
        icon: '/jubilee-logo-pink.png',
        apple: '/jubilee-logo-pink.png',
    },
    openGraph: {
        title: 'jBTCi | Bitcoin Index Fund on Base',
        description: 'The first Bitcoin Index Fund on Base. Earn 6-10% APY on diversified BTC exposure.',
        url: 'https://mint.jbtci.xyz',
        siteName: 'jBTCi',
        images: [
            {
                url: 'https://mint.jbtci.xyz/og-image.png',
                width: 625,
                height: 625,
                alt: 'jBTCi - Bitcoin Index Fund',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'jBTCi | Bitcoin Index Fund on Base',
        description: 'The first Bitcoin Index Fund on Base. Earn 6-10% APY on diversified BTC exposure.',
        images: ['https://mint.jbtci.xyz/og-image.png'],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
