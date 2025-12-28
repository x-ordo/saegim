/**
 * FlowerProofUpload - Simplified proof upload for flower wreath delivery
 * 화환 배송 증빙용 간소화 업로드 컴포넌트
 *
 * Flow: Camera → Upload → Complete (single step, ~15 seconds)
 * Only AFTER proof, no BEFORE step needed
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadProofWithProgress } from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
  Camera,
  Upload,
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle,
  WifiOff,
  ImageIcon,
  Flower2,
  MapPin,
  Send,
} from 'lucide-react';
import { UploadProgress, UploadProgressStatus } from './UploadProgress';
import { useNetworkStatus, isSlowNetwork } from '../hooks/useNetworkStatus';
import { retryWithBackoff } from '../utils/retryUpload';
import {
  compressImage,
  CompressionResult,
  formatFileSize,
  getCompressionPercentage,
  isHeicFile,
} from '../utils/imageCompressor';

interface FlowerProofUploadProps {
  token: string;
  orderNumber?: string;
  context?: string; // e.g., "OO장례식장 3호실"
  senderName?: string;
  hasProof?: boolean;
  onComplete?: () => void;
}

type UploadStatus = 'idle' | 'compressing' | 'ready' | 'uploading' | 'success' | 'error';

const normalizeError = (msg: string) => {
  if (!msg) return '업로드에 실패했습니다. 다시 시도해주세요.';
  if (msg.includes('RATE_LIMITED')) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if (msg.toLowerCase().includes('already uploaded')) return '이미 업로드 완료된 항목입니다.';
  if (msg.includes('NETWORK_ERROR')) return '네트워크 오류가 발생했습니다.';
  if (msg.includes('TIMEOUT')) return '업로드 시간이 초과되었습니다.';
  return msg;
};

export const FlowerProofUpload = ({
  token,
  orderNumber,
  context,
  senderName,
  hasProof = false,
  onComplete,
}: FlowerProofUploadProps) => {
  const [status, setStatus] = useState<UploadStatus>(hasProof ? 'success' : 'idle');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState<UploadProgressStatus>('preparing');
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryAttempt, setRetryAttempt] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const networkStatus = useNetworkStatus();

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // File selection and compression
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('image/') && !isHeicFile(selectedFile)) {
      setStatus('error');
      setErrorMessage('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // Start compression
    setStatus('compressing');
    setProgress(0);
    setErrorMessage('');
    setCompressionResult(null);

    try {
      const result = await compressImage(selectedFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        onProgress: setProgress,
      });

      const url = URL.createObjectURL(result.file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      setFile(result.file);
      setPreviewUrl(url);
      setCompressionResult(result);
      setStatus('ready');
    } catch (error) {
      console.error('Compression failed:', error);
      // Use original file if compression fails
      const url = URL.createObjectURL(selectedFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      setFile(selectedFile);
      setPreviewUrl(url);
      setStatus('ready');
    }
  }, [previewUrl]);

  // Upload handler
  const handleUpload = useCallback(async () => {
    if (!file) return;

    if (!networkStatus.isOnline) {
      setStatus('error');
      setErrorMessage('인터넷 연결이 없습니다.');
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setProgressStatus('uploading');
    setRetryAttempt(0);

    try {
      await retryWithBackoff(
        async () => {
          setProgressStatus('uploading');
          await uploadProofWithProgress(token, file, 'AFTER', setProgress);
        },
        { maxRetries: 3 },
        (attempt) => {
          setRetryAttempt(attempt);
          setProgressStatus('retrying');
          setProgress(0);
        }
      );

      setStatus('success');
      setProgressStatus('processing');
      setProgress(100);
      onComplete?.();
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(normalizeError(error?.message || ''));
    }
  }, [file, token, networkStatus.isOnline, onComplete]);

  // Clear and reset
  const handleClear = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setProgress(0);
    setCompressionResult(null);
    setErrorMessage('');
    if (inputRef.current) inputRef.current.value = '';
  }, [previewUrl]);

  // Retake photo
  const handleRetake = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // Already uploaded
  if (hasProof && status !== 'success') {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="py-6 text-center">
          <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600" />
          <p className="text-lg font-semibold text-green-800 dark:text-green-200">
            배송 완료
          </p>
          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
            이미 증빙 사진이 등록되었습니다.
          </p>
          <Button className="mt-4" asChild>
            <a href={`/p/${token}`}>확인 페이지 보기</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Offline warning
  if (!networkStatus.isOnline) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <WifiOff className="h-6 w-6 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">오프라인 상태</p>
              <p className="text-sm text-amber-600">
                인터넷 연결 후 다시 시도해주세요.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success screen
  if (status === 'success') {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="py-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <Flower2 className="h-16 w-16 text-green-600" />
              <CheckCircle className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-green-800 dark:text-green-200">
            배송 완료!
          </h2>
          <p className="mt-2 text-green-600 dark:text-green-400">
            보낸 분과 받는 분께 확인 링크가 전송됩니다.
          </p>
          {context && (
            <p className="mt-1 text-sm text-green-500">
              <MapPin className="mr-1 inline h-3 w-3" />
              {context}
            </p>
          )}
          <Button className="mt-6" asChild>
            <a href={`/p/${token}`}>결과 확인하기</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        ref={inputRef}
        className="hidden"
      />

      {/* Order context info */}
      {(context || senderName) && status === 'idle' && (
        <Card className="bg-muted/30">
          <CardContent className="py-3">
            <div className="flex items-center gap-3 text-sm">
              {context && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{context}</span>
                </div>
              )}
              {senderName && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Send className="h-4 w-4" />
                  <span>{senderName}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slow network warning */}
      {isSlowNetwork(networkStatus) && status === 'idle' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-2">
            <p className="text-xs text-amber-700">
              네트워크 속도가 느립니다. 업로드에 시간이 걸릴 수 있습니다.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Compression progress */}
      {status === 'compressing' && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <ImageIcon className="h-5 w-5 animate-pulse text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">이미지 최적화 중...</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {previewUrl && status !== 'compressing' && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <img
              src={previewUrl}
              alt="화환 배송 사진"
              className="w-full object-cover"
            />
            <div className="border-t p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flower2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">배송 완료 사진</span>
                </div>
                <Badge variant="outline">{formatFileSize(file?.size || 0)}</Badge>
              </div>
              {compressionResult?.wasCompressed && (
                <p className="mt-1 text-xs text-green-600">
                  {getCompressionPercentage(compressionResult)}% 압축됨
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload progress */}
      {status === 'uploading' && (
        <UploadProgress
          percent={progress}
          status={progressStatus}
          retryAttempt={retryAttempt}
        />
      )}

      {/* Error message */}
      {status === 'error' && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {status === 'idle' && (
        <Button
          size="xl"
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="mr-2 h-5 w-5" />
          배송 사진 촬영
        </Button>
      )}

      {status === 'ready' && (
        <div className="space-y-2">
          <Button
            size="xl"
            className="w-full"
            onClick={handleUpload}
            disabled={!networkStatus.isOnline}
          >
            <Upload className="mr-2 h-5 w-5" />
            사진 전송
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" onClick={handleRetake}>
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 촬영
            </Button>
            <Button variant="ghost" size="lg" onClick={handleClear}>
              <X className="mr-2 h-4 w-4" />
              취소
            </Button>
          </div>
        </div>
      )}

      {status === 'error' && file && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" onClick={handleUpload}>
            <RefreshCw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>
          <Button variant="secondary" size="lg" onClick={handleRetake}>
            <Camera className="mr-2 h-4 w-4" />
            다시 촬영
          </Button>
        </div>
      )}
    </div>
  );
};
