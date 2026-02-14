import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        isolatedStorage: false,
        wrangler: {
          configPath: "./wrangler.toml",
        },
        miniflare: {
          d1Databases: ["FOCUS_DB"],
          r2Buckets: ["FOCUS_STORAGE"],
        },
      },
    },
  },
});
