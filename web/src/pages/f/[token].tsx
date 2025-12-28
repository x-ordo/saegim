/**
 * Flower Wreath Proof Upload Page
 * 화환 배송 증빙 업로드 페이지
 *
 * URL: /f/{token}
 * Simplified flow: Camera → Upload → Complete (~15 seconds)
 */

import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FlowerProofUpload } from '../../components/FlowerProofUpload';
import { getOrderByToken, getProofByToken, OrderSummary, ProofData } from '../../services/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Loader2, AlertCircle, CheckCircle, Flower2, MapPin } from 'lucide-react';

export default function FlowerProofPage() {
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
        setLoading(false);
        return;
      }

      // 토큰이 이미 사용된 경우, 증빙이 있으면 확인 페이지로 안내
      const p = await getProofByToken(t);
      if (p) {
        setExistingProof(p);
        setLoading(false);
        return;
      }

      setError('유효하지 않거나 만료된 링크입니다.');
      setLoading(false);
    })().catch((err: any) => {
      if (err?.message === 'RATE_LIMITED') {
        setError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError('정보를 불러오는데 실패했습니다.');
      }
      setLoading(false);
    });
  }, [t]);

  const brandName = order?.organization_name || existingProof?.organization_name || '화환 배송';
  const brandLogo = order?.organization_logo || existingProof?.organization_logo || null;
  const hideSaegim = Boolean(order?.hide_saegim || existingProof?.hide_saegim);

  return (
    <div className="shadcn min-h-screen bg-gradient-to-b from-green-50 to-background dark:from-green-950">
      <div className="container max-w-lg py-6 px-4">
        {/* Header */}
        <Card className="mb-4 border-green-100 dark:border-green-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={brandName}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <Flower2 className="h-6 w-6 text-green-600" />
                </div>
              )}
              <div className="flex-1">
                <h1 className="font-semibold">{brandName}</h1>
                <p className="text-sm text-muted-foreground">화환 배송 확인</p>
              </div>
              {!hideSaegim && (
                <span className="text-xs text-muted-foreground">Powered by 새김</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">오류</p>
                  <p className="mt-1 text-sm text-destructive/80">{error}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    문제가 계속되면 업체에 문의해주세요.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already uploaded - redirect to view */}
        {!loading && existingProof && (
          <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600" />
              <p className="text-lg font-semibold text-green-800 dark:text-green-200">
                배송 완료
              </p>
              <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                이미 배송 사진이 등록되었습니다.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href={`/p/${t}`}>확인 페이지 열기</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main upload flow */}
        {!loading && order && (
          <>
            {/* Order context card */}
            {order.context && (
              <Card className="mb-4 border-green-100 bg-green-50/50 dark:border-green-900 dark:bg-green-950/50">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        {order.context}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        주문번호: {order.order_number}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upload component */}
            <Card>
              <CardContent className="pt-6">
                <FlowerProofUpload
                  token={t}
                  orderNumber={order.order_number}
                  context={order.context ?? undefined}
                  hasProof={order.has_after_proof}
                />
              </CardContent>
            </Card>

            {/* Help text */}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              배송 완료 사진을 촬영하면<br />
              보낸 분과 받는 분께 확인 링크가 전송됩니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
