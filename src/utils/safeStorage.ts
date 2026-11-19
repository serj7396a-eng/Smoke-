// Safe storage wrapper with in-memory fallback so opening a standalone single-file HTML
// via file:// or content:// on Android Chrome NEVER crashes with SecurityError.

export const STORAGE_QUIT_TS_KEY = 'neuroshtil_quit_timestamp_v1';
export const DEFAULT_INITIAL_QUIT_ISO = '2026-11-19T16:13:00+03:00';
export const DEFAULT_INITIAL_QUIT_TIMESTAMP_MS = Date.parse(DEFAULT_INITIAL_QUIT_ISO);

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const memoryFallbackMap = new Map<string, string>();

function defaultStorageAccessor(): StorageLike | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  // Accessing window.localStorage itself can throw SecurityError on file:// or content:// URIs
  return window.localStorage;
}

export function safeGetItem(
  key: string,
  getStorage: () => StorageLike | undefined = defaultStorageAccessor
): string | null {
  try {
    const storage = getStorage();
    if (storage) {
      const value = storage.getItem(key);
      if (value !== null) {
        memoryFallbackMap.set(key, value);
        return value;
      }
    }
  } catch {
    // Fallback to in-memory map when SecurityError or access denial occurs
  }
  return memoryFallbackMap.get(key) ?? null;
}

export function safeSetItem(
  key: string,
  value: string,
  getStorage: () => StorageLike | undefined = defaultStorageAccessor
): void {
  memoryFallbackMap.set(key, value);
  try {
    const storage = getStorage();
    if (storage) {
      storage.setItem(key, value);
    }
  } catch {
    // Ignore SecurityError / QuotaExceededError; value remains active in memoryFallbackMap
  }
}

export function clearMemoryFallbackForTests(): void {
  memoryFallbackMap.clear();
}

export function loadInitialQuitTimestamp(
  getStorage: () => StorageLike | undefined = defaultStorageAccessor
): number {
  const raw = safeGetItem(STORAGE_QUIT_TS_KEY, getStorage);
  if (raw !== null && raw.trim() !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= Date.now() + 60_000) {
      return parsed;
    }
  }

  safeSetItem(
    STORAGE_QUIT_TS_KEY,
    String(DEFAULT_INITIAL_QUIT_TIMESTAMP_MS),
    getStorage
  );
  return DEFAULT_INITIAL_QUIT_TIMESTAMP_MS;
}

export function saveQuitTimestamp(
  timestampMs: number,
  getStorage: () => StorageLike | undefined = defaultStorageAccessor
): void {
  safeSetItem(STORAGE_QUIT_TS_KEY, String(timestampMs), getStorage);
}
