import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement ResizeObserver. The Table component uses one to
// measure its scroll container (never window.innerHeight, so the app works
// embedded in an iframe) — stub it out so components that construct one
// don't crash under test. Tests that care about viewport/set pass the
// virtual range directly instead of relying on a real observation.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
