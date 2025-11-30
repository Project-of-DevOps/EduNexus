import { defineConfig } from 'vitest/config'

// Use jsdom environment and ensure setup file runs before tests so
// @testing-library/jest-dom matchers are registered onto vitest's expect.
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: 'tests/setupTests.ts',
    globals: true,
  },
})
