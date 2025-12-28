import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import {
  listCouriers,
  deleteCourier,
  Courier,
} from '../../../services/adminApi';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function CouriersPage() {
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCouriers = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);

    try {
      const token = await getAdminToken();
      const response = await listCouriers(token, {
        is_active: activeFilter === '' ? undefined : activeFilter === 'true',
        q: searchQuery || undefined,
        page,
        page_size: pageSize,
      });
      setCouriers(response.items);
      setTotal(response.total);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getAdminToken, activeFilter, searchQuery, page, pageSize]);

  useEffect(() => {
    fetchCouriers();
  }, [fetchCouriers]);

  const handleDelete = async (courierId: number) => {
    if (!confirm('이 배송기사를 삭제하시겠습니까?')) return;
    try {
      const token = await getAdminToken();
      await deleteCourier(token, courierId);
      fetchCouriers();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AdminLayout title="배송기사 관리">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">배송기사 관리</h1>
          <Link href="/app/couriers/new">
            <Button>+ 기사 등록</Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="전체 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체</SelectItem>
              <SelectItem value="true">활성</SelectItem>
              <SelectItem value="false">비활성</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="이름 또는 차량번호 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[300px]"
          />
          <Button variant="outline" onClick={() => { setPage(1); fetchCouriers(); }}>
            검색
          </Button>
        </div>

        {/* Error */}
        {error && <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>}

        {/* Loading */}
        {loading && <div className="text-muted-foreground">Loading...</div>}

        {/* Table */}
        {!loading && (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>차량번호</TableHead>
                  <TableHead>PIN 설정</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-[120px]">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {couriers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      등록된 배송기사가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  couriers.map((courier) => (
                    <TableRow key={courier.id}>
                      <TableCell className="font-medium">{courier.name}</TableCell>
                      <TableCell>{courier.phone_masked || '-'}</TableCell>
                      <TableCell>{courier.vehicle_number || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={courier.has_pin ? 'default' : 'secondary'}>
                          {courier.has_pin ? '설정됨' : '미설정'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={courier.is_active ? 'default' : 'secondary'}>
                          {courier.is_active ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link href={`/app/couriers/${courier.id}`}>
                            <Button variant="outline" size="sm">
                              수정
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(courier.id)}
                          >
                            삭제
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              전체 {total}명 중 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                이전
              </Button>
              <span className="px-3 py-1 text-sm">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                다음
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
