import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import { listOrders, Order, issueToken } from '../../../services/adminApi';
import { useAdminToken } from '../../../services/useAdminToken';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

type FilterMode = 'today' | 'pending' | 'all';

export default function BatchTokenPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('today');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [issuing, setIssuing] = useState(false);
  const [issuedCount, setIssuedCount] = useState(0);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAdminToken();
      const params: { today?: boolean; status?: string } = {};

      if (filterMode === 'today') {
        params.today = true;
      } else if (filterMode === 'pending') {
        params.status = 'PENDING';
      }

      const data = await listOrders(token, params);
      setOrders(data);
      setSelectedIds(new Set());
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
  }, [isLoaded, isSignedIn, filterMode]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };

  const handleBatchIssue = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `선택한 ${selectedIds.size}개 주문에 QR 토큰을 발급하시겠습니까?`
    );
    if (!confirmed) return;

    setIssuing(true);
    setIssuedCount(0);

    try {
      const token = await getAdminToken();
      const ids = Array.from(selectedIds);

      for (let i = 0; i < ids.length; i++) {
        try {
          await issueToken(token, ids[i]);
          setIssuedCount(i + 1);
        } catch (e) {
          console.error(`Failed to issue token for order ${ids[i]}:`, e);
        }
      }

      // Redirect to labels page with issued order IDs
      router.push(`/app/qr/labels?ids=${ids.join(',')}`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setIssuing(false);
    }
  };

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
    <AdminLayout title="QR 일괄 발급">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">QR 토큰 일괄 발급</h2>
            <p className="text-sm text-gray-500">
              여러 주문에 QR 토큰을 한 번에 발급하고 라벨을 출력합니다.
            </p>
          </div>
          <Link href="/app/qr">
            <Button variant="outline">목록으로</Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">필터:</span>
            <Select
              value={filterMode}
              onValueChange={(v) => setFilterMode(v as FilterMode)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="필터 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">오늘 주문</SelectItem>
                <SelectItem value="pending">대기중 주문</SelectItem>
                <SelectItem value="all">전체 주문</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="text-red-600 bg-red-50 p-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Issuing Progress */}
        {issuing && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-blue-700">
                토큰 발급 중... ({issuedCount}/{selectedIds.size})
              </span>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-gray-500 text-center py-8">Loading...</div>
        )}

        {/* Orders Table */}
        {!loading && orders.length > 0 && (
          <>
            {/* Selection Actions */}
            <div className="flex items-center justify-between gap-4 bg-white rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedIds.size === orders.length && orders.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm text-gray-600">
                  {selectedIds.size > 0
                    ? `${selectedIds.size}개 선택됨`
                    : '전체 선택'}
                </span>
              </div>
              <Button
                onClick={handleBatchIssue}
                disabled={selectedIds.size === 0 || issuing}
              >
                {issuing ? '발급 중...' : `선택 항목 발급 (${selectedIds.size})`}
              </Button>
            </div>

            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">
                      <Checkbox
                        checked={selectedIds.size === orders.length && orders.length > 0}
                        onCheckedChange={selectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">주문번호</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">내용</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">발주자</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">상태</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">생성일</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedIds.has(order.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => toggleSelect(order.id)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={() => toggleSelect(order.id)}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{order.order_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.context || '-'}</td>
                      <td className="px-4 py-3 text-sm">{order.sender_name}</td>
                      <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && orders.length === 0 && (
          <div className="bg-white rounded-lg border p-8 text-center">
            <div className="text-gray-500 mb-4">
              {filterMode === 'today'
                ? '오늘 등록된 주문이 없습니다.'
                : filterMode === 'pending'
                ? '대기중인 주문이 없습니다.'
                : '등록된 주문이 없습니다.'}
            </div>
            <Link href="/app/orders/new">
              <Button>주문 등록하기</Button>
            </Link>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
