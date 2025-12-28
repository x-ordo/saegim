import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { DriverLayout } from '../../components/DriverLayout';
import { getUploadHistory, UploadHistoryResponse, UploadHistoryItem } from '../../services/driverApi';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function HistoryPage() {
  const [data, setData] = useState<UploadHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getUploadHistory(50);
        setData(result);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DriverLayout title="업로드 이력">
      <div className="p-4 space-y-4">
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

        {/* Empty State */}
        {!loading && (!data?.items || data.items.length === 0) && (
          <div className="text-gray-500 text-center py-8">
            업로드 이력이 없습니다.
          </div>
        )}

        {/* History List */}
        {!loading && data?.items && data.items.length > 0 && (
          <div className="space-y-3">
            {data.items.map((item) => (
              <HistoryCard key={item.proof_id} item={item} formatDate={formatDate} />
            ))}
          </div>
        )}
      </div>
    </DriverLayout>
  );
}

function HistoryCard({
  item,
  formatDate,
}: {
  item: UploadHistoryItem;
  formatDate: (date: string) => string;
}) {
  return (
    <Link href={`/driver/deliveries/${item.order_id}`}>
      <div className="bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow">
        <div className="flex">
          <img
            src={item.file_url}
            alt="Proof"
            className="w-20 h-20 object-cover"
          />
          <div className="flex-1 p-3">
            <div className="font-medium text-sm truncate">
              {item.context || item.order_number}
            </div>
            <div className="text-xs text-gray-500">{item.order_number}</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                {item.proof_type}
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(item.uploaded_at)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
