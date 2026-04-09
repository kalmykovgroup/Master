import {MMKV} from 'react-native-mmkv';

export function createStorage(id: string) {
  const mmkv = new MMKV({id});
  return {
    getItem: (key: string): string | null => mmkv.getString(key) ?? null,
    setItem: (key: string, value: string): void => mmkv.set(key, value),
    removeItem: (key: string): void => mmkv.delete(key),
  };
}
