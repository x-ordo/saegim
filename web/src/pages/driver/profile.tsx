import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { DriverLayout } from '../../components/DriverLayout';
import { getDriverMe, driverLogout, DriverMe, getDriverInfo } from '../../services/driverApi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<DriverMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDriverMe();
        setProfile(data);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return;

    setLoggingOut(true);
    try {
      await driverLogout();
      router.replace('/driver/login');
    } catch (e) {
      // Even if logout API fails, clear local session
      router.replace('/driver/login');
    }
  };

  const driverInfo = getDriverInfo();
  const expiresAt = driverInfo?.expires_at
    ? new Date(driverInfo.expires_at).toLocaleString('ko-KR')
    : '-';

  return (
    <DriverLayout title="내 정보">
      <div className="p-4 space-y-4">
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

        {/* Profile Info */}
        {!loading && profile && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">이름</span>
                  <span className="font-medium">{profile.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">연락처</span>
                  <span className="font-medium">{profile.phone_masked || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">차량번호</span>
                  <span className="font-medium">{profile.vehicle_number || '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">조직 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">조직</span>
                  <span className="font-medium">{profile.organization_name}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">세션 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">세션 만료</span>
                  <span className="text-sm">{expiresAt}</span>
                </div>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? '로그아웃 중...' : '로그아웃'}
            </Button>
          </>
        )}
      </div>
    </DriverLayout>
  );
}
