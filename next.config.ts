import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist uses canvas for server-side rendering; exclude it from server bundle
  serverExternalPackages: ['pdfjs-dist', 'canvas'],
  // Turbopack config (Next.js 16 uses Turbopack by default)
  turbopack: {
    resolveAlias: {
      // pdfjs-dist tries to require('canvas') — alias it to nothing in browser builds
      canvas: './src/lib/empty-module.ts',
    },
  },
};

export default nextConfig;
