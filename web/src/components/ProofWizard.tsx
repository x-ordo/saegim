/**
 * ProofWizard - Streamlined BEFORE/AFTER proof upload flow
 * 스트림라인 배송 증빙 업로드 플로우
 *
 * Flow: BEFORE → auto-advance → AFTER → complete
 * Target: Complete in under 30 seconds
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { uploadProofWithProgress, ProofType } from '../services/api';
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
  CloudOff,
  Cloud,
  ImageIcon,
  ChevronRight,
  ArrowRight,
  SkipForward,
} from 'lucide-react';
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

interface ProofWizardProps {
  token: string;
  hasBeforeProof?: boolean;
  hasAfterProof?: boolean;
  onComplete?: () => void;
}

type WizardStep = 'before' | 'after' | 'complete';
type StepStatus = 'idle' | 'ready' | 'compressing' | 'uploading' | 'success' | 'error';

interface StepState {
  file: File | null;
  previewUrl: string | null;
  status: StepStatus;
  progress: number;
  progressStatus: UploadProgressStatus;
  compressionResult: CompressionResult | null;
  errorMessage: string;
  retryAttempt: number;
}

const initialStepState: StepState = {
  file: null,
  previewUrl: null,
  status: 'idle',
  progress: 0,
  progressStatus: 'preparing',
  compressionResult: null,
  errorMessage: '',
  retryAttempt: 0,
};

const normalizeError = (msg: string) => {
  if (!msg) return '업로드에 실패했습니다. 다시 시도해주세요.';
  if (msg.includes('RATE_LIMITED')) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if (msg.toLowerCase().includes('already uploaded')) return '이미 업로드 완료된 항목입니다.';
  if (msg.includes('NETWORK_ERROR')) return '네트워크 오류가 발생했습니다. 연결 상태를 확인해주세요.';
  if (msg.includes('TIMEOUT')) return '업로드 시간이 초과되었습니다. 다시 시도해주세요.';
  return msg;
};

export const ProofWizard = ({
  token,
  hasBeforeProof = false,
  hasAfterProof = false,
  onComplete,
}: ProofWizardProps) => {
  // Determine initial step based on existing proofs
  const getInitialStep = (): WizardStep => {
    if (hasBeforeProof && hasAfterProof) return 'complete';
    if (hasBeforeProof) return 'after';
    return 'before';
  };

  const [currentStep, setCurrentStep] = useState<WizardStep>(getInitialStep);
  const [beforeState, setBeforeState] = useState<StepState>({
    ...initialStepState,
    status: hasBeforeProof ? 'success' : 'idle',
  });
  const [afterState, setAfterState] = useState<StepState>({
    ...initialStepState,
    status: hasAfterProof ? 'success' : 'idle',
  });

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const networkStatus = useNetworkStatus();

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      if (beforeState.previewUrl) URL.revokeObjectURL(beforeState.previewUrl);
      if (afterState.previewUrl) URL.revokeObjectURL(afterState.previewUrl);
    };
  }, [beforeState.previewUrl, afterState.previewUrl]);

  // File selection and compression handler
  const handleFileSelect = useCallback(
    async (
      event: React.ChangeEvent<HTMLInputElement>,
      step: 'before' | 'after'
    ) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const setState = step === 'before' ? setBeforeState : setAfterState;

      // Validate file type
      if (!file.type.startsWith('image/') && !isHeicFile(file)) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: '이미지 파일만 업로드할 수 있습니다.',
        }));
        return;
      }

      // Start compression
      setState((prev) => ({
        ...prev,
        status: 'compressing',
        progress: 0,
        errorMessage: '',
        compressionResult: null,
      }));

      try {
        const result = await compressImage(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          onProgress: (p) => setState((prev) => ({ ...prev, progress: p })),
        });

        const previewUrl = URL.createObjectURL(result.file);

        setState((prev) => ({
          ...prev,
          file: result.file,
          previewUrl,
          status: 'ready',
          compressionResult: result,
        }));
      } catch (error) {
        console.error('Compression failed:', error);
        const previewUrl = URL.createObjectURL(file);
        setState((prev) => ({
          ...prev,
          file,
          previewUrl,
          status: 'ready',
          compressionResult: null,
        }));
      }
    },
    []
  );

  // Upload handler
  const handleUpload = useCallback(
    async (step: 'before' | 'after') => {
      const state = step === 'before' ? beforeState : afterState;
      const setState = step === 'before' ? setBeforeState : setAfterState;
      const proofType: ProofType = step === 'before' ? 'BEFORE' : 'AFTER';

      if (!state.file) return;

      if (!networkStatus.isOnline) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: '인터넷 연결이 없습니다.',
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        status: 'uploading',
        progress: 0,
        progressStatus: 'uploading',
        retryAttempt: 0,
      }));

      try {
        await retryWithBackoff(
          async () => {
            setState((prev) => ({ ...prev, progressStatus: 'uploading' }));
            await uploadProofWithProgress(
              token,
              state.file!,
              proofType,
              (p) => setState((prev) => ({ ...prev, progress: p }))
            );
          },
          { maxRetries: 3 },
          (attempt) => {
            setState((prev) => ({
              ...prev,
              retryAttempt: attempt,
              progressStatus: 'retrying',
              progress: 0,
            }));
          }
        );

        setState((prev) => ({
          ...prev,
          status: 'success',
          progressStatus: 'processing',
          progress: 100,
        }));

        // Auto-advance logic
        if (step === 'before') {
          // Move to AFTER step after short delay
          setTimeout(() => {
            setCurrentStep('after');
          }, 800);
        } else {
          // Complete the wizard
          setTimeout(() => {
            setCurrentStep('complete');
            onComplete?.();
          }, 800);
        }
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: normalizeError(error?.message || ''),
        }));
      }
    },
    [beforeState, afterState, token, networkStatus.isOnline, onComplete]
  );

  // Skip BEFORE and go directly to AFTER
  const skipBefore = useCallback(() => {
    setCurrentStep('after');
  }, []);

  // Clear current step
  const clearStep = useCallback((step: 'before' | 'after') => {
    const setState = step === 'before' ? setBeforeState : setAfterState;
    const inputRef = step === 'before' ? beforeInputRef : afterInputRef;

    setState(initialStepState);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  // Retake photo
  const retake = useCallback((step: 'before' | 'after') => {
    const inputRef = step === 'before' ? beforeInputRef : afterInputRef;
    inputRef.current?.click();
  }, []);

  // Render step content
  const renderStepContent = (step: 'before' | 'after') => {
    const state = step === 'before' ? beforeState : afterState;
    const inputRef = step === 'before' ? beforeInputRef : afterInputRef;
    const stepLabel = step === 'before' ? '상품 사진' : '배송 증빙';
    const stepNumber = step === 'before' ? 1 : 2;
    const isActive = currentStep === step;

    if (state.status === 'success' && !isActive) {
      return (
        <div className="flex items-center gap-2 text-green-600" role="status">
          <CheckCircle className="h-5 w-5" aria-hidden="true" />
          <span className="font-medium">{stepLabel} 완료</span>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFileSelect(e, step)}
          ref={inputRef}
          className="hidden"
          aria-label={`${stepLabel} 사진 파일 선택`}
        />

        {/* Compression progress */}
        {state.status === 'compressing' && (
          <Card role="status" aria-live="polite">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <ImageIcon className="h-5 w-5 animate-pulse text-primary" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm font-medium">이미지 최적화 중...</p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {state.previewUrl && state.status !== 'compressing' && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <img
                src={state.previewUrl}
                alt={stepLabel}
                className="w-full object-cover"
              />
              <div className="border-t p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stepLabel} 사진</span>
                  <Badge variant="outline">{formatFileSize(state.file?.size || 0)}</Badge>
                </div>
                {state.compressionResult?.wasCompressed && (
                  <p className="mt-1 text-xs text-green-600">
                    {getCompressionPercentage(state.compressionResult)}% 압축됨
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload progress */}
        {state.status === 'uploading' && (
          <UploadProgress
            percent={state.progress}
            status={state.progressStatus}
            retryAttempt={state.retryAttempt}
          />
        )}

        {/* Error message */}
        {state.status === 'error' && (
          <Card className="border-destructive bg-destructive/10" role="alert" aria-live="assertive">
            <CardContent className="py-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                <p className="text-sm text-destructive">{state.errorMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        {state.status === 'idle' && (
          <Button
            size="xl"
            className="w-full"
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="mr-2 h-5 w-5" />
            {stepLabel} 사진 촬영
          </Button>
        )}

        {state.status === 'ready' && (
          <div className="space-y-2">
            <Button
              size="xl"
              className="w-full"
              onClick={() => handleUpload(step)}
              disabled={!networkStatus.isOnline}
            >
              <Upload className="mr-2 h-5 w-5" />
              {stepLabel} 업로드
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="lg" onClick={() => retake(step)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                다시 촬영
              </Button>
              <Button variant="ghost" size="lg" onClick={() => clearStep(step)}>
                <X className="mr-2 h-4 w-4" />
                취소
              </Button>
            </div>
          </div>
        )}

        {(state.status === 'error') && state.file && (
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" onClick={() => handleUpload(step)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 시도
            </Button>
            <Button variant="secondary" size="lg" onClick={() => retake(step)}>
              <Camera className="mr-2 h-4 w-4" />
              다시 촬영
            </Button>
          </div>
        )}

        {state.status === 'success' && (
          <div className="flex items-center justify-center gap-2 py-4 text-green-600" role="status" aria-live="polite">
            <CheckCircle className="h-6 w-6" aria-hidden="true" />
            <span className="text-lg font-semibold">{stepLabel} 업로드 완료!</span>
          </div>
        )}
      </div>
    );
  };

  // Complete screen
  if (currentStep === 'complete') {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950" role="status" aria-live="polite">
        <CardContent className="py-8 text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-600" aria-hidden="true" />
          <h2 className="text-xl font-bold text-green-800 dark:text-green-200">
            증빙 업로드 완료!
          </h2>
          <p className="mt-2 text-green-600 dark:text-green-400">
            고객에게 확인 링크가 전달됩니다.
          </p>
          <Button className="mt-6" asChild>
            <a href={`/p/${token}`}>결과 확인하기</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Offline warning
  if (!networkStatus.isOnline) {
    return (
      <Card className="border-amber-200 bg-amber-50" role="alert" aria-live="assertive">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <WifiOff className="h-6 w-6 text-amber-600" aria-hidden="true" />
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

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <nav aria-label="증빙 업로드 진행 단계" className="flex items-center justify-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            currentStep === 'before' || beforeState.status === 'success'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
          aria-current={currentStep === 'before' ? 'step' : undefined}
          aria-label={`1단계 상품 사진${beforeState.status === 'success' ? ' 완료' : currentStep === 'before' ? ' 진행 중' : ''}`}
        >
          {beforeState.status === 'success' ? <CheckCircle className="h-4 w-4" aria-hidden="true" /> : '1'}
        </div>
        <div className="h-0.5 w-8 bg-muted" aria-hidden="true" />
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            currentStep === 'after' || afterState.status === 'success'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
          aria-current={currentStep === 'after' ? 'step' : undefined}
          aria-label={`2단계 배송 증빙${afterState.status === 'success' ? ' 완료' : currentStep === 'after' ? ' 진행 중' : ''}`}
        >
          {afterState.status === 'success' ? <CheckCircle className="h-4 w-4" aria-hidden="true" /> : '2'}
        </div>
      </nav>

      {/* Step title */}
      <div className="text-center" aria-live="polite">
        <h3 className="text-lg font-semibold">
          {currentStep === 'before' ? 'Step 1: 상품 사진' : 'Step 2: 배송 증빙'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {currentStep === 'before'
            ? '배송할 상품을 촬영해주세요'
            : '배송 완료된 상품을 촬영해주세요'}
        </p>
      </div>

      {/* Slow network warning */}
      {isSlowNetwork(networkStatus) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-2">
            <p className="text-xs text-amber-700">
              네트워크 속도가 느립니다. 업로드에 시간이 걸릴 수 있습니다.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current step content */}
      {renderStepContent(currentStep)}

      {/* Skip before option */}
      {currentStep === 'before' && beforeState.status === 'idle' && (
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={skipBefore}
        >
          <SkipForward className="mr-2 h-4 w-4" />
          상품 사진 건너뛰기
        </Button>
      )}
    </div>
  );
};
