'use client';

import { useState, useEffect, useCallback } from 'react';
import SafeAppsSDK from '@safe-global/safe-apps-sdk';

// Initialize Safe SDK
const safeAppsSdk = typeof window !== 'undefined' ? new SafeAppsSDK() : null;

export function useSafeApps() {
    const [isSafeApp, setIsSafeApp] = useState(false);
    const [safeInfo, setSafeInfo] = useState<{
        safeAddress: string;
        chainId: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initSafe = async () => {
            if (!safeAppsSdk) {
                setLoading(false);
                return;
            }

            try {
                // Try to get Safe info - this will only work if running inside Safe iframe
                const info = await Promise.race([
                    safeAppsSdk.safe.getInfo(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('timeout')), 1000)
                    )
                ]) as { safeAddress: string; chainId: number };

                setIsSafeApp(true);
                setSafeInfo(info);
            } catch {
                // Not running in Safe iframe
                setIsSafeApp(false);
            } finally {
                setLoading(false);
            }
        };

        initSafe();
    }, []);

    return { isSafeApp, safeInfo, loading, sdk: safeAppsSdk };
}

export { safeAppsSdk };
