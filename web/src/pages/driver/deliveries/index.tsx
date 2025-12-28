import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { DriverLayout } from '../../../components/DriverLayout';
import { listDeliveries, DeliveryListResponse, DeliveryOrder } from '../../../services/driverApi';
import { Button } from '../../../components/ui/button';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

type TabType = 'all' | 'pending' | 'completed';

export default function DeliveriesListPage() {
  const [data, setData] = useState<DeliveryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>('all');
  const [todayOnly, setTodayOnly] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await listDeliveries({ today_only: todayOnly });
        setData(result);
        setError(null);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [todayOnly]);

  const filteredItems = data?.items?.filter((item) => {
    if (tab === 'pending') {
      return item.status === 'PENDING' || item.status === 'TOKEN_ISSUED';
    }
    if (tab === 'completed') {
      return item.status === 'NOTIFIED' || item.status === 'COMPLETED';
    }
    return true;
  }) || [];

  return (
    <DriverLayout title="배송 목록">
      <div className="p-4 space-y-4">
        {/* Date Filter */}
        <div className="flex gap-2">
          <Button
            variant={todayOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTodayOnly(true)}
          >
            오늘
          </Button>
          <Button
            variant={!todayOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTodayOnly(false)}
          >
            전체
          </Button>
        </div>

        {/* Status Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            className={`flex-1 py-2 text-sm rounded-md ${
              tab === 'all' ? 'bg-white shadow' : ''
            }`}
            onClick={() => setTab('all')}
          >
            전체 ({data?.total || 0})
          </button>
          <button
            className={`flex-1 py-2 text-sm rounded-md ${
              tab === 'pending' ? 'bg-white shadow' : ''
            }`}
            onClick={() => setTab('pending')}
          >
            대기 ({data?.pending_count || 0})
          </button>
          <button
            className={`flex-1 py-2 text-sm rounded-md ${
              tab === 'completed' ? 'bg-white shadow' : ''
            }`}
            onClick={() => setTab('completed')}
          >
            완료 ({data?.completed_count || 0})
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="text-red-600 bg-red-50 p-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-gray-500 text-center py-8">Loading...</div>
        )}

        {/* List */}
        {!loading && filteredItems.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            배송이 없습니다.
          </div>
        )}

        {!loading && filteredItems.length > 0 && (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <DeliveryCard key={item.id} delivery={item} />
            ))}
          </div>
        )}
      </div>
    </DriverLayout>
  );
}

function DeliveryCard({ delivery }: { delivery: DeliveryOrder }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING: { label: '대기', className: 'bg-orange-100 text-orange-700' },
    TOKEN_ISSUED: { label: '대기', className: 'bg-orange-100 text-orange-700' },
    PROOF_UPLOADED: { label: '진행', className: 'bg-blue-100 text-blue-700' },
    NOTIFIED: { label: '완료', className: 'bg-green-100 text-green-700' },
    COMPLETED: { label: '완료', className: 'bg-green-100 text-green-700' },
  };

  const { label, className } = statusConfig[delivery.status] || {
    label: delivery.status,
    className: 'bg-gray-100 text-gray-700',
  };

  return (
    <Link href={`/driver/deliveries/${delivery.id}`}>
      <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-2">
            <span className="text-lg">📍</span>
            <div>
              <div className="font-medium">
                {delivery.context || delivery.order_number}
              </div>
              <div className="text-sm text-gray-500">
                {delivery.order_number}
              </div>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${className}`}>
            {label}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          <div>발주자: {delivery.sender_name}</div>
          {delivery.recipient_name && (
            <div>수령인: {delivery.recipient_name}</div>
          )}
        </div>
        {delivery.has_proof && (
          <div className="mt-2 text-xs text-green-600">
            📷 증빙 {delivery.proof_count}건 업로드됨
          </div>
        )}
      </div>
    </Link>
  );
}
