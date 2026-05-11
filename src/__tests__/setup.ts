import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Мок localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  },
  writable: true,
});

// Мок fetch
global.fetch = vi.fn();