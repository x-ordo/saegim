import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  OrganizationSwitcher,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth,
} from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { getMe, Me } from '../services/adminApi';
import { useAdminToken } from '../services/useAdminToken';

export const AdminLayout = ({
  title,
  children,
  allowNoOrg = false,
}: {
  title: string;
  children: React.ReactNode;
  allowNoOrg?: boolean;
}) => {
  const router = useRouter();
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const { getAdminToken } = useAdminToken();

  const [me, setMe] = useState<Me | null>(null);
  const [meErr, setMeErr] = useState<string | null>(null);

  const isOrgAdmin = useMemo(() => {
    const role = (me?.org_role || '').toLowerCase();
    if (!role) return false;
    if (role === 'admin' || role === 'owner') return true;
    if (role.endsWith(':admin') || role.endsWith(':owner')) return true;
    return false;
  }, [me?.org_role]);

  // Guard: require active organization for /app pages (multi-tenant scope)
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;

    const isApp = router.pathname.startsWith('/app');
    const isOnboarding = router.pathname === '/app/onboarding';

    if (!allowNoOrg && isApp && !isOnboarding && !orgId) {
      router.replace('/app/onboarding');
    }
  }, [allowNoOrg, isLoaded, isSignedIn, orgId, router]);

  // Fetch server-side org mapping (DB tenant) for display/debug
  useEffect(() => {
    const run = async () => {
      if (!isLoaded) return;
      if (!isSignedIn) return;
      if (!orgId) return;
      if (allowNoOrg) return;

      try {
        const token = await getAdminToken();
        const data = await getMe(token);
        setMe(data);
        setMeErr(null);
      } catch (e: any) {
        setMeErr(e?.message || 'Failed to load /me');
      }
    };
    run();
  }, [allowNoOrg, getAdminToken, isLoaded, isSignedIn, orgId]);

  return (
    <div className="page">
      <div className="container">
        <div className="topbar no-print">
          <div className="brand">
            <div className="name">새김</div>
            <div className="muted" style={{ marginLeft: 10 }}>
              saegim-pod
            </div>
          </div>

          <div className="nav">
            <Link href="/app">대시보드</Link>
            <Link href="/app/orders">주문</Link>
            <Link href="/app/products">상품</Link>
            <Link href="/app/deliveries">배송</Link>
            <Link href="/app/qr">QR</Link>
            <Link href="/app/couriers">배송기사</Link>
            <Link href="/app/orgs">조직</Link>
            {isOrgAdmin && <Link href="/app/settings/branding">설정</Link>}
          </div>

          <div className="actions">
            <SignedOut>
              <SignInButton>
                <button className="btn">로그인</button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <OrganizationSwitcher />
                <UserButton />
              </div>
            </SignedIn>
          </div>
        </div>

        <div className="row" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
          <div className="muted">v1 · 외부 로그인(Clerk) · 멀티테넌트(org_id → tenant)</div>
        </div>

        {meErr && <div className="danger">{meErr}</div>}

        {isLoaded && isSignedIn && !orgId && !allowNoOrg && (
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>조직이 선택되지 않았습니다</div>
            <div className="muted" style={{ marginBottom: 10 }}>
              백오피스는 조직(업체) 단위로 스코프가 잠깁니다. 먼저 조직을 만들거나 선택하세요.
            </div>
            <button className="btn" onClick={() => router.push('/app/onboarding')}>
              조직 설정으로 이동
            </button>
          </div>
        )}

        {me?.organization && (
          <div className="muted" style={{ marginBottom: 10 }}>
            현재 조직: <b>{me.organization.name}</b> (plan: {me.organization.plan_type})
          </div>
        )}

        {children}
      </div>
    </div>
  );
};
