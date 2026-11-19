import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearMemoryFallbackForTests,
  DEFAULT_INITIAL_QUIT_ISO,
  DEFAULT_INITIAL_QUIT_TIMESTAMP_MS,
  loadInitialQuitTimestamp,
  safeGetItem,
  safeSetItem,
  saveQuitTimestamp,
  STORAGE_QUIT_TS_KEY,
  StorageLike
} from './safeStorage';

test('DEFAULT_INITIAL_QUIT_TIMESTAMP_MS parses 2026-11-19T16:13:00+03:00 accurately', () => {
  assert.equal(DEFAULT_INITIAL_QUIT_ISO, '2026-11-19T16:13:00+03:00');
  assert.equal(
    DEFAULT_INITIAL_QUIT_TIMESTAMP_MS,
    Date.UTC(2026, 10, 19, 13, 13, 0, 0)
  );
});

test('Android Chrome file:// and content:// SecurityError on window.localStorage getter falls back cleanly to in-memory map', () => {
  clearMemoryFallbackForTests();

  const throwingAccessor = (): StorageLike => {
    const err = new Error('Failed to read the localStorage property from Window: Access is denied for this document.');
    err.name = 'SecurityError';
    throw err;
  };

  // First open with blocked localStorage returns 2026-11-19T16:13:00+03:00 and never throws
  const initialTs = loadInitialQuitTimestamp(throwingAccessor);
  assert.equal(initialTs, DEFAULT_INITIAL_QUIT_TIMESTAMP_MS);
  assert.equal(
    safeGetItem(STORAGE_QUIT_TS_KEY, throwingAccessor),
    String(DEFAULT_INITIAL_QUIT_TIMESTAMP_MS)
  );

  // Updating timestamp via saveQuitTimestamp persists in the in-memory fallback map
  const customTs = Date.UTC(2026, 10, 18, 9, 30, 0, 0);
  saveQuitTimestamp(customTs, throwingAccessor);
  assert.equal(loadInitialQuitTimestamp(throwingAccessor), customTs);
});

test('existing valid user quit timestamp in working storage is strictly preserved', () => {
  clearMemoryFallbackForTests();
  const backing = new Map<string, string>();
  const mockStorage: StorageLike = {
    getItem: (k) => backing.get(k) ?? null,
    setItem: (k, v) => {
      backing.set(k, v);
    }
  };

  const existingTs = Date.UTC(2026, 10, 19, 7, 0, 0, 0);
  backing.set(STORAGE_QUIT_TS_KEY, String(existingTs));

  const loaded = loadInitialQuitTimestamp(() => mockStorage);
  assert.equal(loaded, existingTs);

  // Empty storage initializes to 2026-11-19T16:13:00+03:00
  clearMemoryFallbackForTests();
  backing.clear();
  const initialized = loadInitialQuitTimestamp(() => mockStorage);
  assert.equal(initialized, DEFAULT_INITIAL_QUIT_TIMESTAMP_MS);
  assert.equal(backing.get(STORAGE_QUIT_TS_KEY), String(DEFAULT_INITIAL_QUIT_TIMESTAMP_MS));

  // Storage throwing QuotaExceededError on setItem still updates memory fallback without crashing
  const readOnlyStorage: StorageLike = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    }
  };
  safeSetItem('custom-key', 'ok', () => readOnlyStorage);
  assert.equal(safeGetItem('custom-key', () => readOnlyStorage), 'ok');
});
