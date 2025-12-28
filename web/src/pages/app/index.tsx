import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../components/AdminLayout';
import { listOrders, Order } from '../../services/adminApi';
import { useAdminToken } from '../../services/useAdminToken';

// Force SSR to ensure ClerkProvider is available
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function Dashboard() {
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;

    (async () => {
      setLoading(true);
      setError(null);

      const token = await getAdminToken();
      const list = await listOrders(token);
      setOrders(list);
    })()
      .catch((e: any) => setError(e?.message || String(e)))
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, getAdminToken]);

  const kpis = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;
    return {
      total: orders.length,
      byStatus: counts,
    };
  }, [orders]);

  return (
    <AdminLayout title="Dashboard">
      <div className="stack">
        {!isLoaded && <div className="muted">Auth loading…</div>}
        {isLoaded && !isSignedIn && (
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>로그인이 필요합니다</div>
            <div className="muted">우측 상단의 로그인 버튼을 눌러주세요.</div>
          </div>
        )}

        {error && <div className="danger">{error}</div>}
        {loading && isSignedIn && <div className="muted">Loading…</div>}

        {!loading && isSignedIn && (
          <>
            <div className="grid3">
              <div className="kpi">
                <div className="v">{kpis.total}</div>
                <div className="k">최근 주문 (최대 50건)</div>
              </div>
              <div className="kpi">
                <div className="v">{kpis.byStatus.PROOF_UPLOADED || 0}</div>
                <div className="k">증빙 완료</div>
              </div>
              <div className="kpi">
                <div className="v">{(kpis.byStatus.PENDING || 0) + (kpis.byStatus.TOKEN_ISSUED || 0)}</div>
                <div className="k">대기 / 토큰 발급</div>
              </div>
            </div>

            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 10 }}>빠른 작업</div>
              <div className="row">
                <Link className="btn" href="/app/orders/new">새 주문 등록</Link>
                <Link className="btn secondary" href="/app/orders">주문 목록</Link>
                <Link className="btn secondary" href="/app/orgs">조직 관리</Link>
              </div>
              <div className="muted" style={{ marginTop: 10 }}>
                운영 흐름: <b>주문 등록</b> → <b>토큰 발급/QR 출력</b> → 기사/현장 <b>촬영 업로드</b> → 구매자/수령자 <b>링크 확인</b>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
