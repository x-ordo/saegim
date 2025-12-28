import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import {
  getPendingReminders,
  sendReminders,
  PendingReminders,
  ReminderResponse,
} from '../../services/adminApi';
import { useAdminToken } from '../../services/useAdminToken';

function formatHours(hours: number | null | undefined): string {
  if (hours == null) return '-';
  if (hours < 1) return `${Math.round(hours * 60)}분 전`;
  if (hours < 24) return `${Math.round(hours)}시간 전`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours > 0 ? `${days}일 ${remainingHours}시간 전` : `${days}일 전`;
}

export default function RemindersPage() {
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [pendingReminders, setPendingReminders] = useState<PendingReminders | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ReminderResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [hoursSince, setHoursSince] = useState(24);

  const loadPendingReminders = async () => {
    if (!isLoaded || !isSignedIn) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = await getAdminToken();
      const data = await getPendingReminders(token, { hours_since_token: hoursSince });
      setPendingReminders(data);
      setSelectedIds(new Set()); // Clear selection
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingReminders();
  }, [isLoaded, isSignedIn, getAdminToken, hoursSince]);

  const handleSelectAll = () => {
    if (!pendingReminders) return;
    if (selectedIds.size === pendingReminders.orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingReminders.orders.map(o => o.order_id)));
    }
  };

  const handleToggle = (orderId: number) => {
    const next = new Set(selectedIds);
    if (next.has(orderId)) {
      next.delete(orderId);
    } else {
      next.add(orderId);
    }
    setSelectedIds(next);
  };

  const handleSendReminders = async () => {
    if (!isLoaded || !isSignedIn) return;
    if (selectedIds.size === 0) {
      alert('발송할 주문을 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedIds.size}건에 리마인더 알림을 발송하시겠습니까?`)) {
      return;
    }

    setSending(true);
    setError(null);
    setResult(null);

    try {
      const token = await getAdminToken();
      const response = await sendReminders(token, {
        order_ids: Array.from(selectedIds),
        hours_since_token: hoursSince,
        max_reminders: 1,
      });
      setResult(response);
      // Reload list
      await loadPendingReminders();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSending(false);
    }
  };

  const handleSendAll = async () => {
    if (!isLoaded || !isSignedIn) return;
    if (!pendingReminders || pendingReminders.total === 0) {
      alert('발송할 대상이 없습니다.');
      return;
    }

    if (!confirm(`대기 중인 ${pendingReminders.total}건 모두에 리마인더 알림을 발송하시겠습니까?`)) {
      return;
    }

    setSending(true);
    setError(null);
    setResult(null);

    try {
      const token = await getAdminToken();
      const response = await sendReminders(token, {
        hours_since_token: hoursSince,
        max_reminders: 1,
      });
      setResult(response);
      // Reload list
      await loadPendingReminders();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout title="Reminders">
      <div className="stack">
        {!isLoaded && <div className="muted">Auth loading...</div>}
        {isLoaded && !isSignedIn && (
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>로그인이 필요합니다</div>
            <div className="muted">우측 상단의 로그인 버튼을 눌러주세요.</div>
          </div>
        )}

        {error && <div className="danger">{error}</div>}

        {isSignedIn && (
          <>
            {/* Header */}
            <div className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 18 }}>리마인더 알림</span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="muted">토큰 발급 후</span>
                    <select
                      value={hoursSince}
                      onChange={(e) => setHoursSince(Number(e.target.value))}
                      style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ddd' }}
                    >
                      <option value={6}>6시간</option>
                      <option value={12}>12시간</option>
                      <option value={24}>24시간</option>
                      <option value={48}>48시간</option>
                      <option value={72}>72시간</option>
                    </select>
                    <span className="muted">이상</span>
                  </label>
                  <button
                    className="btn ghost"
                    onClick={loadPendingReminders}
                    disabled={loading}
                  >
                    새로고침
                  </button>
                </div>
              </div>
            </div>

            {/* Result Banner */}
            {result && (
              <div className="card" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>발송 결과</div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <span className="muted">대상:</span> {result.total}건
                  </div>
                  <div>
                    <span style={{ color: '#10b981' }}>발송 성공:</span> {result.sent_count}건
                  </div>
                  <div>
                    <span style={{ color: '#f59e0b' }}>스킵:</span> {result.skipped_count}건
                  </div>
                  <div>
                    <span style={{ color: '#ef4444' }}>실패:</span> {result.failed_count}건
                  </div>
                </div>
                {result.results.some(r => r.error) && (
                  <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                    실패 사유: {result.results.filter(r => r.error).map(r => `${r.order_number}: ${r.error}`).join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className="btn"
                  onClick={handleSendReminders}
                  disabled={sending || selectedIds.size === 0}
                >
                  {sending ? '발송 중...' : `선택 발송 (${selectedIds.size}건)`}
                </button>
                <button
                  className="btn secondary"
                  onClick={handleSendAll}
                  disabled={sending || !pendingReminders || pendingReminders.total === 0}
                >
                  {sending ? '발송 중...' : `전체 발송 (${pendingReminders?.total || 0}건)`}
                </button>
                <span className="muted" style={{ marginLeft: 'auto' }}>
                  * 이미 리마인더를 받은 주문은 자동으로 제외됩니다
                </span>
              </div>
            </div>

            {/* Pending List */}
            {loading ? (
              <div className="card">로딩 중...</div>
            ) : pendingReminders && pendingReminders.orders.length > 0 ? (
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 12 }}>
                  대기 중인 주문 ({pendingReminders.total}건)
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '8px 0', textAlign: 'left', width: 40 }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.size === pendingReminders.orders.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 500 }}>주문번호</th>
                      <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 500 }}>컨텍스트</th>
                      <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 500 }}>발주자</th>
                      <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 500 }}>토큰 발급</th>
                      <th style={{ padding: '8px 0', textAlign: 'center', fontWeight: 500 }}>기존 리마인더</th>
                      <th style={{ padding: '8px 0', textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReminders.orders.map((order) => (
                      <tr key={order.order_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 0' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order.order_id)}
                            onChange={() => handleToggle(order.order_id)}
                          />
                        </td>
                        <td style={{ padding: '10px 0' }}>{order.order_number}</td>
                        <td style={{ padding: '10px 0' }} className="muted">{order.context || '-'}</td>
                        <td style={{ padding: '10px 0' }}>{order.sender_name}</td>
                        <td style={{ padding: '10px 0' }} className="muted">
                          {formatHours(order.hours_since_token)}
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            background: order.reminder_count > 0 ? '#fef3c7' : '#f3f4f6',
                            color: order.reminder_count > 0 ? '#92400e' : '#6b7280',
                          }}>
                            {order.reminder_count}회
                          </span>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <Link href={`/app/orders/${order.order_id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                            상세 →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card">
                <div className="muted" style={{ textAlign: 'center', padding: 20 }}>
                  {hoursSince}시간 이상 경과한 대기 중인 주문이 없습니다.
                </div>
              </div>
            )}

            {/* Info */}
            <div className="card" style={{ background: '#f8fafc' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>리마인더 알림 안내</div>
              <ul className="muted" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                <li>토큰이 발급되었지만 증빙 사진이 업로드되지 않은 주문에 리마인더를 발송합니다.</li>
                <li>리마인더는 발주자(sender)에게만 SMS로 발송됩니다.</li>
                <li>같은 주문에 대해 1회 이상의 리마인더는 자동으로 제외됩니다.</li>
                <li>발송 시간은 비용 효율을 위해 업무 시간 내 권장합니다.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
