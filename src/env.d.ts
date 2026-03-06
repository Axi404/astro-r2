/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ADMIN_PASSWORD?: string;
  readonly MAX_FILE_SIZE?: string;
  readonly R2_ACCESS_KEY_ID?: string;
  readonly R2_ACCOUNT_ID?: string;
  readonly R2_BUCKET_NAME?: string;
  readonly R2_ENDPOINT?: string;
  readonly R2_PUBLIC_URL?: string;
  readonly R2_SECRET_ACCESS_KEY?: string;
  readonly SESSION_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
