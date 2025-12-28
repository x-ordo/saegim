import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../components/AdminLayout';
import { getLabels, Label, listOrders } from '../../services/adminApi';
import { useAdminToken } from '../../services/useAdminToken';

// Force SSR to ensure ClerkProvider is available
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

const qrImg = (url: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;

function parseIds(raw: string | string[] | undefined): number[] {
  const s = Array.isArray(raw) ? raw.join(',') : raw;
  if (!s) return [];
  return s
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function getQueryStr(q: any, key: string): string | undefined {
  const v = q?.[key];
  const s = Array.isArray(v) ? v?.[0] : v;
  return typeof s === 'string' ? s : undefined;
}

const TEMPLATE_META = {
  10: { rows: 5, labelH: '54mm' }, // 2 x 5
  12: { rows: 6, labelH: '45mm' }, // 2 x 6
  14: { rows: 7, labelH: '38mm' }, // 2 x 7
} as const;

type TemplateKey = 10 | 12 | 14;

function IconCamera({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4 7a2 2 0 012-2h2.6l1.4-2h4l1.4 2H18a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LabelsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const mode = useMemo(() => (getQueryStr(router.query, 'mode') || '').toLowerCase(), [router.query]);
  const ids = useMemo(() => parseIds(router.query.ids), [router.query.ids]);

  const autoprint = useMemo(() => {
    const s = (getQueryStr(router.query, 'autoprint') || '').toLowerCase();
    return s === '1' || s === 'true';
  }, [router.query]);

  const miniParam = useMemo(() => {
    const raw = (getQueryStr(router.query, 'mini') || getQueryStr(router.query, 'compact') || '').toLowerCase();
    if (!raw) return null;
    return raw === '1' || raw === 'true' || raw === 'mini' || raw === 'compact';
  }, [router.query]);

  const initialTemplate = useMemo<TemplateKey>(() => {
    const t = Number(getQueryStr(router.query, 'template') || 12);
    return (t === 10 || t === 12 || t === 14 ? t : 12) as TemplateKey;
  }, [router.query]);

  const initialCut = useMemo<boolean>(() => {
    const s = (getQueryStr(router.query, 'cut') || '1').toLowerCase();
    return s === '1' || s === 'true';
  }, [router.query]);

  const [template, setTemplate] = useState<TemplateKey>(initialTemplate);
  const [cutLines, setCutLines] = useState<boolean>(initialCut);
  const [mini, setMini] = useState<boolean>(miniParam ?? true);

  useEffect(() => {
    if (miniParam === null) return;
    setMini(miniParam);
  }, [miniParam]);

  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { rows, labelH } = TEMPLATE_META[template];
  const perPage = rows * 2;

  const pages = useMemo(() => {
    const out: Label[][] = [];
    for (let i = 0; i < labels.length; i += perPage) out.push(labels.slice(i, i + perPage));
    return out;
  }, [labels, perPage]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAdminToken();

      let orderIds = ids;
      if (mode === 'today' && orderIds.length === 0) {
        const day = getQueryStr(router.query, 'day');
        const orders = await listOrders(token, {
          today: !day,
          day: day || undefined,
        });
        orderIds = orders.map((o) => o.id);
      }

      if (orderIds.length === 0) {
        setLabels([]);
        return;
      }

      const res = await getLabels(token, { order_ids: orderIds, ensure_tokens: true });
      setLabels(res);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (!router.isReady) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, router.isReady, mode, ids.join(',')]);

  useEffect(() => {
    if (!autoprint) return;
    if (loading) return;
    if (labels.length === 0) return;
    const t = setTimeout(() => window.print(), 250);
    return () => clearTimeout(t);
  }, [autoprint, loading, labels.length]);

  const orgName = labels?.[0]?.organization_name || 'Saegim';
  const orgLogo = labels?.[0]?.organization_logo || null;

  return (
    <AdminLayout title="라벨 출력">
      <style jsx global>{`
        @page { size: A4 portrait; margin: 6mm; }

        @media print {
          .no-print { display: none !important; }
          /* Hide AdminLayout header row on print */
          .page .container > .row { display: none !important; }
          body { background: #fff !important; }
        }

        .a4 {
          width: 210mm;
          min-height: 297mm;
          padding: 8mm;
          box-sizing: border-box;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
          margin: 0 auto 18px;
          overflow: hidden;
          break-after: page;
        }
        .a4:last-child { break-after: auto; }

        .sheet {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-auto-rows: var(--label-h);
          gap: 2mm;
        }

        .label {
          border: var(--cut-border);
          border-radius: 10px;
          padding: 3.2mm;
          box-sizing: border-box;
          display: grid;
          grid-template-columns: 28mm 1fr;
          gap: 3mm;
          align-items: center;
          overflow: hidden;
        }

        .label.mini {
          grid-template-columns: 32mm 1fr;
          padding: 2.8mm;
          gap: 2.6mm;
        }

        .qr {
          width: 28mm;
          height: 28mm;
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.10);
          background: #fafafa;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .qr img { width: 100%; height: 100%; object-fit: cover; }

        .label.mini .qr {
          width: 32mm;
          height: 32mm;
          border-radius: 10px;
        }

        .title {
          font-size: 11pt;
          font-weight: 900;
          line-height: 1.1;
          margin: 0;
        }

        .titleRow {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 1.1mm 2.4mm;
          border-radius: 999px;
          background: rgba(0,0,0,0.06);
          font-size: 8.3pt;
          font-weight: 900;
        }

        .chips {
          margin-top: 1.6mm;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
        }

        .label.mini .meta { display: none; }
        .sub {
          font-size: 8.5pt;
          color: rgba(0,0,0,0.65);
          margin-top: 1.2mm;
          line-height: 1.1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .meta {
          margin-top: 2.2mm;
          font-size: 8.6pt;
          line-height: 1.2;
          display: grid;
          gap: 0.8mm;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 1.2mm 2.6mm;
          border-radius: 999px;
          background: rgba(0,0,0,0.06);
          font-size: 8.5pt;
          font-weight: 800;
        }
      `}</style>

      <div className="stack">
        {!isLoaded && <div className="muted">Auth loading…</div>}

        {isLoaded && !isSignedIn && (
          <div className="card">
            <div style={{ fontWeight: 900, marginBottom: 6 }}>로그인이 필요합니다</div>
            <div className="muted" style={{ fontSize: 13 }}>우측 상단에서 로그인 후 이용하세요.</div>
          </div>
        )}

        {isSignedIn && (
          <>
            <div className="card no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {orgLogo ? (
                  <img
                    src={orgLogo}
                    alt="logo"
                    style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(0,0,0,0.1)' }}
                  />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.06)' }} />
                )}
                <div>
                  <div style={{ fontWeight: 900 }}>{orgName} · 라벨 출력</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {mode === 'today' ? '오늘 주문' : '선택 주문'} {labels.length}건 — A4(세로) / 100% 인쇄 권장
                  </div>
                </div>
              </div>

              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <select className="select" value={template} onChange={(e) => setTemplate(Number(e.target.value) as TemplateKey)}>
                  <option value={10}>A4 라벨 10칸(2×5)</option>
                  <option value={12}>A4 라벨 12칸(2×6)</option>
                  <option value={14}>A4 라벨 14칸(2×7)</option>
                </select>
                <label className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={cutLines} onChange={(e) => setCutLines(e.target.checked)} />
                  <span className="muted" style={{ fontSize: 12 }}>재단선</span>
                </label>
                <label className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={mini} onChange={(e) => setMini(e.target.checked)} />
                  <span className="muted" style={{ fontSize: 12 }}>초미니 라벨</span>
                </label>
                <button className="btn" onClick={() => window.print()} disabled={loading || labels.length === 0}>인쇄</button>
                <Link className="btn secondary" href="/app/orders">목록</Link>
              </div>
            </div>

            {error && <div className="danger">{error}</div>}
            {loading && <div className="muted">Loading…</div>}

            {!loading && labels.length === 0 && (
              <div className="card">
                <div style={{ fontWeight: 900, marginBottom: 6 }}>출력할 라벨이 없습니다</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  예: <code>/app/labels?ids=12,13</code> 또는 <code>/app/labels?mode=today</code>
                </div>
              </div>
            )}

            {!loading && labels.length > 0 && (
              <>
                {pages.map((page, idx) => (
                  <div
                    key={idx}
                    className="a4"
                    style={
                      {
                        ['--label-h' as any]: labelH,
                        ['--cut-border' as any]: cutLines ? '1px dashed rgba(0,0,0,0.35)' : '1px solid rgba(0,0,0,0.10)',
                      } as any
                    }
                  >
                    <div className="sheet">
                      {page.map((l) => {
                        const isUpload = l.token_valid && l.status !== 'PROOF_UPLOADED' && l.status !== 'COMPLETED';
                        const targetUrl = isUpload ? l.upload_url : l.public_proof_url;
                        const titleText = mini ? (isUpload ? '촬영' : '확인') : (isUpload ? '사진 업로드' : '증빙 확인');
                        return (
                          <div key={l.order_id} className={`label${mini ? ' mini' : ''}`}>
                            <div className="qr">
                              <img src={qrImg(targetUrl)} alt="qr" />
                            </div>
                            <div>
                              <div className="titleRow">
                                <span className="chip">
                                  {isUpload ? <IconCamera size={12} /> : <IconCheck size={12} />}
                                  {titleText}
                                </span>
                                <span className="pill">{l.order_number}</span>
                              </div>

                              {l.context && <div className="sub">{l.context}</div>}

                              {mini && (
                                <div className="chips">
                                  <span className="chip"><IconCamera size={12} />촬영</span>
                                  <span className="chip"><IconCheck size={12} />확인</span>
                                </div>
                              )}

                              {!mini && (
                                <>
                                  <div className="meta">
                                    <div>
                                      <b>방법</b>: QR 스캔 →{' '}
                                      {isUpload ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                          <IconCamera size={12} />촬영·업로드
                                        </span>
                                      ) : (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                          <IconCheck size={12} />확인
                                        </span>
                                      )}
                                    </div>
                                    <div><b>상태</b>: {l.status}</div>
                                  </div>
                                  <div className="meta no-print" style={{ marginTop: '2mm' }}>
                                    <div className="muted" style={{ fontSize: 12 }}><b>URL</b>: {targetUrl}</div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
