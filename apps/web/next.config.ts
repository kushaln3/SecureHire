import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile workspace packages so Next.js/Turbopack can bundle them from source
  transpilePackages: ["@eternity-id/identity-vault", "@kohaku-eth/provider"],

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {
    resolveAlias: {
      // @kohaku-eth/pq-account is not on npm — map it to an empty module
      // so the dynamic-import try/catch in pq-account.ts handles the fallback
      "@kohaku-eth/pq-account": { browser: "./src/lib/kohaku-empty.ts" },
    },
  },
};

export default nextConfig;
