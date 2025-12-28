import type { AppProps } from 'next/app';
import { ClerkProvider } from '@clerk/nextjs';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '../styles/globals.css';

const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function App({ Component, pageProps }: AppProps) {
  const content = (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );

  // Skip Clerk if no publishable key (local dev without auth)
  if (!clerkPubKey) {
    return content;
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey} {...pageProps}>
      {content}
    </ClerkProvider>
  );
}
