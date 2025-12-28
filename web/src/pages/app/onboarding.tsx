import { useEffect } from 'react';
import { OrganizationSwitcher, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../components/AdminLayout';

// Force SSR to ensure ClerkProvider is available
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function Onboarding() {
  const router = useRouter();
  const { isLoaded, isSignedIn, orgId } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;
    if (orgId) router.replace('/app');
  }, [isLoaded, isSignedIn, orgId, router]);

  return (
    <AdminLayout title="조직 설정" allowNoOrg>
      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>업체(조직)를 선택하거나 생성하세요</div>
        <div className="muted" style={{ marginBottom: 12 }}>
          새김 백오피스는 조직 단위로 데이터가 분리됩니다. 조직을 선택하면 자동으로 대시보드로 이동합니다.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <OrganizationSwitcher />
        </div>

        <div className="muted" style={{ marginTop: 14 }}>
          팁: OrganizationSwitcher에서 “Create organization”을 눌러 새 업체를 만들 수 있습니다.
        </div>
      </div>
    </AdminLayout>
  );
}
