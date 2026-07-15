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
    coopmanagerPhotos?: {
      save: (workspaceId: string, dataUrl: string) => Promise<string>;
      remove: (workspaceId: string, fileName: string) => Promise<void>;
      clearAll: (workspaceId: string) => Promise<void>;
      getUrl: (workspaceId: string, fileName: string) => Promise<string>;
      migrateLegacy: (workspaceId: string) => Promise<void>;
    };
  }
}

export {};
