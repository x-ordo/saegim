import { SignIn } from '@clerk/nextjs';
import { GetServerSideProps } from 'next';

// Force SSR to ensure ClerkProvider is available
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function Page() {
  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card">
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Saegim Backoffice</div>
          <div className="muted" style={{ marginBottom: 14 }}>로그인 후 주문/증빙 운영 화면으로 이동합니다.</div>
          <SignIn routing="path" path="/sign-in" />
        </div>
      </div>
    </div>
  );
}
