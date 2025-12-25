import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AdminLayout } from '../../../components/AdminLayout';
import { importOrdersCsv, listOrders, listOrganizations, Order, Organization, OrderListResult } from '../../../services/adminApi';
import { useAdminToken } from '../../../services/useAdminToken';

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateRange(filter: DateFilter): { start?: string; end?: string } {
  const today = new Date();

  switch (filter) {
    case 'today':
      return { start: formatDate(today), end: formatDate(today) };
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      return { start: formatDate(weekAgo), end: formatDate(today) };
    }
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 29);
      return { start: formatDate(monthAgo), end: formatDate(today) };
    }
    case 'all':
    default:
      return {};
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDING':
      return { bg: '#fef3c7', color: '#92400e' };
    case 'TOKEN_ISSUED':
      return { bg: '#dbeafe', color: '#1e40af' };
    case 'PROOF_UPLOADED':
      return { bg: '#d1fae5', color: '#065f46' };
    case 'NOTIFIED':
    case 'COMPLETED':
      return { bg: '#d1fae5', color: '#065f46' };
    default:
      return { bg: '#f3f4f6', color: '#374151' };
  }
}

export default function OrdersPage() {
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [orders, setOrders] = useState<Order[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState<number | undefined>(undefined);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const [toast, setToast] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedIds = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => Number(k))
    .filter((n) => Number.isFinite(n) && n > 0);

  const toggleAllVisible = () => {
    if (orders.length === 0) return;
    const allSelected = orders.every((o) => selected[o.id]);
    const next: Record<number, boolean> = { ...selected };
    for (const o of orders) next[o.id] = !allSelected;
    setSelected(next);
  };

  const openLabels = (ids: number[]) => {
    if (!ids.length) return;
    const url = `/app/labels?ids=${ids.join(',')}&template=12&cut=1&mini=1`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openTodayLabels = () => {
    const url = `/app/labels?mode=today&template=12&cut=1&autoprint=1&mini=1`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadSampleCsv = () => {
    const sample = [
      'order_number,context,sender_name,sender_phone,recipient_name,recipient_phone',
      'ORD-20251219-001,장례식/근조화환,홍길동,010-1234-5678,고인/상주,010-9876-5432',
      'ORD-20251219-002,개업식/축하화환,김철수,01012345678,가게/대표,01000000000',
    ].join('\n');
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'saegim_orders_sample.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onPickCsv = () => {
    setImportMsg(null);
    fileInputRef.current?.click();
  };

  const onCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      setImportMsg(null);
      const token = await getAdminToken();
      const r = await importOrdersCsv(token, file);
      const msg = `CSV 완료: ${r.created_count}건 생성${r.errors?.length ? `, 오류 ${r.errors.length}건` : ''}`;
      setImportMsg(msg);

      if (r.errors?.length) {
        console.warn('CSV import errors', r.errors);
      }

      if (r.created_order_ids?.length) {
        openLabels(r.created_order_ids);
      }

      // refresh list
      await load();
    } catch (err: any) {
      setImportMsg(err?.message || String(err));
    } finally {
      setImporting(false);
      // reset input so same file can be re-selected
      e.target.value = '';
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAdminToken();
      const g = await listOrganizations(token);
      setOrgs(g);

      const resolvedOrgId = orgId ?? g?.[0]?.id;
      if (orgId === undefined && g?.[0]?.id) {
        setOrgId(g[0].id);
      }

      const { start, end } = getDateRange(dateFilter);

      const result: OrderListResult = await listOrders(token, {
        organization_id: resolvedOrgId,
        q,
        status: status || undefined,
        start_date: start,
        end_date: end,
        page,
        limit,
      });

      setOrders(result.items);
      setTotal(result.total);
      setTotalPages(result.total_pages);

      // prune selection (keep only visible ids)
      setSelected((prev) => {
        const next: Record<number, boolean> = {};
        for (const ord of result.items) {
          if (prev[ord.id]) next[ord.id] = true;
        }
        return next;
      });
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, page]);

  const handleSearch = () => {
    setPage(1);
    load();
  };

  const handleFilterChange = (newFilter: DateFilter) => {
    setDateFilter(newFilter);
    setPage(1);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    load();
  }, [dateFilter, status]);

  return (
    <AdminLayout title="Orders">
      <div className="stack">
        {!isLoaded && <div className="muted">Auth loading…</div>}
        {isLoaded && !isSignedIn && (
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>로그인이 필요합니다</div>
            <div className="muted">우측 상단의 로그인 버튼을 눌러주세요.</div>
          </div>
        )}

        {isSignedIn && (
          <>
            <div className="card flat no-print" style={{ marginBottom: 14 }}>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                {orgs.length > 1 && (
                  <select className="select" value={orgId ?? orgs?.[0]?.id ?? ''} onChange={(e) => setOrgId(Number(e.target.value))}>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>{o.name} (#{o.id})</option>
                    ))}
                  </select>
                )}

                <select
                  className="select"
                  value={dateFilter}
                  onChange={(e) => handleFilterChange(e.target.value as DateFilter)}
                >
                  <option value="all">전체 기간</option>
                  <option value="today">오늘</option>
                  <option value="week">최근 7일</option>
                  <option value="month">최근 30일</option>
                </select>

                <select className="select" value={status} onChange={(e) => handleStatusChange(e.target.value)}>
                  <option value="">전체 상태</option>
                  <option value="PENDING">대기</option>
                  <option value="TOKEN_ISSUED">토큰 발급</option>
                  <option value="PROOF_UPLOADED">증빙 완료</option>
                </select>

                <input
                  className="input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="검색 (주문번호 / 발주자 / 수령인)"
                  style={{ maxWidth: 300 }}
                />
                <button className="btn" onClick={handleSearch}>검색</button>
                <Link className="btn secondary" href="/app/orders/new">+ 신규</Link>
              </div>

              <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <button className="btn secondary" onClick={openTodayLabels} title="오늘(서울시간) 주문 전체를 라벨로 출력">
                  오늘 라벨
                </button>

                <button className="btn secondary" onClick={onPickCsv} disabled={importing}>
                  {importing ? 'CSV 가져오는 중…' : 'CSV 가져오기'}
                </button>

                <button className="btn ghost" onClick={downloadSampleCsv} title="샘플 CSV 다운로드">
                  샘플 CSV
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="text/csv,.csv"
                  style={{ display: 'none' }}
                  onChange={onCsvChange}
                />
              </div>
            </div>

            {error && <div className="danger">{error}</div>}
            {importMsg && <div className="success">{importMsg}</div>}
            {toast && <div className="success">{toast}</div>}
            {loading && <div className="muted">Loading…</div>}

            {!loading && (
              <div className="card flat" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 900 }}>총 {total}건</span>
                  <span className="muted">| 선택 {selectedIds.length}건</span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn" disabled={selectedIds.length === 0} onClick={() => openLabels(selectedIds)}>라벨 출력</button>
                  <button className="btn secondary" disabled={selectedIds.length === 0} onClick={() => setSelected({})}>선택 해제</button>
                </div>
              </div>
            )}

            {!loading && (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>
                          <input
                            type="checkbox"
                            aria-label="select all"
                            checked={orders.length > 0 && orders.every((o) => selected[o.id])}
                            onChange={toggleAllVisible}
                          />
                        </th>
                        <th>ID</th>
                        <th>주문번호</th>
                        <th>발주자</th>
                        <th>수령인</th>
                        <th>상태</th>
                        <th>생성일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => {
                        const badge = getStatusBadge(o.status);
                        return (
                          <tr key={o.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={!!selected[o.id]}
                                onChange={(e) => setSelected((prev) => ({ ...prev, [o.id]: e.target.checked }))}
                              />
                            </td>
                            <td><Link href={`/app/orders/${o.id}`}>{o.id}</Link></td>
                            <td>{o.order_number}</td>
                            <td>{o.sender_name}</td>
                            <td>{o.recipient_name || '-'}</td>
                            <td>
                              <span style={{
                                fontSize: 12,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: badge.bg,
                                color: badge.color,
                              }}>
                                {o.status === 'PENDING' ? '대기' :
                                 o.status === 'TOKEN_ISSUED' ? '토큰발급' :
                                 o.status === 'PROOF_UPLOADED' ? '증빙완료' : o.status}
                              </span>
                            </td>
                            <td>{new Date(o.created_at).toLocaleString('ko-KR', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}</td>
                          </tr>
                        );
                      })}
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                            주문이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                  }}>
                    <span className="muted">
                      {(page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total}건
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
                      <span style={{ padding: '4px 12px', display: 'flex', alignItems: 'center' }}>
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
              </>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
