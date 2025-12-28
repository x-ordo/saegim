import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import { listOrganizations, Organization } from '../../../services/adminApi';
import { useAdminToken } from '../../../services/useAdminToken';

// Force SSR to ensure ClerkProvider is available
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function OrgsPage() {
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const token = await getAdminToken();
    const list = await listOrganizations(token);
    setOrgs(list);
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    load().catch((e) => setError((e as any)?.message || String(e)));
  }, [isLoaded, isSignedIn]);

  return (
    <AdminLayout title="Organization">
      <div className="stack">
        {!isLoaded && <div className="muted">Auth loading…</div>}
        {isLoaded && !isSignedIn && (
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>로그인이 필요합니다</div>
            <div className="muted">우측 상단의 로그인 버튼을 눌러주세요.</div>
          </div>
        )}

        {error && <div className="danger">{error}</div>}

        {isSignedIn && (
          <>
            <div className="card flat">
              <div style={{ fontWeight: 800, marginBottom: 6 }}>조직 연결</div>
              <div className="muted">
                이 서비스의 조직(테넌트)은 <b>외부 로그인 제공자(Clerk) Organization</b>의 <code>org_id</code>와 자동으로 연결됩니다.
                <br />
                조직 생성/관리는 Clerk에서 하고, Saegim은 그걸 그대로 업무툴로 씁니다.
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Plan</th>
                  <th>Logo</th>
                  <th>External Org ID</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.name}</td>
                    <td>{o.plan_type}</td>
                    <td>{o.logo_url ? (
                      <a href={o.logo_url} target="_blank" rel="noreferrer">view</a>
                    ) : '-'}</td>
                    <td className="mono">{o.external_org_id || '-'}</td>
                    <td>{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {orgs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">No organizations.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
