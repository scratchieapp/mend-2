/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_OPERATIONS_URL: string;
  readonly VITE_PUBLIC_URL: string;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}