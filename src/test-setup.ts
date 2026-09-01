// zustand's persist middleware needs a storage backend; tests run in node.
const entries = new Map<string, string>()

globalThis.localStorage = {
  getItem: (key: string) => entries.get(key) ?? null,
  setItem: (key: string, value: string) => {
    entries.set(key, String(value))
  },
  removeItem: (key: string) => {
    entries.delete(key)
  },
  clear: () => {
    entries.clear()
  },
  key: (index: number) => [...entries.keys()][index] ?? null,
  get length() {
    return entries.size
  },
} as Storage
