import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { UploadForm } from '../../components/UploadForm';
import { getOrderByToken, getProofByToken, OrderSummary, ProofData } from '../../services/api';

export default function ProofPage() {
  const router = useRouter();
  const { token } = router.query;
  const t = typeof token === 'string' ? token : '';

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [existingProof, setExistingProof] = useState<ProofData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!t) return;
    (async () => {
      setLoading(true);
      setError(null);
      setOrder(null);
      setExistingProof(null);

      const o = await getOrderByToken(t);
      if (o) {
        setOrder(o);
        return;
      }

      // 토큰이 이미 사용/만료된 경우라도, 증빙이 있으면 확인 페이지로 안내
      const p = await getProofByToken(t);
      if (p) {
        setExistingProof(p);
        return;
      }

      setError('유효하지 않거나 만료된 토큰입니다.');
    })()
      .catch((err: any) => {
        if (err?.message === 'RATE_LIMITED') {
          setError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        } else {
          setError('주문 정보를 불러오는데 실패했습니다.');
        }
      })
      .finally(() => setLoading(false));
  }, [t]);

  const brandName = order?.organization_name || existingProof?.organization_name || '배송 증빙';
  const brandLogo = order?.organization_logo || existingProof?.organization_logo || null;
  const hideSaegim = Boolean(order?.hide_saegim || existingProof?.hide_saegim);

  return (
    <div className="page">
      <div className="container sm">
        <div className="card flat" style={{ marginBottom: 14 }}>
          <div className="brand" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
              {brandLogo && (
                <img
                  src={brandLogo}
                  alt={brandName}
                  style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}
                />
              )}
              <div>
                <div className="name">{brandName}</div>
                <div className="tag">배송 증빙</div>
              </div>
              <div style={{ marginLeft: 'auto' }} className="muted">
                {!hideSaegim ? 'Powered by 새김' : ''}
              </div>
            </div>
          </div>

          {loading && <div className="muted">로딩 중…</div>}

          {!loading && error && (
            <div className="danger">
              <div style={{ fontWeight: 700, marginBottom: 6 }}>오류</div>
              <div>{error}</div>
              <div className="muted" style={{ marginTop: 8 }}>문제가 계속되면 업체에 문의해주세요.</div>
            </div>
          )}

          {!loading && existingProof && (
            <div className="ok">
              <div style={{ fontWeight: 700, marginBottom: 6 }}>이미 업로드 완료</div>
              <div className="muted">확인 링크로 이동하세요.</div>
              <div style={{ marginTop: 10 }}>
                <Link className="btn secondary" href={`/p/${t}`}>확인 페이지 열기</Link>
              </div>
            </div>
          )}

          {!loading && order && (
            <div style={{ marginTop: 10 }}>
              {order.organization_logo && (
                <img
                  src={order.organization_logo}
                  alt={order.organization_name}
                  style={{ maxWidth: 140, maxHeight: 48, objectFit: 'contain', marginBottom: 10 }}
                />
              )}
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>수선 증빙 업로드</div>
              <div className="muted">주문번호: <b>{order.order_number}</b> {order.context ? `· ${order.context}` : ''}</div>
              <div className="muted">업체: {order.organization_name}</div>
              {order.asset_meta && (
                <div className="muted" style={{ marginTop: 4 }}>
                  {order.asset_meta.brand && <span>{order.asset_meta.brand}</span>}
                  {order.asset_meta.model && <span> {order.asset_meta.model}</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {!loading && order && (
          <div className="card">
            <div className="muted" style={{ marginBottom: 10 }}>
              안내: 수선 전/후 사진을 업로드해주세요. 업로드 완료 후 고객에게 확인 링크가 전달됩니다.
            </div>
            <UploadForm
              token={t}
              hasBeforeProof={order.has_before_proof}
              hasAfterProof={order.has_after_proof}
            />
          </div>
        )}
      </div>
    </div>
  );
}
