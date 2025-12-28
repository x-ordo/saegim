import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import { listOrders, Order } from '../../../services/adminApi';
import { useAdminToken } from '../../../services/useAdminToken';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

type StatusFilter = 'all' | 'pending' | 'proof_uploaded' | 'completed';

export default function QrManagementPage() {
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAdminToken();
      const data = await listOrders(token, {
        status: statusFilter === 'all' ? undefined : statusFilter.toUpperCase(),
        q: searchQuery || undefined,
      });
      setOrders(data);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  // Statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'PENDING').length;
    const uploaded = orders.filter((o) => o.status === 'PROOF_UPLOADED').length;
    const completed = orders.filter((o) => o.status === 'COMPLETED').length;
    return { total, pending, uploaded, completed };
  }, [orders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">대기중</span>;
      case 'PROOF_UPLOADED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">업로드됨</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">완료</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <AdminLayout title="QR 관리">
      <div className="space-y-6">
        {/* Actions */}
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div className="flex gap-2">
            <Link href="/app/qr/labels?mode=today">
              <Button variant="outline">오늘 라벨 출력</Button>
            </Link>
            <Link href="/app/qr/batch">
              <Button variant="outline">일괄 발급</Button>
            </Link>
          </div>
          <Link href="/app/orders/new">
            <Button>+ 주문 등록</Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">전체 주문</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">대기중</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">증빙 업로드됨</div>
            <div className="text-2xl font-bold text-blue-600">{stats.uploaded}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">완료</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border p-4">
          <form onSubmit={handleSearch} className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="주문번호, 발주자명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="proof_uploaded">업로드됨</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">검색</Button>
          </form>
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

        {/* Orders Table */}
        {!loading && orders.length > 0 && (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">주문번호</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">내용</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">발주자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">생성일</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/app/orders/${order.id}`} className="text-blue-600 hover:underline font-medium">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.context || '-'}</td>
                    <td className="px-4 py-3 text-sm">{order.sender_name}</td>
                    <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/app/qr/labels?ids=${order.id}`}>
                          <Button variant="outline" size="sm">라벨</Button>
                        </Link>
                        <Link href={`/app/orders/${order.id}`}>
                          <Button variant="ghost" size="sm">상세</Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && orders.length === 0 && (
          <div className="bg-white rounded-lg border p-8 text-center">
            <div className="text-gray-500 mb-4">등록된 주문이 없습니다.</div>
            <Link href="/app/orders/new">
              <Button>첫 주문 등록하기</Button>
            </Link>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
