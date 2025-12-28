import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import {
  getCourier,
  updateCourier,
  updateCourierPin,
  deleteCourier,
  Courier,
} from '../../../services/adminApi';
import { useAdminToken } from '../../../services/useAdminToken';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Checkbox } from '../../../components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function CourierDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const courierId = typeof id === 'string' ? parseInt(id, 10) : null;

  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [courier, setCourier] = useState<Courier | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  // PIN form state
  const [newPin, setNewPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !courierId) return;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const token = await getAdminToken();
        const data = await getCourier(token, courierId);
        setCourier(data);

        // Initialize form
        setName(data.name);
        setPhone(''); // Don't show encrypted phone
        setVehicleNumber(data.vehicle_number || '');
        setNotes(data.notes || '');
        setIsActive(data.is_active);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn, getAdminToken, courierId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierId) return;
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await getAdminToken();
      await updateCourier(token, courierId, {
        name: name.trim(),
        phone: phone.trim() || null,
        vehicle_number: vehicleNumber.trim() || null,
        notes: notes.trim() || null,
        is_active: isActive,
      });
      router.push('/app/couriers');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const handlePinUpdate = async () => {
    if (!courierId) return;
    if (!newPin || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      setError('PIN은 4~6자리 숫자여야 합니다.');
      return;
    }

    setSavingPin(true);
    setError(null);
    setPinSuccess(null);

    try {
      const token = await getAdminToken();
      await updateCourierPin(token, courierId, newPin);
      setNewPin('');
      setPinSuccess('PIN이 성공적으로 변경되었습니다.');
      // Refresh courier data
      const data = await getCourier(token, courierId);
      setCourier(data);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSavingPin(false);
    }
  };

  const handleDelete = async () => {
    if (!courierId) return;
    if (!confirm('이 배송기사를 삭제하시겠습니까?')) return;

    try {
      const token = await getAdminToken();
      await deleteCourier(token, courierId);
      router.push('/app/couriers');
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  if (loading) {
    return (
      <AdminLayout title="배송기사 수정">
        <div className="text-muted-foreground">Loading...</div>
      </AdminLayout>
    );
  }

  if (!courier) {
    return (
      <AdminLayout title="배송기사 수정">
        <div className="text-red-600">배송기사를 찾을 수 없습니다.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="배송기사 수정">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>배송기사 수정</CardTitle>
            <CardDescription>
              현재 연락처: {courier.phone_masked || '등록되지 않음'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 홍길동"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">연락처 변경</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="변경 시에만 입력 (예: 010-1234-5678)"
                />
                <p className="text-sm text-muted-foreground">
                  입력하지 않으면 기존 연락처가 유지됩니다. 연락처는 암호화되어 저장됩니다.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">차량번호</Label>
                <Input
                  id="vehicleNumber"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="예: 12가 3456"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">메모</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="관리용 메모를 입력하세요."
                  rows={3}
                />
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
                    onClick={() => router.push('/app/couriers')}
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

        {/* PIN Management Card */}
        <Card>
          <CardHeader>
            <CardTitle>PIN 관리</CardTitle>
            <CardDescription>
              PIN 상태: {courier.has_pin ? '설정됨' : '미설정'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pinSuccess && (
                <div className="text-green-600 bg-green-50 p-3 rounded">{pinSuccess}</div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPin">새 PIN (4~6자리 숫자)</Label>
                <div className="flex gap-2">
                  <Input
                    id="newPin"
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="새 PIN 입력"
                    maxLength={6}
                    className="w-[200px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePinUpdate}
                    disabled={savingPin}
                  >
                    {savingPin ? '변경 중...' : 'PIN 변경'}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  배송기사가 모바일 앱에서 로그인할 때 사용합니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
