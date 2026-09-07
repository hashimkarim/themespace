import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.THEMESPACE_RUNTIME === "node"
    ? {
        output: "standalone",
        serverExternalPackages: ["better-sqlite3", "drizzle-orm"],
      }
    : {}),
};

export default nextConfig;
