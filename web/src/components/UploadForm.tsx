import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { uploadProof, ProofType } from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Camera, Upload, RefreshCw, X, CheckCircle, AlertCircle, WifiOff, Settings } from 'lucide-react';

interface UploadFormProps {
  token: string;
  hasBeforeProof?: boolean;
  hasAfterProof?: boolean;
}

type UploadStatus = 'idle' | 'ready' | 'uploading' | 'success' | 'error';

// LocalStorage key for pending uploads
const PENDING_UPLOADS_KEY = 'saegim_pending_uploads';

interface PendingUpload {
  id: string;
  token: string;
  proofType: ProofType;
  fileData: string; // base64 encoded
  fileName: string;
  fileType: string;
  createdAt: number;
}

// Helper: Convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper: Convert base64 to File
const base64ToFile = (base64: string, fileName: string, fileType: string): File => {
  const arr = base64.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: fileType });
};

// Helper: Get pending uploads from LocalStorage
const getPendingUploads = (): PendingUpload[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(PENDING_UPLOADS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper: Save pending upload to LocalStorage
const savePendingUpload = async (token: string, proofType: ProofType, file: File): Promise<string> => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fileData = await fileToBase64(file);
  const pending: PendingUpload = {
    id,
    token,
    proofType,
    fileData,
    fileName: file.name,
    fileType: file.type,
    createdAt: Date.now(),
  };
  const existing = getPendingUploads();
  existing.push(pending);
  localStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(existing));
  return id;
};

// Helper: Remove pending upload from LocalStorage
const removePendingUpload = (id: string) => {
  const existing = getPendingUploads();
  const filtered = existing.filter(p => p.id !== id);
  localStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(filtered));
};

// Helper: Clear all pending uploads for a token
const clearPendingUploadsForToken = (token: string) => {
  const existing = getPendingUploads();
  const filtered = existing.filter(p => p.token !== token);
  localStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(filtered));
};

const normalizeError = (msg: string) => {
  if (!msg) return '업로드에 실패했습니다. 다시 시도해주세요.';
  if (msg.includes('RATE_LIMITED')) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if (msg.toLowerCase().includes('already uploaded')) return '이미 업로드 완료된 항목입니다.';
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
    return '네트워크 연결을 확인해주세요.';
  }
  return msg;
};

const PROOF_TYPE_LABELS: Record<ProofType, string> = {
  BEFORE: '수선 전',
  AFTER: '수선 후',
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

  // Online/Offline status
  const [isOnline, setIsOnline] = useState(true);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [retrying, setRetrying] = useState(false);

  // Camera permission status
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [showCameraHelp, setShowCameraHelp] = useState(false);

  // Check online status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending uploads for this token
  useEffect(() => {
    const pending = getPendingUploads().filter(p => p.token === token);
    setPendingUploads(pending);
  }, [token]);

  // Check camera permission
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) {
      setCameraPermission('unknown');
      return;
    }

    navigator.permissions.query({ name: 'camera' as PermissionName })
      .then((result) => {
        setCameraPermission(result.state as 'granted' | 'denied' | 'prompt');
        result.onchange = () => {
          setCameraPermission(result.state as 'granted' | 'denied' | 'prompt');
          if (result.state === 'granted') {
            setShowCameraHelp(false);
          }
        };
      })
      .catch(() => {
        setCameraPermission('unknown');
      });
  }, []);

  // Auto-retry pending uploads when back online
  const retryPendingUploads = useCallback(async () => {
    if (!isOnline || retrying || pendingUploads.length === 0) return;

    setRetrying(true);
    for (const pending of pendingUploads) {
      try {
        const file = base64ToFile(pending.fileData, pending.fileName, pending.fileType);
        await uploadProof(pending.token, file, pending.proofType);
        removePendingUpload(pending.id);
        setPendingUploads(prev => prev.filter(p => p.id !== pending.id));
      } catch (e) {
        // Keep in pending if still failing
        console.warn('Retry failed for pending upload:', pending.id, e);
      }
    }
    setRetrying(false);

    // Check if all done
    const remaining = getPendingUploads().filter(p => p.token === token);
    if (remaining.length === 0 && pendingUploads.length > 0) {
      setStatus('success');
      window.setTimeout(() => {
        window.location.href = `/p/${token}`;
      }, 650);
    }
  }, [isOnline, retrying, pendingUploads, token]);

  // Trigger retry when coming back online
  useEffect(() => {
    if (isOnline && pendingUploads.length > 0) {
      retryPendingUploads();
    }
  }, [isOnline, pendingUploads.length, retryPendingUploads]);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const openCamera = () => {
    // Check permission before opening camera
    if (cameraPermission === 'denied') {
      setShowCameraHelp(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleCameraError = () => {
    // Called when camera access fails
    setCameraPermission('denied');
    setShowCameraHelp(true);
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStatus('ready');
    setErrorMessage('');
  };

  const clear = () => {
    setFile(null);
    setStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const upload = async () => {
    if (!file) return;

    // If offline, save to LocalStorage for later retry
    if (!isOnline) {
      try {
        const id = await savePendingUpload(token, proofType, file);
        setPendingUploads(prev => [...prev, {
          id,
          token,
          proofType,
          fileData: '', // Don't need to store again
          fileName: file.name,
          fileType: file.type,
          createdAt: Date.now(),
        }]);
        setStatus('error');
        setErrorMessage('오프라인 상태입니다. 네트워크 연결 시 자동으로 업로드됩니다.');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (e) {
        setStatus('error');
        setErrorMessage('파일 저장에 실패했습니다. 다시 시도해주세요.');
      }
      return;
    }

    setStatus('uploading');
    setErrorMessage('');
    try {
      await uploadProof(token, file, proofType);
      // Clear any pending uploads for this token on success
      clearPendingUploadsForToken(token);
      setPendingUploads([]);
      setStatus('success');
      window.setTimeout(() => {
        window.location.href = `/p/${token}`;
      }, 650);
    } catch (e: any) {
      const msg = normalizeError(e?.message || String(e));

      // If network error, save for offline retry
      if (!navigator.onLine || msg.includes('네트워크')) {
        try {
          await savePendingUpload(token, proofType, file);
          const pending = getPendingUploads().filter(p => p.token === token);
          setPendingUploads(pending);
          setErrorMessage('네트워크 오류로 저장되었습니다. 연결 복구 시 자동 업로드됩니다.');
        } catch {
          setErrorMessage(msg);
        }
      } else {
        setErrorMessage(msg);
      }

      setStatus('error');

      // 이미 업로드된 경우는 확인 페이지로 바로 유도
      if (msg.includes('이미 업로드 완료')) {
        window.setTimeout(() => {
          window.location.href = `/p/${token}`;
        }, 650);
      }
    }
  };

  if (status === 'success') {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600" />
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

  // Detect iOS/Android for camera settings guidance
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        onError={handleCameraError}
        ref={fileInputRef}
        className="hidden"
      />

      {/* Offline Status Banner */}
      {!isOnline && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">오프라인 모드</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  촬영은 가능합니다. 네트워크 연결 시 자동으로 업로드됩니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Uploads Indicator */}
      {pendingUploads.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {retrying ? (
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                ) : (
                  <Upload className="h-5 w-5 text-blue-600" />
                )}
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    대기 중인 업로드 {pendingUploads.length}건
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {retrying ? '업로드 재시도 중…' : isOnline ? '업로드 준비 중' : '네트워크 연결 대기 중'}
                  </p>
                </div>
              </div>
              {isOnline && !retrying && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryPendingUploads}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  재시도
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera Permission Help Dialog */}
      {showCameraHelp && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Settings className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />
              <div className="flex-1">
                <p className="font-semibold text-orange-800 dark:text-orange-200">
                  카메라 권한이 필요합니다
                </p>
                <div className="mt-2 space-y-2 text-sm text-orange-700 dark:text-orange-300">
                  {isIOS ? (
                    <>
                      <p><strong>iOS 설정 방법:</strong></p>
                      <ol className="ml-4 list-decimal space-y-1">
                        <li>설정 앱 → Safari (또는 사용 중인 브라우저)</li>
                        <li>카메라 → 허용</li>
                        <li>이 페이지를 새로고침</li>
                      </ol>
                    </>
                  ) : isAndroid ? (
                    <>
                      <p><strong>Android 설정 방법:</strong></p>
                      <ol className="ml-4 list-decimal space-y-1">
                        <li>브라우저 설정 → 사이트 설정</li>
                        <li>카메라 → 허용</li>
                        <li>이 페이지를 새로고침</li>
                      </ol>
                    </>
                  ) : (
                    <>
                      <p>브라우저 주소창 왼쪽의 자물쇠 아이콘을 클릭하여 카메라 권한을 허용해주세요.</p>
                    </>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    새로고침
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCameraHelp(false)}
                    className="text-orange-600"
                  >
                    닫기
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            수선 전
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
            수선 후
            {hasAfterProof && (
              <Badge variant="success" className="absolute -right-1 -top-1 text-xs">완료</Badge>
            )}
          </Button>
        </div>
      </div>

      {previewUrl && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <img
              src={previewUrl}
              alt="preview"
              className="w-full object-cover"
            />
            <div className="border-t p-3">
              <p className="text-sm text-muted-foreground">
                파일: {file?.name} ({Math.round((file?.size || 0) / 1024)}KB)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!file && !allDone && (
        <Button size="xl" className="w-full touch-target" onClick={openCamera}>
          <Camera className="mr-2 h-5 w-5" />
          카메라 열기
        </Button>
      )}

      {allDone && !file && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600" />
            <p className="text-lg font-semibold text-green-800 dark:text-green-200">모든 증빙 완료</p>
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">수선 전/후 사진이 모두 업로드되었습니다.</p>
            <Button className="mt-4" asChild>
              <a href={`/p/${token}`}>결과 확인하기</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {file && (
        <div className="grid gap-2">
          <Button
            size="xl"
            className="w-full touch-target"
            onClick={upload}
            disabled={status === 'uploading'}
          >
            {status === 'uploading' ? (
              <>
                <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                업로드 중…
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
              disabled={status === 'uploading'}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 촬영
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={clear}
              disabled={status === 'uploading'}
            >
              <X className="mr-2 h-4 w-4" />
              초기화
            </Button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">업로드 실패</p>
                <p className="mt-1 text-sm text-destructive/80">{errorMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-sm text-muted-foreground">
        팁: 제품 전체가 잘 보이도록 촬영해주세요. 수선 전/후 비교가 명확해집니다.
      </p>
    </div>
  );
};
