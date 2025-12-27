/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  output: 'standalone',
  transpilePackages: ['reactflow', '@reactflow/core', '@reactflow/background', '@reactflow/controls', '@reactflow/minimap'],
  // WebSocket Support
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'socket.io': 'socket.io',
      });
    }
    return config;
  },
}

module.exports = nextConfig
