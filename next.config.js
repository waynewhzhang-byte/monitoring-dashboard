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
    
    // Exclude system folders from file watching (Windows)
    if (!isServer) {
      if (!config.watchOptions) {
        config.watchOptions = {};
      }
      
      const existingIgnored = Array.isArray(config.watchOptions.ignored) 
        ? config.watchOptions.ignored 
        : [];
      
      config.watchOptions.ignored = [
        ...existingIgnored,
        '**/node_modules/**',
        '**/.git/**',
        '**/System Volume Information/**',
        '**/$RECYCLE.BIN/**',
        '**/Thumbs.db',
      ];
    }
    
    return config;
  },
}

module.exports = nextConfig
