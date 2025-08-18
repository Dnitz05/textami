/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuració SIMPLE per MVP
  
  // Disable ESLint during build for MVP
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Imatges optimitzades
  images: {
    domains: ['ypunjalpaecspihjeces.supabase.co'],
  },
  
  // Headers de seguretat bàsics
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;