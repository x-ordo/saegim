import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import {
  listProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  ProductCategory,
} from '../../../services/adminApi';
import { useAdminToken } from '../../../services/useAdminToken';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function CategoriesPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);

    try {
      const token = await getAdminToken();
      const cats = await listProductCategories(token);
      setCategories(cats);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getAdminToken]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setCategoryName('');
    setSortOrder('0');
    setDialogOpen(true);
  };

  const openEditDialog = (category: ProductCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setSortOrder(String(category.sort_order));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!categoryName.trim()) {
      setError('카테고리명을 입력해주세요.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await getAdminToken();
      if (editingCategory) {
        await updateProductCategory(token, editingCategory.id, {
          name: categoryName.trim(),
          sort_order: parseInt(sortOrder, 10) || 0,
        });
      } else {
        await createProductCategory(token, {
          name: categoryName.trim(),
          sort_order: parseInt(sortOrder, 10) || 0,
        });
      }
      setDialogOpen(false);
      fetchCategories();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryId: number) => {
    if (!confirm('이 카테고리를 삭제하시겠습니까?\n카테고리에 속한 상품은 "없음" 상태가 됩니다.')) return;

    try {
      const token = await getAdminToken();
      await deleteProductCategory(token, categoryId);
      fetchCategories();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  return (
    <AdminLayout title="카테고리 관리">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/app/products')}>
              ← 상품 목록
            </Button>
            <h1 className="text-2xl font-bold">카테고리 관리</h1>
          </div>
          <Button onClick={openCreateDialog}>+ 카테고리 추가</Button>
        </div>

        {/* Error */}
        {error && <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>}

        {/* Loading */}
        {loading && <div className="text-muted-foreground">Loading...</div>}

        {/* Table */}
        {!loading && (
          <Card>
            <CardHeader>
              <CardTitle>카테고리 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>카테고리명</TableHead>
                    <TableHead>정렬 순서</TableHead>
                    <TableHead className="w-[120px]">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        등록된 카테고리가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>{category.id}</TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.sort_order}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(category)}
                            >
                              수정
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(category.id)}
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
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? '카테고리 수정' : '카테고리 추가'}
              </DialogTitle>
              <DialogDescription>
                상품을 분류할 카테고리를 {editingCategory ? '수정' : '추가'}합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">카테고리명 *</Label>
                <Input
                  id="categoryName"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="예: 근조화환"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">정렬 순서</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  placeholder="0"
                />
                <p className="text-sm text-muted-foreground">
                  숫자가 작을수록 먼저 표시됩니다.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
