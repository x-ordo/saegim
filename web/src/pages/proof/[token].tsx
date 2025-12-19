import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { UploadForm } from '../../components/UploadForm';
import { getOrderByToken, OrderSummary } from '../../services/api';

const ProofPage = () => {
  const router = useRouter();
  const { token } = router.query;
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof token === 'string') {
      setIsLoading(true);
      setError(null);

      getOrderByToken(token)
        .then(data => {
          if (data) {
            setOrder(data);
          } else {
            setError('유효하지 않거나 만료된 토큰입니다.');
          }
        })
        .catch((err) => {
          if (err.message === 'RATE_LIMITED') {
            setError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
          } else {
            setError('주문 정보를 불러오는데 실패했습니다.');
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="container">
        <h1>로딩 중...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1>오류</h1>
        <p>{error}</p>
        <p style={{ marginTop: '1rem', color: '#666' }}>
          문제가 계속되면 업체에 문의해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      {order?.organization_logo && (
        <img
          src={order.organization_logo}
          alt={order.organization_name}
          style={{ maxWidth: '150px', marginBottom: '1rem' }}
        />
      )}
      <h1>배송 증빙</h1>
      {order && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2>주문번호: {order.order_number}</h2>
          {order.context && <p>{order.context}</p>}
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            {order.organization_name}
          </p>
        </div>
      )}
      <UploadForm token={token as string} />
    </div>
  );
};

export default ProofPage;
