import type { AppProps } from 'next/app';
import { ClerkProvider } from '@clerk/nextjs';
// TODO: Re-enable Ant Design after fixing Node.js 22 ESM compatibility
// import { ConfigProvider } from 'antd';
// import koKR from 'antd/locale/ko_KR';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '../styles/globals.css';

const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// TODO: Re-enable Ant Design theme after fixing Node.js 22 ESM compatibility
// const antdTheme = {
//   token: {
//     colorPrimary: '#171717',
//     colorSuccess: '#16a34a',
//     colorWarning: '#d97706',
//     colorError: '#dc2626',
//     colorInfo: '#2563eb',
//     borderRadius: 12,
//     fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
//   },
//   components: {
//     Button: {
//       controlHeight: 40,
//       controlHeightLG: 48,
//     },
//     Input: {
//       controlHeight: 40,
//     },
//     Select: {
//       controlHeight: 40,
//     },
//   },
// };

export default function App({ Component, pageProps }: AppProps) {
  const content = (
    // TODO: Re-enable ConfigProvider after fixing Node.js 22 ESM compatibility
    // <ConfigProvider locale={koKR} theme={antdTheme}>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    // </ConfigProvider>
  );

  // Skip Clerk if no publishable key (local dev without auth)
  if (!clerkPubKey) {
    return (
      <>
        {/* WCAG 2.4.1: Skip to main content link */}
        <a href="#main-content" className="skip-link">
          본문으로 건너뛰기
        </a>
        {content}
      </>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey} {...pageProps}>
      {/* WCAG 2.4.1: Skip to main content link */}
      <a href="#main-content" className="skip-link">
        본문으로 건너뛰기
      </a>
      {content}
    </ClerkProvider>
  );
}
