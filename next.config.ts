/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mobile-first PWA — we handle service worker manually
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
    // ── Speed Camera route: requires COOP+COEP for WebGPU / SharedArrayBuffer
    {
      source: '/match/:code/speed',
      headers: [
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
      ],
    },
    // ── Workers & models: served from public/, needs CORP header
    {
      source: '/workers/(.*)',
      headers: [
        { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        { key: 'Cache-Control', value: 'public, max-age=3600' },
      ],
    },
    {
      source: '/models/(.*)',
      headers: [
        { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        { key: 'Cache-Control', value: 'public, max-age=86400' },
      ],
    },
  ],
  allowedDevOrigins: ['192.168.1.105'],
};

export default nextConfig;
