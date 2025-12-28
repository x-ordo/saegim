import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { DriverLayout } from '../../components/DriverLayout';
import { getDeliveryByToken } from '../../services/driverApi';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function ScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    // Cleanup scanner on unmount
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

  const startScanning = async () => {
    setError(null);
    setScanning(true);

    try {
      // Dynamically import html5-qrcode
      const { Html5Qrcode } = await import('html5-qrcode');

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // Stop scanner
          await scanner.stop();
          setScanning(false);

          // Process the scanned token
          await processToken(decodedText);
        },
        (errorMessage) => {
          // Scan error - ignore, keep scanning
        }
      );
    } catch (e: any) {
      setScanning(false);
      if (e?.message?.includes('NotAllowedError')) {
        setError('카메라 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해주세요.');
      } else if (e?.message?.includes('NotFoundError')) {
        setError('카메라를 찾을 수 없습니다.');
      } else {
        setError(`카메라 시작 실패: ${e?.message || String(e)}`);
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setScanning(false);
  };

  const processToken = async (token: string) => {
    setProcessing(true);
    setError(null);

    try {
      // Extract token from URL if full URL is scanned
      let cleanToken = token;
      const match = token.match(/\/proof\/([a-zA-Z0-9_-]+)/);
      if (match) {
        cleanToken = match[1];
      }

      // Fetch delivery by token
      const delivery = await getDeliveryByToken(cleanToken);

      // Navigate to delivery detail
      router.push(`/driver/deliveries/${delivery.id}`);
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes('TOKEN_NOT_FOUND')) {
        setError('유효하지 않은 QR 코드입니다.');
      } else if (msg.includes('ORG_MISMATCH')) {
        setError('다른 조직의 주문입니다.');
      } else {
        setError(`조회 실패: ${msg}`);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualToken.trim()) {
      setError('토큰을 입력해주세요.');
      return;
    }
    await processToken(manualToken.trim());
  };

  return (
    <DriverLayout title="QR 스캔">
      <div className="p-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="text-red-600 bg-red-50 p-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Processing */}
        {processing && (
          <div className="text-center py-4">
            <div className="text-gray-500">주문 정보 조회 중...</div>
          </div>
        )}

        {/* QR Scanner */}
        {!processing && (
          <Card>
            <CardContent className="p-4">
              {!scanning ? (
                <div className="text-center space-y-4">
                  <div className="text-6xl">📷</div>
                  <p className="text-gray-600">
                    QR 코드를 스캔하여 배송 정보를 확인하세요.
                  </p>
                  <Button onClick={startScanning} className="w-full h-14">
                    카메라 시작
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    id="qr-reader"
                    className="w-full aspect-square bg-black rounded-lg overflow-hidden"
                  />
                  <p className="text-sm text-gray-500 text-center">
                    QR 코드를 카메라에 비춰주세요.
                  </p>
                  <Button
                    variant="outline"
                    onClick={stopScanning}
                    className="w-full"
                  >
                    취소
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manual Input */}
        {!scanning && !processing && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-gray-500">
                또는 토큰을 직접 입력하세요:
              </p>
              <div className="flex gap-2">
                <Input
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="토큰 입력..."
                  className="flex-1"
                />
                <Button onClick={handleManualSubmit}>확인</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DriverLayout>
  );
}
