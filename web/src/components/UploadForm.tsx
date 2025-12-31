import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { uploadProofWithProgress, ProofType } from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Camera, Upload, RefreshCw, X, CheckCircle, AlertCircle, WifiOff, CloudOff, Cloud, ImageIcon } from 'lucide-react';
import { UploadProgress, UploadProgressStatus } from './UploadProgress';
import { useNetworkStatus, isSlowNetwork } from '../hooks/useNetworkStatus';
import { retryWithBackoff } from '../utils/retryUpload';
import { usePendingUploads } from '../hooks/usePendingUploads';
import {
  compressImage,
  CompressionResult,
  formatFileSize,
  getCompressionPercentage,
  isHeicFile,
} from '../utils/imageCompressor';

interface UploadFormProps {
  token: string;
  hasBeforeProof?: boolean;
  hasAfterProof?: boolean;
}

type UploadStatus = 'idle' | 'ready' | 'uploading' | 'success' | 'error';

const normalizeError = (msg: string) => {
  if (!msg) return '업로드에 실패했습니다. 다시 시도해주세요.';
  if (msg.includes('RATE_LIMITED')) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if (msg.toLowerCase().includes('already uploaded')) return '이미 업로드 완료된 항목입니다.';
  if (msg.includes('NETWORK_ERROR')) return '네트워크 오류가 발생했습니다. 연결 상태를 확인해주세요.';
  if (msg.includes('TIMEOUT')) return '업로드 시간이 초과되었습니다. 다시 시도해주세요.';
  if (msg.includes('UPLOAD_ABORTED')) return '업로드가 취소되었습니다.';
  return msg;
};

const PROOF_TYPE_LABELS: Record<ProofType, string> = {
  BEFORE: '상품 사진',
  AFTER: '배송 증빙',
  RECEIPT: '영수증',
  DAMAGE: '손상 부위',
  OTHER: '기타',
};

export const UploadForm = ({ token, hasBeforeProof, hasAfterProof }: UploadFormProps) => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [proofType, setProofType] = useState<ProofType>(
    // Default to BEFORE if AFTER already exists, otherwise AFTER
    hasAfterProof && !hasBeforeProof ? 'BEFORE' : 'AFTER'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // v1.0.1: Progress tracking
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState<UploadProgressStatus>('preparing');
  const [retryAttempt, setRetryAttempt] = useState(0);

  // v1.1: Image compression
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [compressionProgress, setCompressionProgress] = useState(0);

  // v1.0.1: Network status detection
  const networkStatus = useNetworkStatus();

  // v1.0.1: Pending uploads (offline backup)
  const {
    pendingUploads,
    hasPending,
    isSyncing,
    saveForLater,
    syncPendingUploads,
    removePending,
  } = usePendingUploads({
    token,
    onUploadSuccess: () => {
      // Redirect on successful sync
      window.location.href = `/p/${token}`;
    },
  });

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const openCamera = () => fileInputRef.current?.click();

  // v1.1: Compress image on file selection
  const onFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0];
    if (!f) return;

    // Reset compression state
    setCompressionResult(null);
    setCompressionProgress(0);
    setErrorMessage('');

    // Check if file is an image
    if (!f.type.startsWith('image/') && !isHeicFile(f)) {
      setErrorMessage('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // Compress the image
    setIsCompressing(true);
    setStatus('ready');

    try {
      const result = await compressImage(f, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        onProgress: (progress) => setCompressionProgress(progress),
      });

      setFile(result.file);
      setCompressionResult(result);
      setIsCompressing(false);
    } catch (error) {
      console.error('Compression failed:', error);
      // Fall back to original file if compression fails
      setFile(f);
      setCompressionResult(null);
      setIsCompressing(false);
    }
  }, []);

  const clear = () => {
    setFile(null);
    setStatus('idle');
    setErrorMessage('');
    setCompressionResult(null);
    setCompressionProgress(0);
    setIsCompressing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const upload = useCallback(async () => {
    if (!file) return;

    // v1.0.1: Network pre-check
    if (!networkStatus.isOnline) {
      setStatus('error');
      setErrorMessage('인터넷 연결이 없습니다. 연결 후 다시 시도해주세요.');
      return;
    }

    setStatus('uploading');
    setErrorMessage('');
    setUploadProgress(0);
    setProgressStatus('preparing');
    setRetryAttempt(0);

    try {
      // v1.0.1: Upload with progress tracking and auto-retry
      await retryWithBackoff(
        async () => {
          setProgressStatus('uploading');
          await uploadProofWithProgress(
            token,
            file,
            proofType,
            (percent) => setUploadProgress(percent)
          );
        },
        { maxRetries: 3, initialDelayMs: 1000 },
        (attempt, delay, error) => {
          // On retry callback
          setRetryAttempt(attempt);
          setProgressStatus('retrying');
          setUploadProgress(0);
          console.log(`Retry attempt ${attempt} after ${delay}ms due to:`, error.message);
        }
      );

      setProgressStatus('processing');
      setUploadProgress(100);
      setStatus('success');
      window.setTimeout(() => {
        window.location.href = `/p/${token}`;
      }, 650);
    } catch (e: any) {
      const msg = normalizeError(e?.message || String(e));
      setStatus('error');
      setErrorMessage(msg);
      // 이미 업로드된 경우는 확인 페이지로 바로 유도
      if (msg.includes('이미 업로드 완료')) {
        window.setTimeout(() => {
          window.location.href = `/p/${token}`;
        }, 650);
      }
    }
  }, [file, token, proofType, networkStatus.isOnline]);

  // v1.0.1: Save for later when offline or after max retries
  const handleSaveForLater = useCallback(async () => {
    if (!file) return;

    try {
      await saveForLater(file, proofType);
      setStatus('idle');
      setErrorMessage('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Failed to save for later:', error);
    }
  }, [file, proofType, saveForLater]);

  // v1.0.1: Auto-sync when coming back online
  useEffect(() => {
    if (networkStatus.isOnline && hasPending && !isSyncing) {
      // Small delay to ensure stable connection
      const timeout = setTimeout(() => {
        syncPendingUploads();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [networkStatus.isOnline, hasPending, isSyncing, syncPendingUploads]);

  if (status === 'success') {
    return (
      <Card
        className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
        role="status"
        aria-live="polite"
      >
        <CardContent className="pt-6 text-center">
          <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600" aria-hidden="true" />
          <p className="text-lg font-semibold text-green-800 dark:text-green-200">업로드 완료</p>
          <p className="mt-1 text-sm text-green-600 dark:text-green-400">확인 페이지로 이동합니다…</p>
          <Button variant="outline" className="mt-4" asChild>
            <a href={`/p/${token}`}>확인 페이지 열기</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Check if both main proofs are done
  const allDone = hasBeforeProof && hasAfterProof;

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        ref={fileInputRef}
        className="hidden"
        aria-label="증빙 사진 파일 선택"
      />

      {/* Proof Type Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">증빙 유형</label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={proofType === 'BEFORE' ? 'default' : 'outline'}
            size="xl"
            onClick={() => setProofType('BEFORE')}
            disabled={hasBeforeProof || status === 'uploading'}
            className="relative"
          >
            상품 사진
            {hasBeforeProof && (
              <Badge variant="success" className="absolute -right-1 -top-1 text-xs">완료</Badge>
            )}
          </Button>
          <Button
            variant={proofType === 'AFTER' ? 'default' : 'outline'}
            size="xl"
            onClick={() => setProofType('AFTER')}
            disabled={hasAfterProof || status === 'uploading'}
            className="relative"
          >
            배송 증빙
            {hasAfterProof && (
              <Badge variant="success" className="absolute -right-1 -top-1 text-xs">완료</Badge>
            )}
          </Button>
        </div>
      </div>

      {/* v1.1: Compression progress */}
      {isCompressing && (
        <Card role="status" aria-live="polite">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <ImageIcon className="h-5 w-5 animate-pulse text-primary" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium">이미지 최적화 중...</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${compressionProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {previewUrl && !isCompressing && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <img
              src={previewUrl}
              alt="preview"
              className="w-full object-cover"
            />
            <div className="border-t p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  파일: {file?.name}
                </p>
                <Badge variant="outline" className="text-xs">
                  {formatFileSize(file?.size || 0)}
                </Badge>
              </div>
              {/* v1.1: Compression result info */}
              {compressionResult && compressionResult.wasCompressed && (
                <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  <span>
                    {formatFileSize(compressionResult.originalSize)} → {formatFileSize(compressionResult.compressedSize)}
                    {' '}({getCompressionPercentage(compressionResult)}% 절감)
                  </span>
                </div>
              )}
              {compressionResult && compressionResult.wasConverted && (
                <div className="mt-1 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                  <ImageIcon className="h-3 w-3" />
                  <span>HEIC → JPEG 변환됨</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!file && !allDone && !isCompressing && (
        <Button size="xl" className="w-full touch-target" onClick={openCamera}>
          <Camera className="mr-2 h-5 w-5" />
          카메라 열기
        </Button>
      )}

      {allDone && !file && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950" role="status">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600" aria-hidden="true" />
            <p className="text-lg font-semibold text-green-800 dark:text-green-200">모든 증빙 완료</p>
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">배송 증빙 사진이 모두 업로드되었습니다.</p>
            <Button className="mt-4" asChild>
              <a href={`/p/${token}`}>결과 확인하기</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* v1.0.1: Offline indicator */}
      {!networkStatus.isOnline && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <WifiOff className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-medium">오프라인 상태입니다</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* v1.0.1: Slow network warning */}
      {networkStatus.isOnline && isSlowNetwork(networkStatus) && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="py-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              네트워크 속도가 느립니다. 업로드에 시간이 걸릴 수 있습니다.
            </p>
          </CardContent>
        </Card>
      )}

      {file && (
        <div className="grid gap-2">
          {/* v1.0.1: Upload progress bar */}
          {status === 'uploading' && (
            <Card className="mb-2" role="status" aria-live="polite">
              <CardContent className="py-4">
                <UploadProgress
                  percent={uploadProgress}
                  status={progressStatus}
                  retryAttempt={retryAttempt}
                  maxRetries={3}
                />
              </CardContent>
            </Card>
          )}

          <Button
            size="xl"
            className="w-full touch-target"
            onClick={upload}
            disabled={status === 'uploading' || !networkStatus.isOnline || isCompressing}
          >
            {status === 'uploading' ? (
              <>
                <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                업로드 중… {uploadProgress}%
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                {PROOF_TYPE_LABELS[proofType]} 업로드
              </>
            )}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="lg"
              onClick={openCamera}
              disabled={status === 'uploading' || isCompressing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 촬영
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={clear}
              disabled={status === 'uploading' || isCompressing}
            >
              <X className="mr-2 h-4 w-4" />
              초기화
            </Button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <Card className="border-destructive bg-destructive/10" role="alert" aria-live="assertive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-semibold text-destructive">업로드 실패</p>
                <p className="mt-1 text-sm text-destructive/80">{errorMessage}</p>
                {/* v1.0.1: Save for later option */}
                {file && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleSaveForLater}
                  >
                    <CloudOff className="mr-2 h-4 w-4" />
                    나중에 업로드
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* v1.0.1: Pending uploads indicator */}
      {hasPending && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  대기 중인 업로드: {pendingUploads.length}건
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={syncPendingUploads}
                disabled={!networkStatus.isOnline || isSyncing}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                    동기화 중...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-3 w-3" />
                    지금 업로드
                  </>
                )}
              </Button>
            </div>
            {!networkStatus.isOnline && (
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                인터넷 연결 시 자동으로 업로드됩니다.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-center text-sm text-muted-foreground">
        팁: 상품 전체가 잘 보이도록 촬영해주세요. 배송 증빙이 명확해집니다.
      </p>
    </div>
  );
};
