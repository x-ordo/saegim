import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ProofWizard } from '../../components/ProofWizard';
import { getOrderByToken, getProofByToken, OrderSummary, ProofData } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Loader2, AlertCircle, CheckCircle, Upload, Package, Tag } from 'lucide-react';

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
    <div className="shadcn min-h-screen bg-background">
      <div className="container max-w-lg py-6 px-4">
        {/* Header */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {brandLogo && (
                <img
                  src={brandLogo}
                  alt={brandName}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h1 className="font-semibold">{brandName}</h1>
                <p className="text-sm text-muted-foreground">수선 증빙 업로드</p>
              </div>
              {!hideSaegim && (
                <span className="text-xs text-muted-foreground">Powered by 새김</span>
              )}
            </div>
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
                  <p className="mt-2 text-xs text-muted-foreground">문제가 계속되면 업체에 문의해주세요.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && existingProof && (
          <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600" />
              <p className="text-lg font-semibold text-green-800 dark:text-green-200">이미 업로드 완료</p>
              <p className="mt-1 text-sm text-green-600 dark:text-green-400">확인 링크로 이동하세요.</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href={`/p/${t}`}>확인 페이지 열기</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && order && (
          <>
            {/* Order Info Card */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">수선 증빙 업로드</CardTitle>
                </div>
                <CardDescription>
                  주문번호: <span className="font-semibold text-foreground">{order.order_number}</span>
                  {order.context && <span className="ml-2">· {order.context}</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Asset Info */}
                {order.asset_meta && (order.asset_meta.brand || order.asset_meta.model) && (
                  <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-3">
                    {order.asset_meta.brand && (
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{order.asset_meta.brand}</span>
                      </div>
                    )}
                    {order.asset_meta.model && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{order.asset_meta.model}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Proof Status */}
                <div className="mt-3 flex gap-2">
                  <Badge variant={order.has_before_proof ? 'success' : 'outline'}>
                    수선 전 {order.has_before_proof ? '완료' : '대기'}
                  </Badge>
                  <Badge variant={order.has_after_proof ? 'success' : 'outline'}>
                    수선 후 {order.has_after_proof ? '완료' : '대기'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Proof Wizard - Streamlined BEFORE/AFTER Flow */}
            <Card>
              <CardContent className="pt-6">
                <ProofWizard
                  token={t}
                  hasBeforeProof={order.has_before_proof}
                  hasAfterProof={order.has_after_proof}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
