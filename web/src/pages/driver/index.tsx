import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { DriverLayout } from '../../components/DriverLayout';
import { listDeliveries, DeliveryListResponse, DeliveryOrder } from '../../services/driverApi';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function DriverDashboardPage() {
  const [data, setData] = useState<DeliveryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await listDeliveries({ today_only: true });
        setData(result);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const nextDelivery: DeliveryOrder | null = data?.items?.find(
    (item) => item.status === 'PENDING' || item.status === 'TOKEN_ISSUED'
  ) || null;

  return (
    <DriverLayout title="새김 배송">
      <div className="p-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="text-red-600 bg-red-50 p-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-500">
                {loading ? '-' : data?.pending_count || 0}
              </div>
              <div className="text-xs text-gray-500">대기</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">
                {loading ? '-' : data?.in_progress_count || 0}
              </div>
              <div className="text-xs text-gray-500">진행</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">
                {loading ? '-' : data?.completed_count || 0}
              </div>
              <div className="text-xs text-gray-500">완료</div>
            </CardContent>
          </Card>
        </div>

        {/* Native Camera Tip */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">📱</span>
              <div>
                <p className="font-medium text-blue-800">더 빠른 방법!</p>
                <p className="text-sm text-blue-600">
                  기본 카메라 앱으로 QR을 스캔하면 바로 업로드할 수 있습니다.
                  별도 로그인 없이 즉시 촬영 가능!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Scan Button */}
        <Link href="/driver/scan">
          <Button className="w-full h-14 text-lg">
            📷 QR 스캔하여 배송 시작
          </Button>
        </Link>

        {/* Next Delivery */}
        {nextDelivery && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">다음 배송</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/driver/deliveries/${nextDelivery.id}`}>
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">📍</span>
                    <div>
                      <div className="font-medium">
                        {nextDelivery.context || nextDelivery.order_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {nextDelivery.order_number}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    발주자: {nextDelivery.sender_name}
                    {nextDelivery.recipient_name && ` → ${nextDelivery.recipient_name}`}
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Today's Deliveries */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex justify-between items-center">
              <span>오늘의 배송</span>
              <Link href="/driver/deliveries" className="text-orange-500 text-xs font-normal">
                전체보기 →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-gray-500 text-sm">Loading...</div>
            ) : data?.items?.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-4">
                오늘 배송이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {data?.items?.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    href={`/driver/deliveries/${item.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.context || item.order_number}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.sender_name}
                        </div>
                      </div>
                      <div className="ml-2">
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DriverLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    PENDING: { label: '대기', className: 'bg-orange-100 text-orange-700' },
    TOKEN_ISSUED: { label: '대기', className: 'bg-orange-100 text-orange-700' },
    PROOF_UPLOADED: { label: '진행', className: 'bg-blue-100 text-blue-700' },
    NOTIFIED: { label: '완료', className: 'bg-green-100 text-green-700' },
    COMPLETED: { label: '완료', className: 'bg-green-100 text-green-700' },
  };

  const { label, className } = config[status] || { label: status, className: 'bg-gray-100 text-gray-700' };

  return (
    <span className={`text-xs px-2 py-1 rounded ${className}`}>
      {label}
    </span>
  );
}
