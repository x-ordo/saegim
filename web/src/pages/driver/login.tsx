import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { driverLogin, isSessionValid } from '../../services/driverApi';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function DriverLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if already logged in
    if (isSessionValid()) {
      router.replace('/driver');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !pin.trim()) {
      setError('전화번호와 PIN을 입력해주세요.');
      return;
    }

    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      setError('PIN은 4~6자리 숫자여야 합니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await driverLogin(phone.trim(), pin);
      router.replace('/driver');
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes('INVALID_CREDENTIALS')) {
        setError('전화번호 또는 PIN이 올바르지 않습니다.');
      } else if (msg.includes('INVALID_PHONE')) {
        setError('올바른 전화번호 형식이 아닙니다.');
      } else {
        setError('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">새김 배송</CardTitle>
          <CardDescription>배송기사 로그인</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-red-600 bg-red-50 p-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-1234-5678"
                autoComplete="tel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="4~6자리 숫자"
                maxLength={6}
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
