'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect if app is running inside a Farcaster mini app context (Base App, Warpcast, etc.)
 * Returns true if running in mini app, false otherwise
 */
export function useIsMiniApp(): boolean {
    const [isMiniApp, setIsMiniApp] = useState(false);

    useEffect(() => {
        // Check for Farcaster frame context
        // Mini apps are loaded in an iframe with specific parent context
        const checkMiniAppContext = () => {
            try {
                // Check if we're in an iframe (mini apps run in iframes)
                const inIframe = window !== window.parent;

                // Check for Farcaster-specific context indicators
                const hasFarcasterContext =
                    typeof window !== 'undefined' &&
                    (
                        // Check for frame context in URL
                        window.location.search.includes('fc_frame') ||
                        // Check for parent frame context
                        inIframe ||
                        // Check user agent for Warpcast/Base App
                        /warpcast|base/i.test(navigator.userAgent)
                    );

                setIsMiniApp(hasFarcasterContext);
            } catch (e) {
                // If we can't access parent (cross-origin), we're likely in a mini app
                setIsMiniApp(true);
            }
        };

        checkMiniAppContext();
    }, []);

    return isMiniApp;
}

/**
 * Hook to signal that the mini app frame is ready
 * Call this after your app has finished loading
 */
export function useMiniAppReady() {
    useEffect(() => {
        // Signal to parent frame that we're ready
        if (typeof window !== 'undefined' && window.parent !== window) {
            try {
                window.parent.postMessage({ type: 'frame-ready' }, '*');
            } catch (e) {
                // Ignore cross-origin errors
            }
        }
    }, []);
}
