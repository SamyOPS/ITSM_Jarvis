class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.entries.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }
}

function defineStorage(name: 'localStorage' | 'sessionStorage'): void {
  if (typeof window === 'undefined' || window[name]) {
    return;
  }

  Object.defineProperty(window, name, {
    configurable: true,
    value: new MemoryStorage(),
  });
}

defineStorage('localStorage');
defineStorage('sessionStorage');
