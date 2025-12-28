import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import { getOrderDetail, issueToken, resendNotify, OrderDetail } from '../../../services/adminApi';
import { useAdminToken } from '../../../services/useAdminToken';

// Force SSR to ensure ClerkProvider is available
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

// v1: QR 이미지는 외부 생성 API를 사용 (의존성 0)
// v2: 서버/클라이언트 내장 QR 생성으로 교체 권장
const qrImg = (text: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(text)}`;

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export default function OrderDetailPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const id = router.query.id;
  const [data, setData] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    if (!id || typeof id !== 'string') return;
    const token = await getAdminToken();
    try {
      setError(null);
      const d = await getOrderDetail(token, Number(id));
      setData(d);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    load();
  }, [id, isLoaded, isSignedIn]); // eslint-disable-line

  const urls = useMemo(() => {
    const token = data?.token || '';
    return {
      token,
      uploadUrl: data?.upload_url || '',
      publicUrl: data?.public_proof_url || '',
      shortPublicUrl: data?.short_public_url || '',
      qrUrl: data?.upload_url || '',
    };
  }, [data]);

  const order = data?.order || null;

  const doIssue = async (force?: boolean) => {
    if (!id || typeof id !== 'string') return;
    try {
      setBusy(true);
      setError(null);
      const token = await getAdminToken();
      await issueToken(token, Number(id), force);
      await load();
      setToast(force ? '새 토큰으로 교체됨' : '토큰 발급됨');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
      window.setTimeout(() => setToast(null), 1600);
    }
  };

  const doResend = async () => {
    if (!id || typeof id !== 'string') return;
    try {
      setBusy(true);
      setError(null);
      const token = await getAdminToken();
      await resendNotify(token, Number(id));
      await load();
      setToast('알림 발송 요청됨');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
      window.setTimeout(() => setToast(null), 1600);
    }
  };

  const printLabel = () => {
    if (!order) return;
    const url = `/app/labels?ids=${order.id}&template=12&cut=1&autoprint=1&mini=1`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AdminLayout title={`Order #${id || ''}`}>
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
            <div className="row no-print">
              <Link className="btn secondary" href="/app/orders">← Orders</Link>
              <button className="btn secondary" onClick={() => load()} disabled={busy}>Refresh</button>
              {toast && <span className="ok" style={{ padding: '6px 10px' }}>{toast}</span>}
            </div>

            {error && <div className="danger">{error}</div>}
            {!data && !error && <div className="muted">Loading…</div>}

            {data && (
              <>
                <div className="card flat no-print">
                  <div className="grid3">
                    <div>
                      <div className="label">Order Number</div>
                      <div style={{ fontWeight: 700 }}>{data.order.order_number}</div>
                      <div className="muted">Status: <span className="badge">{data.order.status}</span></div>
                    </div>
                    <div>
                      <div className="label">Sender</div>
                      <div style={{ fontWeight: 700 }}>{data.order.sender_name}</div>
                      <div className="muted">(전화번호는 v1에서 UI 미노출)</div>
                    </div>
                    <div>
                      <div className="label">Recipient</div>
                      <div style={{ fontWeight: 700 }}>{data.order.recipient_name || '-'}</div>
                      <div className="muted">Org: {data.organization.name}</div>
                    </div>
                  </div>
                </div>

                {/* QR + 링크 */}
                <div className="card no-print">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700 }}>QR / 업로드 링크</div>
                    <div className="row">
                      <button className="btn" onClick={() => doIssue(false)} disabled={busy}>토큰 발급</button>
                      <button className="btn secondary" onClick={() => doIssue(true)} disabled={busy}>토큰 교체</button>
                      <button className="btn secondary" onClick={printLabel} disabled={!urls.uploadUrl}>라벨 인쇄</button>
                    </div>
                  </div>

                  {!urls.uploadUrl && (
                    <div className="muted" style={{ marginTop: 10 }}>
                      아직 토큰이 없습니다. 먼저 <b>토큰 발급</b>을 눌러주세요.
                    </div>
                  )}

                  {urls.uploadUrl && (
                    <div className="grid2" style={{ marginTop: 12 }}>
                      <div>
                        <div className="badge" style={{ marginBottom: 10 }}>token · {urls.token ? urls.token.slice(0, 10) + '…' : '-'}</div>
                        <div className="row" style={{ marginBottom: 8 }}>
                          <button
                            className="btn secondary"
                            onClick={async () => {
                              const ok = await copy(urls.uploadUrl);
                              setToast(ok ? '업로드 링크 복사됨' : '복사 실패');
                              window.setTimeout(() => setToast(null), 1600);
                            }}
                          >
                            업로드 링크 복사
                          </button>
                          <a className="btn secondary" href={urls.uploadUrl} target="_blank" rel="noreferrer">
                            업로드 화면 열기
                          </a>
                        </div>

                        <div className="row" style={{ marginBottom: 8 }}>
                          <button
                            className="btn secondary"
                            onClick={async () => {
                              const ok = await copy(urls.publicUrl);
                              setToast(ok ? '확인 링크 복사됨' : '복사 실패');
                              window.setTimeout(() => setToast(null), 1600);
                            }}
                            disabled={!urls.publicUrl}
                          >
                            확인 링크 복사
                          </button>
                          {urls.publicUrl && (
                            <a className="btn secondary" href={urls.publicUrl} target="_blank" rel="noreferrer">
                              확인 화면 열기
                            </a>
                          )}
                        </div>

                        <div className="row" style={{ marginBottom: 8 }}>
                          <button
                            className="btn secondary"
                            onClick={async () => {
                              const ok = await copy(urls.shortPublicUrl);
                              setToast(ok ? '짧은 링크 복사됨' : '복사 실패');
                              window.setTimeout(() => setToast(null), 1600);
                            }}
                            disabled={!urls.shortPublicUrl}
                          >
                            짧은 확인 링크 복사
                          </button>
                          {urls.shortPublicUrl && (
                            <a className="btn secondary" href={urls.shortPublicUrl} target="_blank" rel="noreferrer">
                              짧은 링크 열기
                            </a>
                          )}
                          <span className="muted" style={{ marginLeft: 8 }}>
                            (문자비 절감 + 클릭률)
                          </span>
                        </div>

                        <div className="muted">
                          현장/기사: 업로드 링크로 들어가서 <b>사진 1장</b> 업로드. 업로드 완료 시 발주자/수령자에게 알림(현재 mock).
                        </div>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div className="muted" style={{ marginBottom: 10 }}>QR을 화환/배송물에 부착</div>
                        <img
                          src={qrImg(urls.qrUrl)}
                          alt="QR"
                          style={{ width: 240, height: 240, borderRadius: 12, border: '1px solid var(--line)', background: '#fff' }}
                        />
                        <div className="muted" style={{ marginTop: 8 }}>
                          (v1은 외부 QR 생성. v2에서 내부 생성 권장)
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 증빙 */}
                <div className="card no-print">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700 }}>증빙</div>
                    <div className="row">
                      <button className="btn secondary" onClick={doResend} disabled={busy || !data.proof_url}>알림 발송</button>
                    </div>
                  </div>

                  {!data.proof_url && (
                    <div className="muted" style={{ marginTop: 10 }}>
                      아직 업로드된 증빙이 없습니다.
                    </div>
                  )}

                  {data.proof_url && (
                    <div style={{ marginTop: 12 }}>
                      <div className="badge" style={{ marginBottom: 10 }}>
                        uploaded · {data.proof_uploaded_at ? new Date(data.proof_uploaded_at).toLocaleString() : '-'}
                      </div>
                      <a href={data.proof_url} target="_blank" rel="noreferrer" className="btn secondary" style={{ marginRight: 10 }}>
                        원본 열기
                      </a>
                      <div style={{ height: 10 }} />
                      <img
                        src={data.proof_url}
                        alt="proof"
                        style={{ maxWidth: '100%', borderRadius: 16, border: '1px solid var(--line)' }}
                      />
                    </div>
                  )}

                  {data.notifications && data.notifications.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>발송 로그</div>
                      <div className="muted" style={{ marginBottom: 10 }}>
                        실패 사유가 보이면 현장 CS를 줄일 수 있습니다. (예: 번호 오류, 차단, 전송사 오류)
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--line)' }}>시간</th>
                              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--line)' }}>대상</th>
                              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--line)' }}>채널</th>
                              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--line)' }}>상태</th>
                              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--line)' }}>링크</th>
                              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--line)' }}>실패 사유</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.notifications.slice(0, 20).map((n) => (
                              <tr key={n.id}>
                                <td style={{ padding: 8, borderBottom: '1px solid var(--line)' }}>
                                  {new Date(n.created_at).toLocaleString()}
                                </td>
                                <td style={{ padding: 8, borderBottom: '1px solid var(--line)' }}>{n.type}</td>
                                <td style={{ padding: 8, borderBottom: '1px solid var(--line)' }}>{n.channel}</td>
                                <td style={{ padding: 8, borderBottom: '1px solid var(--line)' }}>{n.status}</td>
                                <td style={{ padding: 8, borderBottom: '1px solid var(--line)' }}>
                                  {n.message_url ? (
                                    <a href={n.message_url} target="_blank" rel="noreferrer">열기</a>
                                  ) : (
                                    <span className="muted">-</span>
                                  )}
                                </td>
                                <td style={{ padding: 8, borderBottom: '1px solid var(--line)' }}>
                                  {n.error_message ? (
                                    <span>{n.error_code ? `[${n.error_code}] ` : ''}{n.error_message}</span>
                                  ) : (
                                    <span className="muted">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {data.notifications.length > 20 && (
                        <div className="muted" style={{ marginTop: 8 }}>최근 20건만 표시</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Print layout */}
                {urls.uploadUrl && (
                  <div className="print-area" style={{ display: 'none' }}>
                    <div style={{ padding: 20 }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <img src={qrImg(urls.uploadUrl)} alt="QR" style={{ width: 220, height: 220 }} />
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>새김 · 증빙 업로드</div>
                          <div style={{ fontSize: 16, fontWeight: 700 }}>주문번호: {data.order.order_number}</div>
                          {data.order.context && <div style={{ marginTop: 4 }}>구분: {data.order.context}</div>}
                          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>QR 스캔 → 사진 1장 촬영/업로드</div>
                          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{urls.uploadUrl}</div>
                        </div>
                      </div>
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
