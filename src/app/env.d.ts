interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
    // PostHog's project key (lib/analytics.ts). Only in .env.production: locally nothing is sent.
    readonly VITE_POSTHOG_KEY?: string;
    // Only to point PostHog at a local stand-in while testing. Unset: PostHog's EU cloud.
    readonly VITE_POSTHOG_HOST?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// package.json's version, set by vite.config.ts.
declare const __APP_VERSION__: string;
