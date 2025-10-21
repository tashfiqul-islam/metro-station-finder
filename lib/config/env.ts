import { z } from "zod";

/**
 * Environment variable validation with Zod v4.
 * Follows TypeScript 5.9+ and Next.js 15 conventions for type-safe env validation.
 *
 * Next.js automatically loads environment variables from .env* files in the following order:
 * 1. process.env
 * 2. .env.$(NODE_ENV).local
 * 3. .env.local (not loaded in test environment)
 * 4. .env.$(NODE_ENV)
 * 5. .env
 *
 * Variables prefixed with NEXT_PUBLIC_ are inlined at build time and exposed to the browser.
 * Non-prefixed variables are only available on the server side.
 *
 * @see https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
 */

const GOOGLE_MAPS_API_KEY_REGEX = /^AIza[0-9A-Za-z-_]{30,}$/;

/**
 * Schema for client-side environment variables (NEXT_PUBLIC_*).
 * These are inlined at build time and exposed to the browser.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z
    .string()
    .regex(GOOGLE_MAPS_API_KEY_REGEX, {
      message: "Invalid Google Maps API key format. Expected: AIza...",
    })
    .optional()
    .transform((val) => val || undefined),
  NEXT_PUBLIC_APP_NAME: z.string().default("Metro Station Finder"),
  NEXT_PUBLIC_APP_VERSION: z.string().default("1.0.0"),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_MAPS_DISABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((val) => val === "true"),
});

/**
 * Schema for server-side environment variables.
 * These are only available on the server and never exposed to the browser.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * Combined environment schema with production validation.
 */
const envSchema = clientEnvSchema.extend(serverEnvSchema.shape).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production" && !data.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    ctx.addIssue({
      code: "custom",
      path: ["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"],
      message:
        "Google Maps API key is required in production. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.",
    });
  }
});

/**
 * Validates environment variables with detailed error reporting.
 * Uses Zod v4 error handling for clear, actionable messages.
 */
function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => {
        const path = issue.path.join(".");
        return `  ${path}: ${issue.message}`;
      })
      .join("\n");

    throw new Error(
      `❌ Invalid environment variables:\n${errors}\n\nPlease check your .env file or .env.local for local overrides.`
    );
  }

  return result.data;
}

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;

export const isDev = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

/**
 * Google Maps API configuration.
 */
export const googleMapsConfig = {
  apiKey: env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  libraries: ["places", "geometry"] as const,
  region: "BD" as const,
  language: "en" as const,
  isConfigured: Boolean(env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
} as const;

/**
 * Application configuration.
 */
export const appConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  version: env.NEXT_PUBLIC_APP_VERSION,
  environment: env.NODE_ENV,
  isDev,
  isProd,
  isTest,
  mapsDisabled: env.NEXT_PUBLIC_MAPS_DISABLED,
} as const;

if (isDev && !googleMapsConfig.isConfigured) {
  const warning =
    "⚠️  Google Maps API key not configured. Map features will be disabled.\n" +
    "   Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file (or .env.local for local overrides).\n" +
    "   Get an API key: https://console.cloud.google.com/google/maps-apis";
  console?.warn(warning);
}
