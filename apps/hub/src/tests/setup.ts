import '@testing-library/jest-dom';
import { vi } from 'vitest';

Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => '12345678-1234-1234-1234-123456789012',
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  }
});

// Mock Tauri plugin-sql
vi.mock('@tauri-apps/plugin-sql', () => {
  class Database {
    static async load() {
      return new Database();
    }
    async execute() {}
    async select() { return []; }
  }
  return { default: Database };
});

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));
