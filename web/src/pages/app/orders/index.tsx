import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import { importOrders, listOrders, listOrganizations, resendNotify, Order, Organization } from '../../../services/adminApi';
import { useAdminToken } from '../../../services/useAdminToken';

// Force SSR to ensure ClerkProvider is available
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function OrdersPage() {
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [orders, setOrders] = useState<Order[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState<number | undefined>(undefined);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [autoGenerateTokens, setAutoGenerateTokens] = useState(true);
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

  const onPickFile = () => {
    setImportMsg(null);
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      setImportMsg(null);
      const token = await getAdminToken();
      const r = await importOrders(token, file, { autoGenerateTokens });

      const isExcel = file.name.toLowerCase().endsWith('.xlsx');
      const fileType = isExcel ? 'Excel' : 'CSV';
      const parts = [`${fileType} 완료: ${r.created_count}건 생성`];
      if (r.generated_tokens_count > 0) {
        parts.push(`QR ${r.generated_tokens_count}건 발급`);
      }
      if (r.errors?.length) {
        parts.push(`오류 ${r.errors.length}건`);
        console.warn('Import errors', r.errors);
      }
      setImportMsg(parts.join(', '));

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

      const o = await listOrders(token, {
        organization_id: resolvedOrgId,
        q,
        status: status || undefined,
      });
      setOrders(o);
      // prune selection (keep only visible ids)
      setSelected((prev) => {
        const next: Record<number, boolean> = {};
        for (const ord of o) {
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


  const sendNotify = async (orderId: number) => {
    try {
      setSendingId(orderId);
      setError(null);
      const token = await getAdminToken();
      await resendNotify(token, orderId);
      setToast(`알림 발송 요청됨 (#${orderId})`);
    } catch (err: any) {
      setToast(err?.message || String(err));
    } finally {
      setSendingId(null);
      window.setTimeout(() => setToast(null), 1600);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

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

                <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All status</option>
                  <option value="PENDING">PENDING</option>
                  <option value="TOKEN_ISSUED">TOKEN_ISSUED</option>
                  <option value="PROOF_UPLOADED">PROOF_UPLOADED</option>
                </select>

                <input
                  className="input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search (order / sender / recipient)"
                  style={{ maxWidth: 420 }}
                />
                <button className="btn" onClick={load}>Search</button>
                <Link className="btn secondary" href="/app/orders/new">+ New</Link>

                <button className="btn secondary" onClick={openTodayLabels} title="오늘(서울시간) 주문 전체를 라벨로 출력">
                  오늘 라벨
                </button>

                <button className="btn secondary" onClick={onPickFile} disabled={importing}>
                  {importing ? '가져오는 중…' : 'CSV/Excel'}
                </button>

                <button className="btn ghost" onClick={downloadSampleCsv} title="샘플 CSV 다운로드">
                  샘플 CSV
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="text/csv,.csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  style={{ display: 'none' }}
                  onChange={onFileChange}
                />

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                  <input
                    type="checkbox"
                    checked={autoGenerateTokens}
                    onChange={(e) => setAutoGenerateTokens(e.target.checked)}
                  />
                  <span style={{ fontSize: 13 }}>QR 자동 발급</span>
                </label>
              </div>
              <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                CSV/Excel 컬럼: order_number, context, sender_name, sender_phone, recipient_name, recipient_phone
              </div>
            </div>

            {error && <div className="danger">{error}</div>}
            {importMsg && <div className="success">{importMsg}</div>}
            {toast && <div className="success">{toast}</div>}
            {loading && <div className="muted">Loading…</div>}

            {!loading && (
              <div className="card flat" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 900 }}>선택 {selectedIds.length}건</span>
                  <span className="muted" style={{ fontSize: 12 }}>체크 후 “라벨 출력” (토큰은 자동 발급)</span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn" disabled={selectedIds.length === 0} onClick={() => openLabels(selectedIds)}>라벨 출력</button>
                  <button className="btn secondary" disabled={selectedIds.length === 0} onClick={() => setSelected({})}>선택 해제</button>
                </div>
              </div>
            )}

            {!loading && (
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
                    <th>Order No.</th>
                    <th>Sender</th>
                    <th>Recipient</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="no-print">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
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
                      <td><span className="badge">{o.status}</span></td>
                      <td>{new Date(o.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="muted">No orders.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
