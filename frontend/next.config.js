/** @type {import('next').NextConfig} */
const nextConfig = {
    // Fix for @metamask/sdk requiring @react-native-async-storage/async-storage
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
            };
        }
        // Provide an empty mock for react-native async-storage in browser builds
        config.resolve.alias = {
            ...config.resolve.alias,
            '@react-native-async-storage/async-storage': false,
        };
        return config;
    },
    // Skip TS errors from third-party packages (ox has type issues)
    typescript: {
        ignoreBuildErrors: true,
    },
    // Ignore ESLint errors during builds
    eslint: {
        ignoreDuringBuilds: true,
    },
    // CORS headers for Safe Apps SDK compatibility
    async headers() {
        return [
            {
                // Apply to all routes
                source: '/:path*',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*',
                    },
                    {
                        key: 'Access-Control-Allow-Methods',
                        value: 'GET, POST, PUT, DELETE, OPTIONS',
                    },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: 'X-Requested-With, content-type, Authorization',
                    },
                ],
            },
            {
                // Specifically for manifest.json
                source: '/manifest.json',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*',
                    },
                    {
                        key: 'Content-Type',
                        value: 'application/json',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
