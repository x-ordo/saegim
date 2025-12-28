import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { getProofByToken, ProofData, ProofItem } from '../../services/api';
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Copy, Share2, ExternalLink, Loader2, AlertCircle, Package, Tag, Palette, FileText } from 'lucide-react';

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
      const title = '배송 완료 증빙';
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
    <div className="shadcn min-h-screen bg-background">
      <div className="container max-w-lg py-6 px-4">
        {/* Header */}
        <Card className="mb-4 text-center">
          <CardContent className="pt-6">
            {proof?.organization_logo && (
              <img
                src={proof.organization_logo}
                alt={proof.organization_name}
                className="mx-auto mb-3 max-w-[140px] max-h-12 object-contain"
              />
            )}
            <Badge variant="success" className="mb-2">배송 완료</Badge>
            <p className="text-muted-foreground">
              {proof?.organization_name || '새김'}
            </p>
            {proof && !proof.hide_saegim && (
              <p className="mt-1 text-xs text-muted-foreground">Powered by 새김</p>
            )}
          </CardContent>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">오류</p>
                  <p className="mt-1 text-sm text-destructive/80">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && proof && (
          <div className="space-y-4">
            {/* Order Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">주문번호</p>
                    <p className="text-lg font-bold">{proof.order_number}</p>
                    {proof.context && <p className="mt-1 text-sm text-muted-foreground">{proof.context}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-muted-foreground">업로드 시각</p>
                    <p className="font-semibold">
                      {proof.uploaded_at ? formatDate(proof.uploaded_at) : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Asset Metadata */}
            {proof.asset_meta && Object.keys(proof.asset_meta).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-4 w-4" />
                    자산 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    {proof.asset_meta.brand && (
                      <div className="flex items-start gap-2">
                        <Tag className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">브랜드</p>
                          <p className="font-semibold">{proof.asset_meta.brand}</p>
                        </div>
                      </div>
                    )}
                    {proof.asset_meta.model && (
                      <div className="flex items-start gap-2">
                        <Package className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">모델</p>
                          <p className="font-semibold">{proof.asset_meta.model}</p>
                        </div>
                      </div>
                    )}
                    {proof.asset_meta.material && (
                      <div className="flex items-start gap-2">
                        <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">소재</p>
                          <p className="font-semibold">{proof.asset_meta.material}</p>
                        </div>
                      </div>
                    )}
                    {proof.asset_meta.color && (
                      <div className="flex items-start gap-2">
                        <Palette className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">컬러</p>
                          <p className="font-semibold">{proof.asset_meta.color}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {proof.asset_meta.repair_note && (
                    <div className="mt-4 rounded-lg bg-muted p-3">
                      <p className="text-xs font-medium text-muted-foreground">배송 메모</p>
                      <p className="mt-1 text-sm">{proof.asset_meta.repair_note}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Proof Image(s) */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {/* Before/After Slider or Single Image */}
                {hasBothProofs ? (
                  <BeforeAfterSlider
                    beforeUrl={getFullUrl(beforeProof.proof_url)}
                    afterUrl={getFullUrl(afterProof.proof_url)}
                  />
                ) : singleProofUrl ? (
                  <img
                    src={singleProofUrl}
                    alt="배송 증빙 사진"
                    className="w-full"
                  />
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    증빙 이미지가 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-2">
              {singleProofUrl && !hasBothProofs && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={singleProofUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    원본 열기
                  </a>
                </Button>
              )}

              {hasBothProofs && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={getFullUrl(beforeProof.proof_url)} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      상품 원본
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={getFullUrl(afterProof.proof_url)} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      배송 증빙 원본
                    </a>
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={async () => {
                    const ok = await copy(shareUrl || '');
                    setToast(ok ? '링크 복사됨' : '복사 실패');
                    window.setTimeout(() => setToast(null), 1400);
                  }}
                  disabled={!shareUrl}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  링크 복사
                </Button>
                {canShare && (
                  <Button variant="secondary" onClick={share} disabled={!shareUrl}>
                    <Share2 className="mr-2 h-4 w-4" />
                    공유
                  </Button>
                )}
              </div>

              <p className="text-center text-xs text-muted-foreground">
                이 링크는 로그인 없이 확인 가능합니다.
              </p>
            </div>
          </div>
        )}

        {/* Toast notification */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
