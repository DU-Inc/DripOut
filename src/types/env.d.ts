// src/env.d.ts
// Types for environment variables

declare module '@env' {
  export const API_BASE_URL: string;
  export const FIREBASE_CLIENT_ID: string;
  export const FIREBASE_API_KEY: string;
  export const FIREBASE_AUTH_DOMAIN: string;
  export const FIREBASE_PROJECT_ID: string;
  export const FIREBASE_STORAGE_BUCKET: string;
  export const FIREBASE_MESSAGING_SENDER_ID: string;
  export const FIREBASE_APP_ID: string;

  // Fashion news API keys
  export const NEWSAPI_KEY: string;
  export const NEWSDATA_KEY: string;
  export const NYT_API_KEY: string;
  export const NYT_API_SECRET: string;
  export const GUARDIAN_API_KEY: string;
  export const RAPIDAPI_KEY: string;
  export const RAPIDAPI_FASHION_HOST: string;

  // OpenAI API Key
  export const OPENAI_API_KEY: string;
}
