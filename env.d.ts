declare global {
  interface Env {
    ADMIN_PASSWORD: string;
    R2_PUBLIC_URL: string;
    MAX_FILE_SIZE?: string;
    IMAGES_BUCKET: R2Bucket;
  }
}

export {};
