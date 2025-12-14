import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { UploadForm } from '../../components/UploadForm';

// Mock function to get order details based on token
// In a real app, this would be a fetch call to the backend
const getOrderDetails = async (token: string) => {
  if (token === 'abcdef123456') {
    return { orderNumber: 'SAEGIM-001', context: 'Flower Basket' };
  }
  return null;
};

const ProofPage = () => {
  const router = useRouter();
  const { token } = router.query;
  const [order, setOrder] = useState<{ orderNumber: string; context: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof token === 'string') {
      getOrderDetails(token)
        .then(data => {
            if(data){
                setOrder(data);
                setIsValidToken(true);
            } else {
                setIsValidToken(false);
                setError('Invalid or expired token.');
            }
        })
        .catch(() => {
            setIsValidToken(false);
            setError('Failed to fetch order details.')
        });
    }
  }, [token]);

  if (isValidToken === null) {
    return <div className="container"><h1>Loading...</h1></div>;
  }

  if (!isValidToken) {
    return <div className="container"><h1>Error</h1><p>{error}</p></div>;
  }

  return (
    <div className="container">
      <h1>Proof of Delivery</h1>
      {order && (
        <div>
          <h2>Order: {order.orderNumber}</h2>
          <p>Details: {order.context}</p>
        </div>
      )}
      <UploadForm token={token as string} />
    </div>
  );
};

export default ProofPage;
