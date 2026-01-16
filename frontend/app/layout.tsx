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
    other: {
        'base:app_id': '6960e2c68a6eeb04b568d951',
        'fc:miniapp': JSON.stringify({
            version: 'next',
            imageUrl: 'https://mint.jbtci.xyz/og-image.png',
            button: {
                title: 'Open jBTCi',
                action: {
                    type: 'launch_frame',
                    url: 'https://mint.jbtci.xyz',
                    name: 'jBTCi - Bitcoin Index',
                    splashImageUrl: 'https://mint.jbtci.xyz/splash.png',
                    splashBackgroundColor: '#0a0a1a'
                }
            }
        }),
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="format-detection" content="telephone=no" />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
