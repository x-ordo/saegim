import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import {
  listNotifications,
  getNotificationStats,
  resendNotify,
  NotificationListItem,
  NotificationStats,
} from '../../../services/adminApi';
import { useAdminToken } from '../../../services/useAdminToken';

// Force SSR to ensure ClerkProvider is available
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

type DateFilter = 'today' | 'yesterday' | 'week' | 'all';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateRange(filter: DateFilter): { start?: string; end?: string } {
  const today = new Date();

  switch (filter) {
    case 'today':
      return { start: formatDate(today), end: formatDate(today) };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: formatDate(yesterday), end: formatDate(yesterday) };
    }
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      return { start: formatDate(weekAgo), end: formatDate(today) };
    }
    case 'all':
      return {};
    default:
      return { start: formatDate(today), end: formatDate(today) };
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

function getStatusBadge(status: string) {
  switch (status) {
    case 'SENT':
    case 'MOCK_SENT':
    case 'FALLBACK_SENT':
      return { bg: '#d1fae5', color: '#065f46', label: '성공' };
    case 'FAILED':
      return { bg: '#fee2e2', color: '#991b1b', label: '실패' };
    case 'PENDING':
      return { bg: '#fef3c7', color: '#92400e', label: '대기' };
    default:
      return { bg: '#f3f4f6', color: '#374151', label: status };
  }
}

function getChannelBadge(channel: string) {
  switch (channel) {
    case 'ALIMTALK':
      return { bg: '#fef3c7', color: '#92400e', label: '알림톡' };
    case 'SMS':
      return { bg: '#e0e7ff', color: '#3730a3', label: 'SMS' };
    default:
      return { bg: '#f3f4f6', color: '#374151', label: channel };
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'SENDER':
      return '발주자';
    case 'RECIPIENT':
      return '수령인';
    default:
      return type;
  }
}

export default function NotificationsPage() {
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<number | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAdminToken();
      const { start, end } = getDateRange(dateFilter);

      const [listRes, statsRes] = await Promise.all([
        listNotifications(token, {
          page,
          limit: 50,
          status: statusFilter || undefined,
          channel: channelFilter || undefined,
          start_date: start,
          end_date: end,
        }),
        getNotificationStats(token, {
          start_date: start,
          end_date: end,
        }),
      ]);

      setItems(listRes.items);
      setTotalPages(listRes.total_pages);
      setTotal(listRes.total);
      setStats(statsRes);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    loadData();
  }, [isLoaded, isSignedIn, dateFilter, statusFilter, channelFilter, page]);

  const handleResend = async (orderId: number) => {
    if (resending) return;
    setResending(orderId);

    try {
      const token = await getAdminToken();
      await resendNotify(token, orderId);
      await loadData();
    } catch (e: any) {
      alert('재발송 실패: ' + (e?.message || String(e)));
    } finally {
      setResending(null);
    }
  };

  return (
    <AdminLayout title="알림 현황">
      <div className="stack">
        {!isLoaded && <div className="muted">Auth loading…</div>}
        {isLoaded && !isSignedIn && (
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>로그인이 필요합니다</div>
          </div>
        )}

        {error && <div className="danger">{error}</div>}

        {isSignedIn && (
          <>
            {/* Filters */}
            <div className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 500 }}>기간:</span>
                  <select
                    value={dateFilter}
                    onChange={(e) => { setDateFilter(e.target.value as DateFilter); setPage(1); }}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd' }}
                  >
                    <option value="today">오늘</option>
                    <option value="yesterday">어제</option>
                    <option value="week">최근 7일</option>
                    <option value="all">전체</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 500 }}>상태:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd' }}
                  >
                    <option value="">전체</option>
                    <option value="SENT">성공</option>
                    <option value="FAILED">실패</option>
                    <option value="PENDING">대기</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 500 }}>채널:</span>
                  <select
                    value={channelFilter}
                    onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd' }}
                  >
                    <option value="">전체</option>
                    <option value="ALIMTALK">알림톡</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>

                <button
                  className="btn secondary"
                  onClick={loadData}
                  style={{ marginLeft: 'auto' }}
                >
                  새로고침
                </button>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div className="kpi">
                  <div className="v" style={{ color: '#10b981' }}>{stats.success}</div>
                  <div className="k">성공</div>
                </div>
                <div className="kpi">
                  <div className="v" style={{ color: stats.failed > 0 ? '#ef4444' : '#6b7280' }}>{stats.failed}</div>
                  <div className="k">실패</div>
                </div>
                <div className="kpi">
                  <div className="v" style={{ color: stats.pending > 0 ? '#f59e0b' : '#6b7280' }}>{stats.pending}</div>
                  <div className="k">대기</div>
                </div>
              </div>
            )}

            {/* Table */}
            {loading ? (
              <div className="muted">Loading…</div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 500 }}>시간</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 500 }}>주문번호</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 500 }}>대상</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 500 }}>채널</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 500 }}>상태</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 500 }}>에러</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '24px 16px', textAlign: 'center' }} className="muted">
                          알림 내역이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const statusBadge = getStatusBadge(item.status);
                        const channelBadge = getChannelBadge(item.channel);

                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px 16px' }} className="muted">
                              {formatDateTime(item.created_at)}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <Link
                                href={`/app/orders/${item.order_id}`}
                                style={{ color: '#3b82f6', textDecoration: 'none' }}
                              >
                                {item.order_number}
                              </Link>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {getTypeBadge(item.type)}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                fontSize: 12,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: channelBadge.bg,
                                color: channelBadge.color,
                              }}>
                                {channelBadge.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                fontSize: 12,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: statusBadge.bg,
                                color: statusBadge.color,
                              }}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', maxWidth: 200 }} className="muted">
                              {item.error_message ? (
                                <span style={{ fontSize: 12, color: '#991b1b' }}>
                                  {item.error_message.substring(0, 50)}
                                  {item.error_message.length > 50 ? '…' : ''}
                                </span>
                              ) : '-'}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              {item.status === 'FAILED' && (
                                <button
                                  className="btn secondary"
                                  style={{ padding: '4px 12px', fontSize: 12 }}
                                  onClick={() => handleResend(item.order_id)}
                                  disabled={resending === item.order_id}
                                >
                                  {resending === item.order_id ? '발송 중…' : '재발송'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderTop: '1px solid #e5e7eb',
                    background: '#f9fafb',
                  }}>
                    <span className="muted">
                      총 {total}건 중 {(page - 1) * 50 + 1}–{Math.min(page * 50, total)}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn secondary"
                        style={{ padding: '4px 12px' }}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        이전
                      </button>
                      <span style={{ padding: '4px 12px' }}>
                        {page} / {totalPages}
                      </span>
                      <button
                        className="btn secondary"
                        style={{ padding: '4px 12px' }}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                      >
                        다음
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
