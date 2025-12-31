import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { getMe, Me } from '../services/adminApi';
import { useAdminToken } from '../services/useAdminToken';

const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Conditional imports for Clerk components - only load when Clerk is configured
// eslint-disable-next-line @typescript-eslint/no-var-requires
const clerkComponents = clerkPubKey ? require('@clerk/nextjs') : null;
const OrganizationSwitcher = clerkComponents?.OrganizationSwitcher;
const SignedIn = clerkComponents?.SignedIn;
const SignedOut = clerkComponents?.SignedOut;
const SignInButton = clerkComponents?.SignInButton;
const UserButton = clerkComponents?.UserButton;
const useAuth = clerkComponents?.useAuth;

interface AdminLayoutProps {
  title: string;
  children: React.ReactNode;
  allowNoOrg?: boolean;
}

// Layout component when Clerk is configured
function AdminLayoutWithClerk({ title, children, allowNoOrg = false }: AdminLayoutProps) {
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

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;

    const isApp = router.pathname.startsWith('/app');
    const isOnboarding = router.pathname === '/app/onboarding';

    if (!allowNoOrg && isApp && !isOnboarding && !orgId) {
      router.replace('/app/onboarding');
    }
  }, [allowNoOrg, isLoaded, isSignedIn, orgId, router]);

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
    <AdminLayoutShell
      title={title}
      meErr={meErr}
      me={me}
      isLoaded={isLoaded}
      isSignedIn={isSignedIn}
      orgId={orgId}
      isOrgAdmin={isOrgAdmin}
      allowNoOrg={allowNoOrg}
      showClerkAuth={true}
    >
      {children}
    </AdminLayoutShell>
  );
}

// Layout component when Clerk is NOT configured (dev mode)
function AdminLayoutWithoutClerk({ title, children, allowNoOrg = false }: AdminLayoutProps) {
  return (
    <AdminLayoutShell
      title={title}
      meErr={null}
      me={null}
      isLoaded={true}
      isSignedIn={false}
      orgId={null}
      isOrgAdmin={false}
      allowNoOrg={allowNoOrg}
      showClerkAuth={false}
    >
      {children}
    </AdminLayoutShell>
  );
}

// Shared layout shell (no hooks that require ClerkProvider)
function AdminLayoutShell({
  title,
  children,
  meErr,
  me,
  isLoaded,
  isSignedIn,
  orgId,
  isOrgAdmin,
  allowNoOrg,
  showClerkAuth,
}: {
  title: string;
  children: React.ReactNode;
  meErr: string | null;
  me: Me | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  orgId: string | null | undefined;
  isOrgAdmin: boolean;
  allowNoOrg: boolean;
  showClerkAuth: boolean;
}) {
  const router = useRouter();
  const currentPath = router.pathname;

  // Helper to determine if a nav link is currently active
  const isActive = (href: string) => {
    if (href === '/app') {
      return currentPath === '/app';
    }
    return currentPath.startsWith(href);
  };

  return (
    <div className="page">
      <div className="container">
        <header className="topbar no-print">
          <div className="brand">
            <div className="name">새김</div>
            <div className="muted" style={{ marginLeft: 10 }}>
              saegim-pod
            </div>
          </div>

          <nav className="nav" aria-label="주요 메뉴">
            <Link href="/app" aria-current={isActive('/app') ? 'page' : undefined}>대시보드</Link>
            <Link href="/app/orders" aria-current={isActive('/app/orders') ? 'page' : undefined}>주문</Link>
            <Link href="/app/products" aria-current={isActive('/app/products') ? 'page' : undefined}>상품</Link>
            <Link href="/app/deliveries" aria-current={isActive('/app/deliveries') ? 'page' : undefined}>배송</Link>
            <Link href="/app/qr" aria-current={isActive('/app/qr') ? 'page' : undefined}>QR</Link>
            <Link href="/app/couriers" aria-current={isActive('/app/couriers') ? 'page' : undefined}>배송기사</Link>
            <Link href="/app/notifications" aria-current={isActive('/app/notifications') ? 'page' : undefined}>알림</Link>
            <Link href="/app/reminders" aria-current={isActive('/app/reminders') ? 'page' : undefined}>리마인더</Link>
            <Link href="/app/analytics" aria-current={isActive('/app/analytics') ? 'page' : undefined}>분석</Link>
            <Link href="/app/orgs" aria-current={isActive('/app/orgs') ? 'page' : undefined}>조직</Link>
            {isOrgAdmin && <Link href="/app/settings/branding" aria-current={isActive('/app/settings') ? 'page' : undefined}>설정</Link>}
          </nav>

          <div className="actions">
            {showClerkAuth ? (
              <>
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
              </>
            ) : (
              <span className="muted" style={{ fontSize: 12 }}>Clerk 미설정 (개발 모드)</span>
            )}
          </div>
        </header>

        <main id="main-content">
          <div className="row" style={{ marginBottom: 12 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h1>
            <div className="muted">v1 · 외부 로그인(Clerk) · 멀티테넌트(org_id → tenant)</div>
          </div>

          {meErr && <div className="danger" role="alert">{meErr}</div>}

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

          {!showClerkAuth && (
            <div className="card" style={{ marginBottom: 16, background: '#fef3c7', border: '1px solid #f59e0b' }} role="alert">
              <div style={{ fontWeight: 700, marginBottom: 6, color: '#92400e' }}>개발 모드</div>
              <div style={{ fontSize: 13, color: '#78350f' }}>
                Clerk가 설정되지 않아 인증 없이 UI를 미리봅니다.
                실제 데이터를 보려면 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY를 설정하세요.
              </div>
            </div>
          )}

          {me?.organization && (
            <div className="muted" style={{ marginBottom: 10 }}>
              현재 조직: <b>{me.organization.name}</b> (plan: {me.organization.plan_type})
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}

// Export the appropriate layout based on Clerk configuration
export const AdminLayout = clerkPubKey ? AdminLayoutWithClerk : AdminLayoutWithoutClerk;
