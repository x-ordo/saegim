import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import {
  listProducts,
  listProductCategories,
  deleteProduct,
  Product,
  ProductCategory,
  ProductListResponse,
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

export default function ProductsPage() {
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [categoryFilter, setCategoryFilter] = useState<string>('__all__');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);

    try {
      const token = await getAdminToken();
      const [productsRes, categoriesRes] = await Promise.all([
        listProducts(token, {
          category_id: categoryFilter && categoryFilter !== '__all__' ? Number(categoryFilter) : undefined,
          q: searchQuery || undefined,
          page,
          page_size: pageSize,
        }),
        listProductCategories(token),
      ]);
      setProducts(productsRes.items);
      setTotal(productsRes.total);
      setCategories(categoriesRes);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getAdminToken, categoryFilter, searchQuery, page, pageSize]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (productId: number) => {
    if (!confirm('이 상품을 삭제하시겠습니까?')) return;
    try {
      const token = await getAdminToken();
      await deleteProduct(token, productId);
      fetchProducts();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return '-';
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
  };

  const getCategoryName = (categoryId: number | null | undefined) => {
    if (!categoryId) return '-';
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || '-';
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AdminLayout title="상품 관리">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">상품 관리</h1>
          <div className="flex gap-2">
            <Link href="/app/products/categories">
              <Button variant="outline">카테고리 관리</Button>
            </Link>
            <Link href="/app/products/new">
              <Button>+ 상품 등록</Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="전체 카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">전체 카테고리</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="상품명 또는 SKU 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[300px]"
          />
          <Button variant="outline" onClick={() => { setPage(1); fetchProducts(); }}>
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
                  <TableHead className="w-[80px]">이미지</TableHead>
                  <TableHead>상품명</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead className="text-right">가격</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-[120px]">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      등록된 상품이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                            No img
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{getCategoryName(product.category_id)}</TableCell>
                      <TableCell className="text-right">{formatPrice(product.price)}</TableCell>
                      <TableCell>{product.sku || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link href={`/app/products/${product.id}`}>
                            <Button variant="outline" size="sm">
                              수정
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
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
              전체 {total}개 중 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}
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
