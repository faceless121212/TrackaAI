import "@testing-library/jest-dom/vitest";

// jsdom lacks these; cmdk and Radix use them.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
// Database tests run in the node environment, where there is no DOM.
if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView ??= function scrollIntoView() {};
}
