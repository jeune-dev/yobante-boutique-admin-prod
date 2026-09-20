import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Chaque test repart d'un DOM et d'un stockage vierges.
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
