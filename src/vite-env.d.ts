/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    coopmanagerStorage?: {
      getItem: <T = unknown>(key: string) => Promise<T | null>;
      setItem: <T = unknown>(key: string, value: T) => Promise<void>;
      removeItem: (key: string) => Promise<void>;
      clearAll: () => Promise<void>;
    };
  }
}

export {};
