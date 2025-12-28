import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import { getOrderDetail, OrderDetail, issueToken, resendNotify } from '../../../services/adminApi';
import { useAdminToken } from '../../../services/useAdminToken';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function DeliveryDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [data, setData] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      setLoading(true);
      setError(null);
      const token = await getAdminToken();
      const result = await getOrderDetail(token, Number(id));
      setData(result);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (!router.isReady) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, router.isReady, id]);

  const handleIssueToken = async (force = false) => {
    if (!data) return;

    setActionLoading('token');
    try {
      const token = await getAdminToken();
      await issueToken(token, data.order.id, force);
      await load(); // Refresh data
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendNotify = async () => {
    if (!data) return;

    setActionLoading('notify');
    try {
      const token = await getAdminToken();
      await resendNotify(token, data.order.id);
      await load(); // Refresh data
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
            대기중
          </span>
        );
      case 'PROOF_UPLOADED':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
            증빙 업로드됨
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            완료
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout title="배송 상세">
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex justify-between items-center">
          <Link href="/app/deliveries">
            <Button variant="ghost" className="gap-2">
              <span>←</span> 목록으로
            </Button>
          </Link>
          {data && (
            <Link href={`/app/qr/labels?ids=${data.order.id}`}>
              <Button variant="outline">라벨 출력</Button>
            </Link>
          )}
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

        {/* Content */}
        {!loading && data && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column - Order Info */}
            <div className="space-y-6">
              {/* Order Header */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{data.order.order_number}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDateTime(data.order.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(data.order.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  {data.order.context && (
                    <div className="text-gray-700 mb-4">{data.order.context}</div>
                  )}
                </CardContent>
              </Card>

              {/* Sender/Recipient Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">발주자 / 수령자 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">발주자</span>
                    <span className="font-medium">{data.order.sender_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500">수령자</span>
                    <span className="font-medium">{data.order.recipient_name || '-'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">액션</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!data.token_valid && (
                    <Button
                      className="w-full"
                      onClick={() => handleIssueToken(false)}
                      disabled={actionLoading === 'token'}
                    >
                      {actionLoading === 'token' ? '처리 중...' : 'QR 토큰 발급'}
                    </Button>
                  )}
                  {data.token_valid && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleIssueToken(true)}
                      disabled={actionLoading === 'token'}
                    >
                      {actionLoading === 'token' ? '처리 중...' : 'QR 토큰 재발급'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleResendNotify}
                    disabled={actionLoading === 'notify'}
                  >
                    {actionLoading === 'notify' ? '처리 중...' : '알림 재발송'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Proof & QR */}
            <div className="space-y-6">
              {/* Proof Image */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">배송 증빙</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.proof_url ? (
                    <div className="space-y-3">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={data.proof_url}
                          alt="배송 증빙"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {data.proof_uploaded_at && (
                        <p className="text-sm text-gray-500 text-center">
                          업로드: {formatDateTime(data.proof_uploaded_at)}
                        </p>
                      )}
                      {data.public_proof_url && (
                        <a
                          href={data.public_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button variant="outline" className="w-full">
                            공개 페이지 열기
                          </Button>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <div className="text-4xl mb-2">📷</div>
                        <div>증빙 사진 없음</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* QR URLs */}
              {data.token_valid && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">QR 코드 링크</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.upload_url && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">업로드 URL</div>
                        <div className="bg-gray-50 p-2 rounded text-xs break-all">
                          {data.upload_url}
                        </div>
                        <a href={data.upload_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="link" size="sm" className="mt-1 h-auto p-0">
                            열기 →
                          </Button>
                        </a>
                      </div>
                    )}
                    {data.public_proof_url && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">확인 URL</div>
                        <div className="bg-gray-50 p-2 rounded text-xs break-all">
                          {data.public_proof_url}
                        </div>
                        <a href={data.public_proof_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="link" size="sm" className="mt-1 h-auto p-0">
                            열기 →
                          </Button>
                        </a>
                      </div>
                    )}
                    {data.short_public_url && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">단축 URL</div>
                        <div className="bg-gray-50 p-2 rounded text-xs break-all">
                          {data.short_public_url}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notification Logs */}
              {data.notifications && data.notifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">알림 이력</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.notifications.map((log) => (
                        <div
                          key={log.id}
                          className="flex justify-between items-center py-2 border-b last:border-b-0"
                        >
                          <div>
                            <div className="text-sm font-medium">
                              {log.type} / {log.channel}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDateTime(log.created_at)}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              log.status === 'SENT'
                                ? 'bg-green-100 text-green-800'
                                : log.status === 'FAILED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
