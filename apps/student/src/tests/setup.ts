import '@testing-library/jest-dom';
import { vi } from 'vitest';

Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => '12345678-1234-1234-1234-123456789012'
  }
});

// Mock Preferences and capacitor sqlite
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  }
}));

vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {},
  SQLiteConnection: vi.fn().mockImplementation(() => ({
    createConnection: vi.fn().mockResolvedValue({
      open: vi.fn(),
      execute: vi.fn(),
      query: vi.fn().mockResolvedValue({ values: [] }),
      run: vi.fn(),
    })
  }))
}));
