import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getProofByToken, ProofData } from '../../services/api';

/**
 * Public Proof Page
 * Shows proof photo with minimal order context (no PII).
 * Accessible without login via token URL.
 */
const PublicProofPage = () => {
  const router = useRouter();
  const { token } = router.query;
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof token === 'string') {
      setIsLoading(true);
      setError(null);

      getProofByToken(token)
        .then(data => {
          if (data) {
            setProofData(data);
          } else {
            setError('유효하지 않은 링크입니다.');
          }
        })
        .catch((err) => {
          if (err.message === 'RATE_LIMITED') {
            setError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
          } else {
            setError('증빙 정보를 불러오는데 실패했습니다.');
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="proof-page">
        <h1>로딩 중...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="proof-page">
        <h1>오류</h1>
        <p>{error}</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="proof-page">
      <style jsx>{`
        .proof-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem 1rem;
          text-align: center;
        }
        .org-logo {
          max-width: 120px;
          margin-bottom: 1rem;
        }
        .org-name {
          color: #666;
          font-size: 1rem;
          margin-bottom: 1.5rem;
        }
        .order-info {
          margin-bottom: 1.5rem;
        }
        .order-number {
          font-size: 1.1rem;
          color: #333;
        }
        .context {
          color: #666;
          margin-top: 0.5rem;
        }
        .proof-image {
          max-width: 100%;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 1rem;
        }
        .timestamp {
          color: #888;
          font-size: 0.9rem;
        }
        .success-badge {
          display: inline-block;
          background: #4CAF50;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
      `}</style>

      {proofData?.organization_logo && (
        <img
          src={proofData.organization_logo}
          alt={proofData.organization_name}
          className="org-logo"
        />
      )}

      <h1 className="org-name">{proofData?.organization_name}</h1>

      <div className="success-badge">배송 완료</div>

      <div className="order-info">
        <p className="order-number">주문번호: {proofData?.order_number}</p>
        {proofData?.context && <p className="context">{proofData.context}</p>}
      </div>

      {proofData?.proof_url && (
        <img
          src={proofData.proof_url.startsWith('http') ? proofData.proof_url : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}${proofData.proof_url}`}
          alt="배송 증빙 사진"
          className="proof-image"
        />
      )}

      {proofData?.uploaded_at && (
        <p className="timestamp">
          {formatDate(proofData.uploaded_at)}
        </p>
      )}
    </div>
  );
};

export default PublicProofPage;
