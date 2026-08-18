import { defineConfig } from "vitest/config";

// TARS gate: vitest owns unit tests only (tests/).
// E2E lives in tests-e2e/ and runs under Playwright (`npm run smoke`).
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "jsdom",
  },
});
