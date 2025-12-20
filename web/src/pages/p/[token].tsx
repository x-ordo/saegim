import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { getProofByToken, ProofData, ProofItem } from '../../services/api';
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider';

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export default function PublicProofPage() {
  const router = useRouter();
  const { token } = router.query;
  const t = typeof token === 'string' ? token : '';

  const [proof, setProof] = useState<ProofData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!t) return;
    (async () => {
      setLoading(true);
      setError(null);
      const data = await getProofByToken(t);
      if (!data) {
        setError('유효하지 않은 링크입니다.');
        return;
      }
      setProof(data);
    })()
      .catch((err: any) => {
        if (err?.message === 'RATE_LIMITED') setError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        else setError('증빙 정보를 불러오는데 실패했습니다.');
      })
      .finally(() => setLoading(false));
  }, [t]);

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const api = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const origin = api.replace(/\/api\/v1\/?$/, '');
    return `${origin}${url}`;
  };

  // Find BEFORE and AFTER proofs
  const beforeProof = useMemo(() => {
    return proof?.proofs?.find((p: ProofItem) => p.proof_type === 'BEFORE');
  }, [proof]);

  const afterProof = useMemo(() => {
    return proof?.proofs?.find((p: ProofItem) => p.proof_type === 'AFTER');
  }, [proof]);

  // For backward compatibility, use single proof_url if no proofs array
  const singleProofUrl = useMemo(() => {
    if (proof?.proofs && proof.proofs.length > 0) {
      // Use AFTER proof or first available
      const p = afterProof || proof.proofs[0];
      return getFullUrl(p.proof_url);
    }
    return proof?.proof_url ? getFullUrl(proof.proof_url) : '';
  }, [proof, afterProof]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }, []);

  const canShare = typeof navigator !== 'undefined' && !!(navigator as any).share;

  const share = async () => {
    try {
      if (!canShare) return;
      const title = '수선 완료 증빙';
      const lines = [
        proof?.organization_name ? proof.organization_name : '',
        proof?.context ? String(proof.context) : '',
        proof?.order_number ? `주문번호: ${proof.order_number}` : '',
      ].filter(Boolean);
      const text = lines.join('\n');
      await (navigator as any).share({ title, text, url: shareUrl });
      setToast('공유됨');
    } catch (e) {
      // user cancel or share failed: ignore
    } finally {
      window.setTimeout(() => setToast(null), 1400);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasBothProofs = beforeProof && afterProof;

  return (
    <div className="page">
      <div className="container sm">
        <div className="card flat" style={{ marginBottom: 14, textAlign: 'center' }}>
          {proof?.organization_logo && (
            <img
              src={proof.organization_logo}
              alt={proof.organization_name}
              style={{ maxWidth: 140, maxHeight: 48, objectFit: 'contain', marginBottom: 10 }}
            />
          )}
          <div style={{ fontSize: 18, fontWeight: 800 }}>수선 완료</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {proof?.organization_name || '새김'}
          </div>
          {proof && !proof.hide_saegim && (
            <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>Powered by 새김</div>
          )}
        </div>

        {loading && <div className="muted">로딩 중…</div>}

        {!loading && error && (
          <div className="danger">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>오류</div>
            <div>{error}</div>
          </div>
        )}

        {!loading && proof && (
          <div className="stack">
            <div className="card flat">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div className="label">주문번호</div>
                  <div style={{ fontWeight: 800 }}>{proof.order_number}</div>
                  {proof.context && <div className="muted" style={{ marginTop: 4 }}>{proof.context}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="label">업로드 시각</div>
                  <div style={{ fontWeight: 700 }}>
                    {proof.uploaded_at ? formatDate(proof.uploaded_at) : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Asset Metadata */}
            {proof.asset_meta && (
              <div className="card flat">
                <div className="label">자산 정보</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
                  {proof.asset_meta.brand && (
                    <div>
                      <div className="muted" style={{ fontSize: 12 }}>브랜드</div>
                      <div style={{ fontWeight: 700 }}>{proof.asset_meta.brand}</div>
                    </div>
                  )}
                  {proof.asset_meta.model && (
                    <div>
                      <div className="muted" style={{ fontSize: 12 }}>모델</div>
                      <div style={{ fontWeight: 700 }}>{proof.asset_meta.model}</div>
                    </div>
                  )}
                  {proof.asset_meta.material && (
                    <div>
                      <div className="muted" style={{ fontSize: 12 }}>소재</div>
                      <div style={{ fontWeight: 700 }}>{proof.asset_meta.material}</div>
                    </div>
                  )}
                  {proof.asset_meta.color && (
                    <div>
                      <div className="muted" style={{ fontSize: 12 }}>컬러</div>
                      <div style={{ fontWeight: 700 }}>{proof.asset_meta.color}</div>
                    </div>
                  )}
                </div>
                {proof.asset_meta.repair_note && (
                  <div style={{ marginTop: 12 }}>
                    <div className="muted" style={{ fontSize: 12 }}>수선 내용</div>
                    <div style={{ marginTop: 4 }}>{proof.asset_meta.repair_note}</div>
                  </div>
                )}
              </div>
            )}

            <div className="card">
              {/* Before/After Slider or Single Image */}
              {hasBothProofs ? (
                <BeforeAfterSlider
                  beforeUrl={getFullUrl(beforeProof.proof_url)}
                  afterUrl={getFullUrl(afterProof.proof_url)}
                />
              ) : singleProofUrl ? (
                <img
                  src={singleProofUrl}
                  alt="수선 증빙 사진"
                  style={{ width: '100%', borderRadius: 16, border: '1px solid var(--line)' }}
                />
              ) : (
                <div className="muted">증빙 이미지가 없습니다.</div>
              )}

              {singleProofUrl && !hasBothProofs && (
                <div style={{ marginTop: 10 }}>
                  <a className="btn secondary" href={singleProofUrl} target="_blank" rel="noreferrer">
                    원본 열기
                  </a>
                </div>
              )}

              {hasBothProofs && (
                <div className="row" style={{ marginTop: 10, justifyContent: 'center' }}>
                  <a className="btn secondary" href={getFullUrl(beforeProof.proof_url)} target="_blank" rel="noreferrer">
                    수선 전 원본
                  </a>
                  <a className="btn secondary" href={getFullUrl(afterProof.proof_url)} target="_blank" rel="noreferrer">
                    수선 후 원본
                  </a>
                </div>
              )}

              <div className="row" style={{ marginTop: 10, justifyContent: 'center' }}>
                <button
                  className="btn"
                  onClick={async () => {
                    const ok = await copy(shareUrl || '');
                    setToast(ok ? '링크 복사됨' : '복사 실패');
                    window.setTimeout(() => setToast(null), 1400);
                  }}
                  disabled={!shareUrl}
                >
                  링크 복사
                </button>
                {canShare && (
                  <button className="btn secondary" onClick={share} disabled={!shareUrl}>
                    공유
                  </button>
                )}
              </div>
              <div className="muted" style={{ marginTop: 10, textAlign: 'center' }}>
                이 링크는 로그인 없이 확인 가능합니다. (토큰 기반)
              </div>
            </div>
          </div>
        )}

        {/* Toast notification */}
        {toast && (
          <div style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: 8,
            fontSize: 14,
          }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
