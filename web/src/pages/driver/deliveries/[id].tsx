import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { DriverLayout } from '../../../components/DriverLayout';
import { getDeliveryDetail, DeliveryDetail } from '../../../services/driverApi';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function DeliveryDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const orderId = typeof id === 'string' ? parseInt(id, 10) : null;

  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getDeliveryDetail(orderId);
        setDelivery(data);
        setError(null);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [orderId]);

  if (loading) {
    return (
      <DriverLayout title="배송 상세">
        <div className="p-4 text-gray-500">Loading...</div>
      </DriverLayout>
    );
  }

  if (error || !delivery) {
    return (
      <DriverLayout title="배송 상세">
        <div className="p-4 space-y-4">
          <div className="text-red-600 bg-red-50 p-3 rounded">
            {error || '배송 정보를 찾을 수 없습니다.'}
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            ← 돌아가기
          </Button>
        </div>
      </DriverLayout>
    );
  }

  const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING: { label: '대기', className: 'bg-orange-100 text-orange-700' },
    TOKEN_ISSUED: { label: '대기', className: 'bg-orange-100 text-orange-700' },
    PROOF_UPLOADED: { label: '진행', className: 'bg-blue-100 text-blue-700' },
    NOTIFIED: { label: '완료', className: 'bg-green-100 text-green-700' },
    COMPLETED: { label: '완료', className: 'bg-green-100 text-green-700' },
  };

  const { label: statusLabel, className: statusClass } = statusConfig[delivery.status] || {
    label: delivery.status,
    className: 'bg-gray-100 text-gray-700',
  };

  const isCompleted = delivery.status === 'NOTIFIED' || delivery.status === 'COMPLETED';

  return (
    <DriverLayout title="배송 상세">
      <div className="p-4 space-y-4">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          ← 목록으로
        </Button>

        {/* Order Info */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">
                {delivery.context || delivery.order_number}
              </CardTitle>
              <span className={`text-xs px-2 py-1 rounded ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="text-gray-500">{delivery.order_number}</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500">발주자:</span>{' '}
                <span className="font-medium">{delivery.sender_name}</span>
              </div>
              {delivery.recipient_name && (
                <div>
                  <span className="text-gray-500">수령인:</span>{' '}
                  <span className="font-medium">{delivery.recipient_name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Proof Upload Section */}
        {!isCompleted && delivery.upload_url && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">증빙 업로드</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={delivery.upload_url} target="_blank">
                <Button className="w-full h-14 text-lg">
                  📷 사진 촬영하기
                </Button>
              </Link>
              <p className="text-xs text-gray-500 text-center mt-2">
                터치하면 증빙 업로드 페이지로 이동합니다.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Uploaded Proofs */}
        {delivery.proofs && delivery.proofs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                업로드된 증빙 ({delivery.proofs.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {delivery.proofs.map((proof) => (
                  <div key={proof.id} className="relative">
                    <img
                      src={proof.file_url}
                      alt={`Proof ${proof.id}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                      {proof.proof_type}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Proofs Yet */}
        {(!delivery.proofs || delivery.proofs.length === 0) && (
          <div className="text-center text-gray-500 py-4">
            아직 업로드된 증빙이 없습니다.
          </div>
        )}

        {/* Completed Message */}
        {isCompleted && (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-green-600 font-medium">배송이 완료되었습니다.</div>
          </div>
        )}
      </div>
    </DriverLayout>
  );
}
