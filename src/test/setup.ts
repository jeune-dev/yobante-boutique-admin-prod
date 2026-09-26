import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Chaque test repart d'un DOM et d'un stockage vierges.
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// Les routeurs de données (createMemoryRouter) construisent un `Request`
// (undici, Node) avec l'AbortSignal de jsdom, que undici refuse. Le signal
// n'a pas d'utilité en test : on l'écarte pour toutes les suites.
const RequestNode = globalThis.Request;
globalThis.Request = class extends RequestNode {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const options: RequestInit = { ...init };
    delete options.signal;
    super(input, options);
  }
};
