import { useRouter } from 'next/router';
import { useState } from 'react';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import { createCourier } from '../../../services/adminApi';
import { useAdminToken } from '../../../services/useAdminToken';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Checkbox } from '../../../components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function NewCourierPage() {
  const router = useRouter();
  const { getAdminToken } = useAdminToken();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [pin, setPin] = useState('');
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    if (pin && (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin))) {
      setError('PIN은 4~6자리 숫자여야 합니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAdminToken();
      await createCourier(token, {
        name: name.trim(),
        phone: phone.trim() || null,
        vehicle_number: vehicleNumber.trim() || null,
        notes: notes.trim() || null,
        pin: pin || null,
        is_active: isActive,
      });
      router.push('/app/couriers');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="배송기사 등록">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>배송기사 등록</CardTitle>
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
                <Label htmlFor="phone">연락처</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="예: 010-1234-5678"
                />
                <p className="text-sm text-muted-foreground">
                  연락처는 암호화되어 저장됩니다.
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
                <Label htmlFor="pin">PIN (4~6자리 숫자)</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="배송기사 앱 로그인용"
                  maxLength={6}
                />
                <p className="text-sm text-muted-foreground">
                  배송기사가 모바일 앱에서 로그인할 때 사용합니다.
                </p>
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

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? '저장 중...' : '저장'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/app/couriers')}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
