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

export interface PresignedUploadResponse {
  upload_url: string;
  fields: Record<string, string>;
  file_key: string;
  expires_in: number;
  confirm_url: string;
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
 * Get presigned URL for S3 upload
 */
export const getPresignedUpload = async (
  token: string,
  filename: string,
  contentType: string,
  proofType: ProofType = 'AFTER'
): Promise<PresignedUploadResponse> => {
  const response = await fetch(`${API_BASE_URL}/public/proof/${token}/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename,
      content_type: contentType,
      proof_type: proofType,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('RATE_LIMITED');
    const errorData = await response.json().catch(() => ({ detail: 'Failed to get upload URL' }));
    throw new Error(errorData.detail || 'Failed to get presigned URL');
  }

  return response.json();
};

/**
 * Upload file directly to presigned URL (S3)
 */
export const uploadToPresigned = async (
  presigned: PresignedUploadResponse,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> => {
  const formData = new FormData();

  // Add all presigned fields first
  Object.entries(presigned.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  // Add file last
  formData.append('file', file);

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.open('POST', presigned.upload_url);
    xhr.send(formData);
  });
};

/**
 * Confirm upload completion
 */
export const confirmUpload = async (
  token: string,
  fileKey: string,
  proofType: ProofType = 'AFTER'
): Promise<UploadResponse> => {
  const response = await fetch(`${API_BASE_URL}/public/proof/${token}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_key: fileKey,
      proof_type: proofType,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('RATE_LIMITED');
    const errorData = await response.json().catch(() => ({ detail: 'Failed to confirm upload' }));
    throw new Error(errorData.detail || 'Failed to confirm upload');
  }

  return response.json();
};

/**
 * Upload proof with type - uses presigned URL
 */
export const uploadProof = async (
  token: string,
  file: File,
  proofType: ProofType = 'AFTER',
  onProgress?: (percent: number) => void
): Promise<UploadResponse> => {
  // Get presigned URL
  const presigned = await getPresignedUpload(token, file.name, file.type, proofType);

  // Upload to S3 (or local storage endpoint)
  await uploadToPresigned(presigned, file, onProgress);

  // Confirm upload
  return confirmUpload(token, presigned.file_key, proofType);
};

/**
 * Direct upload to server (fallback for local storage)
 * @deprecated Use presigned URL upload instead. This endpoint will be removed.
 */
export const uploadProofDirect = async (
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

export interface UploadProgressCallback {
  (percent: number): void;
}

/**
 * Upload proof with progress tracking (presigned URL)
 * 진행률 추적을 지원하는 업로드 함수 (Presigned URL 기반)
 *
 * Flow: getPresignedUpload → uploadToPresigned (S3) → confirmUpload
 */
export const uploadProofWithProgress = async (
  token: string,
  file: File,
  proofType: ProofType = 'AFTER',
  onProgress?: UploadProgressCallback,
): Promise<UploadResponse> => {
  // Step 1: Get presigned URL
  const presigned = await getPresignedUpload(token, file.name, file.type, proofType);

  // Step 2: Upload to S3 (or local storage endpoint)
  await uploadToPresigned(presigned, file, onProgress);

  // Step 3: Confirm upload
  return confirmUpload(token, presigned.file_key, proofType);
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
