import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist uses canvas for server-side rendering; exclude it from server bundle
  serverExternalPackages: ['pdfjs-dist', 'canvas'],
  // Turbopack config (Next.js 16 uses Turbopack by default)
  turbopack: {
    resolveAlias: {
      // pdfjs-dist tries to require('canvas') — alias it to nothing in browser builds
      canvas: './src/lib/empty-module.ts',
      // Use the legacy (ES5-compatible) build for wider browser support.
      // TypeScript imports from the package root ('pdfjs-dist') get its types,
      // while at runtime Turbopack resolves to this pre-bundled legacy file.
      'pdfjs-dist': 'pdfjs-dist/legacy/build/pdf.js',
    },
  },
};

export default nextConfig;
