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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

type DeliveryStatus = 'all' | 'pending' | 'in_progress' | 'completed';

export default function DeliveriesPage() {
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<DeliveryStatus>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'all'>('today');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAdminToken();

      const params: { today?: boolean; q?: string } = {};
      if (dateFilter === 'today') {
        params.today = true;
      }
      if (searchQuery) {
        params.q = searchQuery;
      }

      const data = await listOrders(token, params);
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
  }, [isLoaded, isSignedIn, dateFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  // Filter orders by status tab
  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders;
    if (activeTab === 'pending') return orders.filter((o) => o.status === 'PENDING');
    if (activeTab === 'in_progress') return orders.filter((o) => o.status === 'PROOF_UPLOADED');
    if (activeTab === 'completed') return orders.filter((o) => o.status === 'COMPLETED');
    return orders;
  }, [orders, activeTab]);

  // Statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'PENDING').length;
    const inProgress = orders.filter((o) => o.status === 'PROOF_UPLOADED').length;
    const completed = orders.filter((o) => o.status === 'COMPLETED').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, pending, inProgress, completed, completionRate };
  }, [orders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5"></span>
            대기중
          </span>
        );
      case 'PROOF_UPLOADED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
            진행중
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
            완료
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout title="배송 관리">
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">전체</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">대기중</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">진행중</div>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">완료</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">완료율</div>
            <div className="text-2xl font-bold text-purple-600">{stats.completionRate}%</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border p-4">
          <form onSubmit={handleSearch} className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="주문번호, 발주자명, 수령자명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={dateFilter}
              onValueChange={(v) => setDateFilter(v as 'today' | 'week' | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="기간 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">오늘</SelectItem>
                <SelectItem value="week">이번 주</SelectItem>
                <SelectItem value="all">전체</SelectItem>
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

        {/* Tabs and Content */}
        {!loading && (
          <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as DeliveryStatus)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                전체 ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="pending">
                대기중 ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                진행중 ({stats.inProgress})
              </TabsTrigger>
              <TabsTrigger value="completed">
                완료 ({stats.completed})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {filteredOrders.length > 0 ? (
                <div className="bg-white rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">주문번호</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">내용</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">발주자</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">수령자</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">상태</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">시간</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link href={`/app/deliveries/${order.id}`} className="text-blue-600 hover:underline font-medium">
                              {order.order_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                            {order.context || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">{order.sender_name}</td>
                          <td className="px-4 py-3 text-sm">{order.recipient_name || '-'}</td>
                          <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatTime(order.created_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/app/deliveries/${order.id}`}>
                              <Button variant="ghost" size="sm">상세</Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white rounded-lg border p-8 text-center">
                  <div className="text-gray-500 mb-4">
                    {activeTab === 'all'
                      ? '등록된 배송이 없습니다.'
                      : activeTab === 'pending'
                      ? '대기중인 배송이 없습니다.'
                      : activeTab === 'in_progress'
                      ? '진행중인 배송이 없습니다.'
                      : '완료된 배송이 없습니다.'}
                  </div>
                  <Link href="/app/orders/new">
                    <Button>주문 등록하기</Button>
                  </Link>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
