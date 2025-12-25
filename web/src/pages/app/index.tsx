import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { getDashboard, Dashboard } from '../../services/adminApi';
import { useAdminToken } from '../../services/useAdminToken';

type DateFilter = 'today' | 'week' | 'month' | 'custom';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateRange(filter: DateFilter): { start: string; end: string } {
  const today = new Date();
  const end = formatDate(today);

  switch (filter) {
    case 'today':
      return { start: end, end };
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      return { start: formatDate(weekAgo), end };
    }
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 29);
      return { start: formatDate(monthAgo), end };
    }
    default:
      return { start: end, end };
  }
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;

    (async () => {
      setLoading(true);
      setError(null);

      const token = await getAdminToken();
      const { start, end } = getDateRange(dateFilter);
      const data = await getDashboard(token, { start_date: start, end_date: end });
      setDashboard(data);
    })()
      .catch((e: any) => setError(e?.message || String(e)))
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, getAdminToken, dateFilter]);

  const dateFilterLabel = useMemo(() => {
    switch (dateFilter) {
      case 'today': return '오늘';
      case 'week': return '최근 7일';
      case 'month': return '최근 30일';
      default: return '오늘';
    }
  }, [dateFilter]);

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

        {!loading && isSignedIn && dashboard && (
          <>
            {/* Date Filter */}
            <div className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 600 }}>기간:</span>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd' }}
                >
                  <option value="today">오늘</option>
                  <option value="week">최근 7일</option>
                  <option value="month">최근 30일</option>
                </select>
                <span className="muted" style={{ marginLeft: 'auto' }}>
                  {dateFilterLabel} 현황
                </span>
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div className="kpi">
                <div className="v">{dashboard.kpi.total_orders}</div>
                <div className="k">전체 주문</div>
              </div>
              <div className="kpi">
                <div className="v" style={{ color: '#f59e0b' }}>{dashboard.kpi.proof_pending}</div>
                <div className="k">증빙 대기</div>
              </div>
              <div className="kpi">
                <div className="v" style={{ color: '#10b981' }}>{dashboard.kpi.proof_completed}</div>
                <div className="k">증빙 완료</div>
              </div>
              <div className="kpi">
                <div className="v" style={{ color: dashboard.kpi.notification_failed > 0 ? '#ef4444' : '#6b7280' }}>
                  {dashboard.kpi.notification_failed}
                </div>
                <div className="k">알림 실패</div>
              </div>
            </div>

            {/* Recent Proofs */}
            {dashboard.recent_proofs.length > 0 && (
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 12 }}>최근 증빙 (5건)</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 500 }}>주문번호</th>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 500 }}>컨텍스트</th>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 500 }}>유형</th>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 500 }}>업로드 시간</th>
                      <th style={{ textAlign: 'right', padding: '8px 0' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recent_proofs.map((proof) => (
                      <tr key={`${proof.order_id}-${proof.proof_type}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 0' }}>{proof.order_number}</td>
                        <td style={{ padding: '10px 0' }} className="muted">{proof.context || '-'}</td>
                        <td style={{ padding: '10px 0' }}>
                          <span style={{
                            fontSize: 12,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: proof.proof_type?.includes('BEFORE') ? '#fef3c7' :
                                        proof.proof_type?.includes('AFTER') ? '#d1fae5' : '#f3f4f6',
                            color: proof.proof_type?.includes('BEFORE') ? '#92400e' :
                                   proof.proof_type?.includes('AFTER') ? '#065f46' : '#374151',
                          }}>
                            {proof.proof_type?.includes('BEFORE') ? '수선 전' :
                             proof.proof_type?.includes('AFTER') ? '수선 후' : proof.proof_type || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 0' }} className="muted">{formatDateTime(proof.uploaded_at)}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <Link href={`/app/orders/${proof.order_id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                            확인 →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Quick Actions */}
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 10 }}>빠른 작업</div>
              <div className="row">
                <Link className="btn" href="/app/orders/new">새 주문 등록</Link>
                <Link className="btn secondary" href="/app/labels?mode=today">오늘 라벨 출력</Link>
                <Link className="btn secondary" href="/app/orders">주문 목록</Link>
                <Link className="btn secondary" href="/app/notifications">알림 현황</Link>
                <Link className="btn secondary" href="/app/analytics">분석 대시보드</Link>
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
