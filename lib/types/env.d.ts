declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
    NEXT_PUBLIC_APP_NAME?: string;
    NEXT_PUBLIC_APP_VERSION?: string;
    NEXT_PUBLIC_GA_ID?: string;
    NEXT_PUBLIC_MAPS_DISABLED?: string;
    NODE_ENV: "development" | "production" | "test";
  }
}
