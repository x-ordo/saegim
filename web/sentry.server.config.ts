import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance Monitoring
    tracesSampleRate: 0.1,

    // Don't send PII
    sendDefaultPii: false,

    // Only send errors in production
    enabled: process.env.NODE_ENV === "production",
  });
}
