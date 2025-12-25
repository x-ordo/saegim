import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { getAnalytics, Analytics } from '../../services/adminApi';
import { useAdminToken } from '../../services/useAdminToken';

type DateFilter = 'week' | 'month' | 'quarter' | 'custom';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateRange(filter: DateFilter): { start: string; end: string } {
  const today = new Date();
  const end = formatDate(today);

  switch (filter) {
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
    case 'quarter': {
      const quarterAgo = new Date(today);
      quarterAgo.setDate(quarterAgo.getDate() - 89);
      return { start: formatDate(quarterAgo), end };
    }
    default:
      return { start: end, end };
  }
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return '-';
  if (minutes < 60) return `${Math.round(minutes)}분`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
}

// Simple bar chart component
function SimpleBarChart({ data, height = 120 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, paddingTop: 20 }}>
      {data.map((item, idx) => (
        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: item.color || '#374151' }}>{item.value}</div>
          <div
            style={{
              width: '100%',
              height: Math.max((item.value / maxValue) * (height - 40), 4),
              background: item.color || '#3b82f6',
              borderRadius: 4,
              transition: 'height 0.3s ease',
            }}
          />
          <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

// Simple trend chart component
function TrendChart({ data, height = 150 }: { data: Analytics['daily_trends']; height?: number }) {
  if (data.length === 0) return <div className="muted">데이터 없음</div>;

  const maxOrders = Math.max(...data.map(d => d.orders), 1);
  const maxProofs = Math.max(...data.map(d => d.proofs), 1);
  const maxValue = Math.max(maxOrders, maxProofs);

  // Show only every nth label to avoid crowding
  const labelInterval = Math.ceil(data.length / 7);

  return (
    <div style={{ height }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 12, background: '#3b82f6', borderRadius: 2 }} />
          <span>주문</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 12, background: '#10b981', borderRadius: 2 }} />
          <span>증빙</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: height - 50 }}>
        {data.map((item, idx) => (
          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', width: '100%' }}>
              <div
                style={{
                  flex: 1,
                  height: Math.max((item.orders / maxValue) * (height - 70), 2),
                  background: '#3b82f6',
                  borderRadius: '2px 2px 0 0',
                }}
                title={`주문: ${item.orders}`}
              />
              <div
                style={{
                  flex: 1,
                  height: Math.max((item.proofs / maxValue) * (height - 70), 2),
                  background: '#10b981',
                  borderRadius: '2px 2px 0 0',
                }}
                title={`증빙: ${item.proofs}`}
              />
            </div>
            {idx % labelInterval === 0 && (
              <div style={{ fontSize: 10, color: '#6b7280', transform: 'rotate(-45deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>
                {item.date.slice(5)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;

    (async () => {
      setLoading(true);
      setError(null);

      const token = await getAdminToken();
      const { start, end } = getDateRange(dateFilter);
      const data = await getAnalytics(token, { start_date: start, end_date: end });
      setAnalytics(data);
    })()
      .catch((e: any) => setError(e?.message || String(e)))
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, getAdminToken, dateFilter]);

  const dateFilterLabel = useMemo(() => {
    switch (dateFilter) {
      case 'week': return '최근 7일';
      case 'month': return '최근 30일';
      case 'quarter': return '최근 90일';
      default: return '최근 30일';
    }
  }, [dateFilter]);

  const channelData = useMemo(() => {
    if (!analytics) return [];
    const { channel_breakdown } = analytics;
    return [
      { label: '알림톡 성공', value: channel_breakdown.alimtalk_sent, color: '#10b981' },
      { label: '알림톡 실패', value: channel_breakdown.alimtalk_failed, color: '#ef4444' },
      { label: 'SMS 성공', value: channel_breakdown.sms_sent, color: '#3b82f6' },
      { label: 'SMS 실패', value: channel_breakdown.sms_failed, color: '#f97316' },
    ];
  }, [analytics]);

  return (
    <AdminLayout title="Analytics">
      <div className="stack">
        {!isLoaded && <div className="muted">Auth loading...</div>}
        {isLoaded && !isSignedIn && (
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>로그인이 필요합니다</div>
            <div className="muted">우측 상단의 로그인 버튼을 눌러주세요.</div>
          </div>
        )}

        {error && <div className="danger">{error}</div>}
        {loading && isSignedIn && <div className="muted">Loading...</div>}

        {!loading && isSignedIn && analytics && (
          <>
            {/* Header + Date Filter */}
            <div className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 18 }}>분석 대시보드</span>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', marginLeft: 'auto' }}
                >
                  <option value="week">최근 7일</option>
                  <option value="month">최근 30일</option>
                  <option value="quarter">최근 90일</option>
                </select>
                <span className="muted">
                  {analytics.start_date} ~ {analytics.end_date}
                </span>
              </div>
            </div>

            {/* Summary KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div className="kpi">
                <div className="v">{analytics.total_orders}</div>
                <div className="k">총 주문</div>
              </div>
              <div className="kpi">
                <div className="v" style={{ color: '#10b981' }}>{analytics.total_proofs}</div>
                <div className="k">증빙 완료</div>
              </div>
              <div className="kpi">
                <div className="v" style={{ color: analytics.proof_completion_rate >= 0.8 ? '#10b981' : analytics.proof_completion_rate >= 0.5 ? '#f59e0b' : '#ef4444' }}>
                  {formatPercent(analytics.proof_completion_rate)}
                </div>
                <div className="k">증빙 완료율</div>
              </div>
              <div className="kpi">
                <div className="v" style={{ color: analytics.notification_success_rate >= 0.9 ? '#10b981' : analytics.notification_success_rate >= 0.7 ? '#f59e0b' : '#ef4444' }}>
                  {formatPercent(analytics.notification_success_rate)}
                </div>
                <div className="k">알림 성공률</div>
              </div>
            </div>

            {/* Daily Trends */}
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 12 }}>일별 추이 ({dateFilterLabel})</div>
              <TrendChart data={analytics.daily_trends} height={180} />
            </div>

            {/* Channel Breakdown + Proof Timing */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 12 }}>채널별 알림 현황</div>
                <SimpleBarChart data={channelData} height={140} />
                <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
                  총 {analytics.total_notifications}건 발송
                </div>
              </div>

              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 12 }}>증빙 업로드 시간</div>
                {analytics.proof_timing.avg_minutes != null ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      <div style={{ padding: 12, background: '#f3f4f6', borderRadius: 8 }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>
                          {formatMinutes(analytics.proof_timing.avg_minutes)}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>평균 소요시간</div>
                      </div>
                      <div style={{ padding: 12, background: '#f3f4f6', borderRadius: 8 }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>
                          {formatMinutes(analytics.proof_timing.median_minutes)}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>중앙값</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
                      <div>
                        <span className="muted" style={{ fontSize: 12 }}>최소:</span>{' '}
                        <span style={{ fontWeight: 600 }}>{formatMinutes(analytics.proof_timing.min_minutes)}</span>
                      </div>
                      <div>
                        <span className="muted" style={{ fontSize: 12 }}>최대:</span>{' '}
                        <span style={{ fontWeight: 600 }}>{formatMinutes(analytics.proof_timing.max_minutes)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="muted">데이터 없음 (증빙 완료 건이 없습니다)</div>
                )}
              </div>
            </div>

            {/* Detailed Stats Table */}
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 12 }}>상세 통계</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 0', fontWeight: 500 }}>기간</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>{analytics.start_date} ~ {analytics.end_date}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 0', fontWeight: 500 }}>총 주문 수</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>{analytics.total_orders}건</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 0', fontWeight: 500 }}>증빙 완료</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>{analytics.total_proofs}건 ({formatPercent(analytics.proof_completion_rate)})</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 0', fontWeight: 500 }}>총 알림 발송</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>{analytics.total_notifications}건</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 0', fontWeight: 500 }}>알림톡 성공/실패</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>
                      <span style={{ color: '#10b981' }}>{analytics.channel_breakdown.alimtalk_sent}</span>
                      {' / '}
                      <span style={{ color: '#ef4444' }}>{analytics.channel_breakdown.alimtalk_failed}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 0', fontWeight: 500 }}>SMS 성공/실패</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>
                      <span style={{ color: '#3b82f6' }}>{analytics.channel_breakdown.sms_sent}</span>
                      {' / '}
                      <span style={{ color: '#f97316' }}>{analytics.channel_breakdown.sms_failed}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
