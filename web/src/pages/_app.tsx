import type { AppProps } from 'next/app';
import { ClerkProvider } from '@clerk/nextjs';
import '../styles/globals.css';

const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function App({ Component, pageProps }: AppProps) {
  // Skip Clerk if no publishable key (local dev without auth)
  if (!clerkPubKey) {
    return <Component {...pageProps} />;
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey} {...pageProps}>
      <Component {...pageProps} />
    </ClerkProvider>
  );
}
