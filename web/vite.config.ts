import { sites } from "@openai/sites-vite-plugin";
import tailwindcss from "@tailwindcss/postcss";
import vinext from "vinext";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import hostingConfig from "./.openai/hosting.json" with { type: "json" };

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "vinext/server/app-router-entry",
  ...(process.env.THEMESPACE_TEST === "1"
    ? {
        vars: {
          BETTER_AUTH_URL: "http://127.0.0.1:5180",
          BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
        },
      }
    : {}),
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async ({ command }) => {
  const nodeRuntime = process.env.THEMESPACE_RUNTIME === "node";
  const launcherPort =
    command === "serve" && process.env.THEMESPACE_TEST !== "1"
      ? Number(process.env.THEMESPACE_DEV_PORT)
      : NaN;
  const launched =
    Number.isInteger(launcherPort) &&
    launcherPort >= 1 &&
    launcherPort <= 65535;
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    // Concurrent API checks must not invalidate the preview's optimized modules.
    cacheDir:
      process.env.THEMESPACE_TEST === "1"
        ? ".wrangler/api-tests/vite-cache"
        : launched
          ? `.wrangler/dev-${launcherPort}/vite-cache`
          : undefined,
    environments: {
      rsc: {
        optimizeDeps: {
          include: ["better-auth/minimal", "better-auth/adapters/drizzle"],
        },
      },
      client: {
        optimizeDeps: {
          include: [
            "better-auth/react",
            "@better-auth-ui/core",
            "@better-auth-ui/react",
            "@tanstack/react-form",
            "@tanstack/react-query",
            "sonner",
          ],
        },
      },
    },
    css: { postcss: { plugins: [tailwindcss()] } },
    server: {
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
      ...(launched ? { strictPort: true } : {}),
    },
    plugins: [
      ...(nodeRuntime
        ? [
            {
              name: "themespace-node-storage",
              enforce: "pre" as const,
              resolveId(id: string) {
                if (
                  [
                    "@/db",
                    fileURLToPath(new URL("./db", import.meta.url)),
                    fileURLToPath(new URL("./db/index.ts", import.meta.url)),
                  ].includes(id)
                )
                  return fileURLToPath(
                    new URL("./db/node.ts", import.meta.url),
                  );
              },
            },
          ]
        : []),
      vinext(),
      ...(!nodeRuntime
        ? [
            sites(),
            cloudflare({
              persistState:
                process.env.THEMESPACE_TEST === "1"
                  ? { path: ".wrangler/api-tests" }
                  : true,
              viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
              config: {
                ...localBindingConfig,
                // Declared dev secrets honor process overrides, without importing
                // unrelated shell variables into the Worker or rewriting .env.
                ...(launched
                  ? {
                      secrets: {
                        required: [
                          "BETTER_AUTH_URL",
                          "BETTER_AUTH_SECRET",
                          "SITE_URL",
                        ],
                      },
                    }
                  : {}),
              },
            }),
          ]
        : []),
    ],
  };
});
