import { z } from "zod";

// Type for environment variables with proper typing
type ProcessEnv = {
  // biome-ignore lint/style/useNamingConvention: Environment variable names must match external API exactly
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: string;
  // biome-ignore lint/style/useNamingConvention: Environment variable names must match external API exactly
  NODE_ENV: "development" | "production" | "test";
  // biome-ignore lint/style/useNamingConvention: Environment variable names must match external API exactly
  NEXT_PUBLIC_APP_NAME?: string;
  // biome-ignore lint/style/useNamingConvention: Environment variable names must match external API exactly
  NEXT_PUBLIC_APP_VERSION?: string;
  // biome-ignore lint/style/useNamingConvention: Environment variable names must match external API exactly
  NEXT_PUBLIC_GA_ID?: string;
  // biome-ignore lint/style/useNamingConvention: Environment variable names must match external API exactly
  NEXT_PUBLIC_MAPS_DISABLED?: string;
};

// Environment variable schema
const envSchema = z.object({
  // Google Maps API Key (required)
  nextPublicGoogleMapsApiKey: z
    .string()
    .min(1, "Google Maps API key is required")
    .regex(/^AIza[0-9A-Za-z-_]{35}$/, "Invalid Google Maps API key format"),

  // Environment
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),

  // Optional app configuration
  nextPublicAppName: z.string().default("Metro Station Finder"),

  nextPublicAppVersion: z.string().default("1.0.0"),

  // Optional analytics
  nextPublicGaId: z.string().optional(),

  // Feature flags
  nextPublicMapsDisabled: z.boolean().default(false),
});

// Validate environment variables
const parseEnv = () => {
  try {
    // Map environment variables to camelCase schema
    const env = process.env as ProcessEnv;
    const envData = {
      nextPublicGoogleMapsApiKey: env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      nodeEnv: env.NODE_ENV,
      nextPublicAppName: env.NEXT_PUBLIC_APP_NAME,
      nextPublicAppVersion: env.NEXT_PUBLIC_APP_VERSION,
      nextPublicGaId: env.NEXT_PUBLIC_GA_ID,
      nextPublicMapsDisabled: env.NEXT_PUBLIC_MAPS_DISABLED === "true",
    };

    return envSchema.parse(envData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .filter(
          (err: z.ZodIssue) => err.code === "too_small" && err.minimum === 1
        )
        .map((err: z.ZodIssue) => {
          // Map camelCase back to UPPER_CASE for error messages
          const camelCaseKey = err.path.join(".");
          const envVarMap: Record<string, string> = {
            nextPublicGoogleMapsApiKey: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
            nodeEnv: "NODE_ENV",
            nextPublicAppName: "NEXT_PUBLIC_APP_NAME",
            nextPublicAppVersion: "NEXT_PUBLIC_APP_VERSION",
            nextPublicGaId: "NEXT_PUBLIC_GA_ID",
          };
          return envVarMap[camelCaseKey] || camelCaseKey;
        });

      if (missingVars.length > 0) {
        throw new Error(
          `Missing required environment variables: ${missingVars.join(", ")}\n` +
            "Please check your .env.local file and ensure all required variables are set."
        );
      }

      const invalidVars = error.issues
        .filter((err: z.ZodIssue) => err.code !== "too_small")
        .map((err: z.ZodIssue) => {
          const camelCaseKey = err.path.join(".");
          const envVarMap: Record<string, string> = {
            nextPublicGoogleMapsApiKey: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
            nodeEnv: "NODE_ENV",
            nextPublicAppName: "NEXT_PUBLIC_APP_NAME",
            nextPublicAppVersion: "NEXT_PUBLIC_APP_VERSION",
            nextPublicGaId: "NEXT_PUBLIC_GA_ID",
          };
          const envVarName = envVarMap[camelCaseKey] || camelCaseKey;
          return `${envVarName}: ${err.message}`;
        });

      if (invalidVars.length > 0) {
        throw new Error(
          `Invalid environment variables:\n${invalidVars.join("\n")}`
        );
      }
    }
    throw error;
  }
};

// Export validated environment variables
export const env = parseEnv();

// Type for environment variables
export type Env = z.infer<typeof envSchema>;

// Helper to check if we're in development
export const isDev = env.nodeEnv === "development";

// Helper to check if we're in production
export const isProd = env.nodeEnv === "production";

// Helper to check if we're in test
export const isTest = env.nodeEnv === "test";

// Google Maps API configuration
export const googleMapsConfig = {
  apiKey: env.nextPublicGoogleMapsApiKey,
  libraries: ["places", "geometry"] as const,
  region: "BD",
  language: "en",
} as const;

// App configuration
export const appConfig = {
  name: env.nextPublicAppName,
  version: env.nextPublicAppVersion,
  isDev,
  isProd,
  isTest,
} as const;
