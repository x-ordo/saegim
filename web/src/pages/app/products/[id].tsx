import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import {
  getProduct,
  updateProduct,
  deleteProduct,
  listProductCategories,
  Product,
  ProductCategory,
} from '../../../services/adminApi';
import { useAdminToken } from '../../../services/useAdminToken';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Checkbox } from '../../../components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const productId = typeof id === 'string' ? parseInt(id, 10) : null;

  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !productId) return;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const token = await getAdminToken();
        const [prod, cats] = await Promise.all([
          getProduct(token, productId),
          listProductCategories(token),
        ]);
        setProduct(prod);
        setCategories(cats);

        // Initialize form
        setName(prod.name);
        setDescription(prod.description || '');
        setPrice(prod.price !== null && prod.price !== undefined ? String(prod.price) : '');
        setSku(prod.sku || '');
        setCategoryId(prod.category_id ? String(prod.category_id) : '');
        setImageUrl(prod.image_url || '');
        setIsActive(prod.is_active);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn, getAdminToken, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    if (!name.trim()) {
      setError('상품명을 입력해주세요.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await getAdminToken();
      await updateProduct(token, productId, {
        name: name.trim(),
        description: description.trim() || null,
        price: price ? Number(price) : null,
        sku: sku.trim() || null,
        category_id: categoryId ? Number(categoryId) : null,
        image_url: imageUrl.trim() || null,
        is_active: isActive,
      });
      router.push('/app/products');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!productId) return;
    if (!confirm('이 상품을 삭제하시겠습니까?')) return;

    try {
      const token = await getAdminToken();
      await deleteProduct(token, productId);
      router.push('/app/products');
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  if (loading) {
    return (
      <AdminLayout title="상품 수정">
        <div className="text-muted-foreground">Loading...</div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout title="상품 수정">
        <div className="text-red-600">상품을 찾을 수 없습니다.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="상품 수정">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>상품 수정</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">상품명 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 근조화환 3단"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">없음</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">가격 (원)</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="예: 150000"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="상품에 대한 설명을 입력하세요."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU (상품코드)</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="예: FLW-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">이미지 URL</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="mt-2 w-32 h-32 object-cover rounded border"
                  />
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(!!checked)}
                />
                <Label htmlFor="isActive">활성 상태</Label>
              </div>

              <div className="flex justify-between pt-4">
                <div className="flex gap-3">
                  <Button type="submit" disabled={saving}>
                    {saving ? '저장 중...' : '저장'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/app/products')}
                  >
                    취소
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  삭제
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
