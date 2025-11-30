import { expect } from 'vitest'
// Import jest-dom matchers and attach to Vitest's expect
import * as matchers from '@testing-library/jest-dom/matchers'

// `matchers` is exported as a set of named matchers; attach them to vitest's expect
expect.extend(matchers as any)

// Provide a small helper to make debugging easier
// (no-op here; left for future shared setup)
