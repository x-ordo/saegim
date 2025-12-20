const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

// Types
export type ProofType = 'BEFORE' | 'AFTER' | 'RECEIPT' | 'DAMAGE' | 'OTHER';

export interface AssetMeta {
  brand?: string;
  model?: string;
  serial?: string;
  material?: string;
  color?: string;
  repair_type?: string;
  repair_note?: string;
  purchase_date?: string;
  estimated_value?: number;
}

export interface ProofItem {
  id: number;
  proof_type: ProofType;
  proof_url: string;
  uploaded_at: string;
}

export interface OrderSummary {
  order_number: string;
  context: string | null;
  organization_name: string;
  organization_logo: string | null;
  hide_saegim: boolean;
  asset_meta?: AssetMeta;
  has_before_proof: boolean;
  has_after_proof: boolean;
}

export interface ProofData {
  order_number: string;
  context: string | null;
  organization_name: string;
  organization_logo: string | null;
  hide_saegim: boolean;
  asset_meta?: AssetMeta;
  proofs: ProofItem[];
  // Backward compatibility
  proof_url?: string;
  uploaded_at?: string;
}

export interface UploadResponse {
  status: string;
  proof_id: number;
  proof_type: ProofType;
  message: string;
}

export interface ShortResolveResponse {
  code: string;
  target_url: string;
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
 * Upload proof with type (BEFORE, AFTER, RECEIPT, DAMAGE, OTHER)
 */
export const uploadProof = async (
  token: string,
  file: File,
  proofType: ProofType = 'AFTER'
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_BASE_URL}/public/proof/${token}/upload?proof_type=${proofType}`,
    {
      method: 'POST',
      body: formData,
    }
  );

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

/**
 * Resolve a short code to a full public proof URL
 */
export const resolveShortCode = async (code: string): Promise<ShortResolveResponse | null> => {
  const res = await fetch(`${API_BASE_URL}/public/s/${encodeURIComponent(code)}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to resolve short link');
  }
  return res.json();
};
