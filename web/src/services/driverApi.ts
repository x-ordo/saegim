const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

const DRIVER_TOKEN_KEY = 'driver_token';
const DRIVER_INFO_KEY = 'driver_info';

export type DriverInfo = {
  token: string;
  expires_at: string;
  courier_id: number;
  courier_name: string;
  organization_id: number;
  organization_name: string;
};

export type DriverMe = {
  courier_id: number;
  name: string;
  phone_masked?: string | null;
  vehicle_number?: string | null;
  organization_id: number;
  organization_name: string;
};

export type DeliveryOrder = {
  id: number;
  order_number: string;
  context?: string | null;
  sender_name: string;
  recipient_name?: string | null;
  status: string;
  has_proof: boolean;
  proof_count: number;
  created_at: string;
};

export type DeliveryListResponse = {
  items: DeliveryOrder[];
  total: number;
  pending_count: number;
  in_progress_count: number;
  completed_count: number;
};

export type ProofItem = {
  id: number;
  proof_type: string;
  file_url: string;
  uploaded_at: string;
};

export type DeliveryDetail = {
  id: number;
  order_number: string;
  context?: string | null;
  sender_name: string;
  recipient_name?: string | null;
  status: string;
  token?: string | null;
  upload_url?: string | null;
  proofs: ProofItem[];
  created_at: string;
  updated_at?: string | null;
};

export type UploadHistoryItem = {
  order_id: number;
  order_number: string;
  context?: string | null;
  proof_id: number;
  proof_type: string;
  file_url: string;
  uploaded_at: string;
};

export type UploadHistoryResponse = {
  items: UploadHistoryItem[];
  total: number;
};

// Token management
export const saveDriverSession = (info: DriverInfo): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DRIVER_TOKEN_KEY, info.token);
    localStorage.setItem(DRIVER_INFO_KEY, JSON.stringify(info));
  }
};

export const getDriverToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DRIVER_TOKEN_KEY);
};

export const getDriverInfo = (): DriverInfo | null => {
  if (typeof window === 'undefined') return null;
  const info = localStorage.getItem(DRIVER_INFO_KEY);
  if (!info) return null;
  try {
    return JSON.parse(info);
  } catch {
    return null;
  }
};

export const clearDriverSession = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DRIVER_TOKEN_KEY);
    localStorage.removeItem(DRIVER_INFO_KEY);
  }
};

export const isSessionValid = (): boolean => {
  const info = getDriverInfo();
  if (!info) return false;
  const expiresAt = new Date(info.expires_at);
  return expiresAt > new Date();
};

// API helpers
const headers = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

// API calls
export const driverLogin = async (
  phone: string,
  pin: string
): Promise<DriverInfo> => {
  const res = await fetch(`${API_BASE_URL}/driver/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, pin }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Login failed');
  }
  const data: DriverInfo = await res.json();
  saveDriverSession(data);
  return data;
};

export const driverLogout = async (): Promise<void> => {
  const token = getDriverToken();
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/driver/auth/logout`, {
        method: 'POST',
        headers: headers(token),
      });
    } catch {
      // Ignore errors on logout
    }
  }
  clearDriverSession();
};

export const getDriverMe = async (): Promise<DriverMe> => {
  const token = getDriverToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/driver/me`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const listDeliveries = async (params?: {
  today_only?: boolean;
  status?: string;
}): Promise<DeliveryListResponse> => {
  const token = getDriverToken();
  if (!token) throw new Error('Not authenticated');

  const qs = new URLSearchParams();
  if (params?.today_only !== undefined) qs.set('today_only', String(params.today_only));
  if (params?.status) qs.set('status', params.status);

  const url = `${API_BASE_URL}/driver/deliveries${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getDeliveryDetail = async (orderId: number): Promise<DeliveryDetail> => {
  const token = getDriverToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/driver/deliveries/${orderId}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getDeliveryByToken = async (qrToken: string): Promise<DeliveryDetail> => {
  const token = getDriverToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/driver/deliveries/token/${qrToken}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getUploadHistory = async (limit?: number): Promise<UploadHistoryResponse> => {
  const token = getDriverToken();
  if (!token) throw new Error('Not authenticated');

  const qs = limit ? `?limit=${limit}` : '';
  const res = await fetch(`${API_BASE_URL}/driver/history${qs}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
