declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ADMIN_PASSWORD: string;
      R2_ACCESS_KEY_ID: string;
      R2_SECRET_ACCESS_KEY: string;
      R2_BUCKET_NAME: string;
      R2_ENDPOINT: string;
      R2_PUBLIC_URL: string;
      MAX_FILE_SIZE?: string;
    }
  }
}

export {};
