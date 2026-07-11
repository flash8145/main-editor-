// Node >= 22.4 defines a global `localStorage` that throws/returns undefined
// unless the process is started with `--localstorage-file`. Tests that touch
// zustand persist middleware or the i18n language detector then fail on
// `localStorage.getItem/setItem` even though the global "exists".
// This shim installs a plain in-memory Storage when the ambient one is absent
// or unusable. It must be imported BEFORE any module that reads localStorage
// at import time (it is the first import in setup.ts).

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? (store.get(key) ?? null) : null),
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
  }
}

function isUsable(candidate: unknown): candidate is Storage {
  if (!candidate) return false
  try {
    const probe = candidate as Storage
    const key = '__localstorage_shim_probe__'
    probe.setItem(key, '1')
    probe.removeItem(key)
    return true
  } catch {
    return false
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  const globalRef = globalThis as Record<string, unknown>
  if (!isUsable(globalRef[name])) {
    Object.defineProperty(globalThis, name, {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    })
  }
}
