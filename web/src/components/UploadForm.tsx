import { useEffect, useMemo, useRef, useState } from 'react';
import { uploadProof, ProofType } from '../services/api';

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
      <div className="ok">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>업로드 완료</div>
        <div className="muted">확인 페이지로 이동합니다…</div>
        <div style={{ marginTop: 10 }}>
          <a className="btn secondary" href={`/p/${token}`}>확인 페이지 열기</a>
        </div>
      </div>
    );
  }

  // Check if both main proofs are done
  const allDone = hasBeforeProof && hasAfterProof;

  return (
    <div className="stack">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />

      {/* Proof Type Selector */}
      <div>
        <div className="label">증빙 유형</div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button
            className={`btn ${proofType === 'BEFORE' ? '' : 'secondary'}`}
            onClick={() => setProofType('BEFORE')}
            disabled={hasBeforeProof || status === 'uploading'}
            style={{ flex: 1, minWidth: 80 }}
          >
            수선 전 {hasBeforeProof && '(완료)'}
          </button>
          <button
            className={`btn ${proofType === 'AFTER' ? '' : 'secondary'}`}
            onClick={() => setProofType('AFTER')}
            disabled={hasAfterProof || status === 'uploading'}
            style={{ flex: 1, minWidth: 80 }}
          >
            수선 후 {hasAfterProof && '(완료)'}
          </button>
        </div>
      </div>

      {previewUrl && (
        <div>
          <div className="label">미리보기</div>
          <img
            src={previewUrl}
            alt="preview"
            style={{ width: '100%', borderRadius: 16, border: '1px solid var(--line)' }}
          />
          <div className="muted" style={{ marginTop: 8 }}>
            파일: {file?.name} ({Math.round((file?.size || 0) / 1024)}KB)
          </div>
        </div>
      )}

      {!file && !allDone && (
        <button className="btn" onClick={openCamera}>
          카메라 열기
        </button>
      )}

      {allDone && !file && (
        <div className="ok">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>모든 증빙 완료</div>
          <div className="muted">수선 전/후 사진이 모두 업로드되었습니다.</div>
          <div style={{ marginTop: 10 }}>
            <a className="btn" href={`/p/${token}`}>결과 확인하기</a>
          </div>
        </div>
      )}

      {file && (
        <div className="row">
          <button className="btn" onClick={upload} disabled={status === 'uploading'}>
            {status === 'uploading' ? '업로드 중…' : `${PROOF_TYPE_LABELS[proofType]} 업로드`}
          </button>
          <button className="btn secondary" onClick={openCamera} disabled={status === 'uploading'}>
            다시 촬영
          </button>
          <button className="btn ghost" onClick={clear} disabled={status === 'uploading'}>
            초기화
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="danger">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>업로드 실패</div>
          <div>{errorMessage}</div>
        </div>
      )}

      <div className="muted">
        팁: 제품 전체가 잘 보이도록 촬영해주세요. 수선 전/후 비교가 명확해집니다.
      </div>
    </div>
  );
};
