import { useEffect, useMemo, useRef, useState } from 'react';
import { uploadProof, ProofType } from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Camera, Upload, RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react';

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

    setStatus('uploading');
    setErrorMessage('');
    try {
      await uploadProof(token, file, proofType);
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

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        ref={fileInputRef}
        className="hidden"
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
