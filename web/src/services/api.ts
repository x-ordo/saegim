const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Types
export interface OrderSummary {
  order_number: string;
  context: string | null;
  organization_name: string;
  organization_logo: string | null;
}

export interface ProofData {
  order_number: string;
  context: string | null;
  organization_name: string;
  organization_logo: string | null;
  proof_url: string;
  uploaded_at: string;
}

export interface UploadResponse {
  status: string;
  proof_id: number;
  message: string;
}

/**
 * Get order summary by token (for proof landing page)
 */
export const getOrderByToken = async (token: string): Promise<OrderSummary | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/public/order/${token}`);

    if (!response.ok) {
      if (response.status === 404) return null;
      if (response.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      throw new Error('Failed to fetch order');
    }

    return response.json();
  } catch (error) {
    console.error('getOrderByToken error:', error);
    throw error;
  }
};

/**
 * Upload proof of delivery
 */
export const uploadProof = async (token: string, file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/public/proof/${token}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
    throw new Error(errorData.detail || 'Failed to upload proof.');
  }

  return response.json();
};

/**
 * Get proof data (for public proof page)
 */
export const getProofByToken = async (token: string): Promise<ProofData | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/public/proof/${token}`);

    if (!response.ok) {
      if (response.status === 404) return null;
      if (response.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      throw new Error('Failed to fetch proof');
    }

    return response.json();
  } catch (error) {
    console.error('getProofByToken error:', error);
    throw error;
  }
};
