export function createStorage(id: string) {
  const prefix = `@${id}/`;
  return {
    getItem: (key: string): string | null => localStorage.getItem(prefix + key),
    setItem: (key: string, value: string): void => localStorage.setItem(prefix + key, value),
    removeItem: (key: string): void => localStorage.removeItem(prefix + key),
  };
}
