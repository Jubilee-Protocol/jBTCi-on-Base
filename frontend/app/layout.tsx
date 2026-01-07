import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from './providers';
import './globals.css'; // Assuming you might have a global.css, if not we can omit or create simple one

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
