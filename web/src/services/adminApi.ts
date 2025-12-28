const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

const headers = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export type Organization = {
  id: number;
  name: string;
  plan_type: 'BASIC' | 'PRO';
  logo_url?: string | null;

  // white-label (public)
  brand_name?: string | null;
  brand_logo_url?: string | null;
  brand_domain?: string | null;
  hide_saegim?: boolean;

  // messaging templates (org override)
  msg_alimtalk_template_sender?: string | null;
  msg_alimtalk_template_recipient?: string | null;
  msg_sms_template_sender?: string | null;
  msg_sms_template_recipient?: string | null;
  msg_kakao_template_code?: string | null;
  msg_fallback_sms_enabled?: boolean | null;

  external_org_id?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type NotificationLog = {
  id: number;
  type: string;
  channel: string;
  status: string;
  phone_hash: string;
  provider_request_id?: string | null;
  message_url?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
  sent_at?: string | null;
};

export type Me = {
  sub: string;
  org_external_id?: string | null;
  org_role?: string | null;
  organization?: Organization | null;
};

export const getMe = async (token: string): Promise<Me> => {
  const res = await fetch(`${API_BASE_URL}/admin/me`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getOrgSettings = async (token: string): Promise<Organization> => {
  const res = await fetch(`${API_BASE_URL}/admin/org`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const updateOrgSettings = async (
  token: string,
  payload: Partial<Pick<Organization, 'name' | 'logo_url' | 'brand_name' | 'brand_logo_url' | 'brand_domain' | 'hide_saegim' | 'msg_alimtalk_template_sender' | 'msg_alimtalk_template_recipient' | 'msg_sms_template_sender' | 'msg_sms_template_recipient' | 'msg_kakao_template_code' | 'msg_fallback_sms_enabled'>>
): Promise<Organization> => {
  const res = await fetch(`${API_BASE_URL}/admin/org`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export type Order = {
  id: number;
  organization_id?: number;
  order_number: string;
  context?: string | null;
  sender_name: string;
  recipient_name?: string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
};

export type OrderDetail = {
  order: Order;
  organization: Pick<Organization, 'id' | 'name' | 'logo_url' | 'brand_name' | 'brand_logo_url' | 'brand_domain' | 'hide_saegim'>;
  token?: string | null;
  token_valid: boolean;
  upload_url?: string | null;
  public_proof_url?: string | null;
  short_public_url?: string | null;
  proof_url?: string | null;
  proof_uploaded_at?: string | null;
  notifications?: NotificationLog[];
};

export type Label = {
  order_id: number;
  order_number: string;
  context?: string | null;
  status: string;
  token: string;
  token_valid: boolean;
  upload_url: string;
  public_proof_url: string;
  organization_name: string;
  organization_logo?: string | null;
  hide_saegim?: boolean;
};

export const listOrganizations = async (token: string): Promise<Organization[]> => {
  const res = await fetch(`${API_BASE_URL}/admin/organizations`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const createOrganization = async (
  token: string,
  payload: {
    name: string;
    plan_type?: 'BASIC' | 'PRO';
    logo_url?: string | null;
    brand_name?: string | null;
    brand_logo_url?: string | null;
    brand_domain?: string | null;
    hide_saegim?: boolean;
  }
): Promise<Organization> => {
  const res = await fetch(`${API_BASE_URL}/admin/organizations`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const listOrders = async (
  token: string,
  params?: {
    organization_id?: number;
    q?: string;
    status?: string;
    day?: string; // YYYY-MM-DD (Asia/Seoul)
    today?: boolean;
  }
): Promise<Order[]> => {
  const qs = new URLSearchParams();
  if (params?.organization_id) qs.set('organization_id', String(params.organization_id));
  if (params?.q) qs.set('q', params.q);
  if (params?.status) qs.set('status', params.status);
  if (params?.day) qs.set('day', params.day);
  if (params?.today) qs.set('today', 'true');
  const url = `${API_BASE_URL}/admin/orders${qs.toString() ? `?${qs.toString()}` : ''}`;

  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export type CsvImportResult = {
  created_count: number;
  created_order_ids: number[];
  errors: { row: number; message: string }[];
};

export const importOrdersCsv = async (token: string, file: File, strict?: boolean): Promise<CsvImportResult> => {
  const form = new FormData();
  form.append('file', file);
  const url = `${API_BASE_URL}/admin/orders/import/csv${strict ? '?strict=true' : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const createOrder = async (
  token: string,
  payload: {
    organization_id?: number;
    order_number: string;
    context?: string | null;
    sender_name: string;
    sender_phone: string;
    recipient_name?: string | null;
    recipient_phone?: string | null;
  }
): Promise<Order> => {
  const res = await fetch(`${API_BASE_URL}/admin/orders`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getOrderDetail = async (token: string, orderId: number): Promise<OrderDetail> => {
  const res = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export type OrderUpdate = {
  order_number?: string;
  context?: string | null;
  sender_name?: string;
  sender_phone?: string;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  status?: string;
};

export const updateOrder = async (
  token: string,
  orderId: number,
  payload: OrderUpdate
): Promise<Order> => {
  const res = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const deleteOrder = async (token: string, orderId: number): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
};

export const issueToken = async (
  token: string,
  orderId: number,
  force?: boolean
): Promise<{
  token: string;
  token_valid: boolean;
  upload_url: string;
  public_proof_url: string;
}> => {
  const url = `${API_BASE_URL}/admin/orders/${orderId}/token${force ? '?force=true' : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const resendNotify = async (token: string, orderId: number): Promise<{ status: string }> => {
  const res = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/notify`, {
    method: 'POST',
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getLabels = async (
  token: string,
  payload: { order_ids: number[]; ensure_tokens?: boolean; force?: boolean }
): Promise<Label[]> => {
  const res = await fetch(`${API_BASE_URL}/admin/orders/labels`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      order_ids: payload.order_ids,
      ensure_tokens: payload.ensure_tokens ?? true,
      force: payload.force ?? false,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ---------------------------
// Products API
// ---------------------------
export type ProductCategory = {
  id: number;
  organization_id: number;
  name: string;
  parent_id?: number | null;
  sort_order: number;
  created_at: string;
  updated_at?: string | null;
};

export type Product = {
  id: number;
  organization_id: number;
  category_id?: number | null;
  name: string;
  description?: string | null;
  price?: number | null;
  sku?: string | null;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type ProductListResponse = {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
};

export const listProductCategories = async (
  token: string,
  params?: { parent_id?: number }
): Promise<ProductCategory[]> => {
  const qs = new URLSearchParams();
  if (params?.parent_id !== undefined) qs.set('parent_id', String(params.parent_id));
  const url = `${API_BASE_URL}/admin/products/categories${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const createProductCategory = async (
  token: string,
  payload: { name: string; parent_id?: number | null; sort_order?: number }
): Promise<ProductCategory> => {
  const res = await fetch(`${API_BASE_URL}/admin/products/categories`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const updateProductCategory = async (
  token: string,
  categoryId: number,
  payload: { name?: string; parent_id?: number | null; sort_order?: number }
): Promise<ProductCategory> => {
  const res = await fetch(`${API_BASE_URL}/admin/products/categories/${categoryId}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const deleteProductCategory = async (token: string, categoryId: number): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/admin/products/categories/${categoryId}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
};

export const listProducts = async (
  token: string,
  params?: {
    category_id?: number;
    is_active?: boolean;
    q?: string;
    page?: number;
    page_size?: number;
  }
): Promise<ProductListResponse> => {
  const qs = new URLSearchParams();
  if (params?.category_id !== undefined) qs.set('category_id', String(params.category_id));
  if (params?.is_active !== undefined) qs.set('is_active', String(params.is_active));
  if (params?.q) qs.set('q', params.q);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.page_size) qs.set('page_size', String(params.page_size));
  const url = `${API_BASE_URL}/admin/products${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getProduct = async (token: string, productId: number): Promise<Product> => {
  const res = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const createProduct = async (
  token: string,
  payload: {
    name: string;
    description?: string | null;
    price?: number | null;
    sku?: string | null;
    category_id?: number | null;
    image_url?: string | null;
    is_active?: boolean;
  }
): Promise<Product> => {
  const res = await fetch(`${API_BASE_URL}/admin/products`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const updateProduct = async (
  token: string,
  productId: number,
  payload: {
    name?: string;
    description?: string | null;
    price?: number | null;
    sku?: string | null;
    category_id?: number | null;
    image_url?: string | null;
    is_active?: boolean;
  }
): Promise<Product> => {
  const res = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const deleteProduct = async (token: string, productId: number): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
};

// ---------------------------
// Couriers API
// ---------------------------
export type Courier = {
  id: number;
  organization_id: number;
  name: string;
  phone_masked?: string | null;
  vehicle_number?: string | null;
  notes?: string | null;
  has_pin: boolean;
  clerk_user_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type CourierListResponse = {
  items: Courier[];
  total: number;
  page: number;
  page_size: number;
};

export const listCouriers = async (
  token: string,
  params?: {
    is_active?: boolean;
    q?: string;
    page?: number;
    page_size?: number;
  }
): Promise<CourierListResponse> => {
  const qs = new URLSearchParams();
  if (params?.is_active !== undefined) qs.set('is_active', String(params.is_active));
  if (params?.q) qs.set('q', params.q);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.page_size) qs.set('page_size', String(params.page_size));
  const url = `${API_BASE_URL}/admin/couriers${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getCourier = async (token: string, courierId: number): Promise<Courier> => {
  const res = await fetch(`${API_BASE_URL}/admin/couriers/${courierId}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const createCourier = async (
  token: string,
  payload: {
    name: string;
    phone?: string | null;
    vehicle_number?: string | null;
    notes?: string | null;
    pin?: string | null;
    is_active?: boolean;
  }
): Promise<Courier> => {
  const res = await fetch(`${API_BASE_URL}/admin/couriers`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const updateCourier = async (
  token: string,
  courierId: number,
  payload: {
    name?: string;
    phone?: string | null;
    vehicle_number?: string | null;
    notes?: string | null;
    is_active?: boolean;
  }
): Promise<Courier> => {
  const res = await fetch(`${API_BASE_URL}/admin/couriers/${courierId}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const updateCourierPin = async (
  token: string,
  courierId: number,
  pin: string
): Promise<Courier> => {
  const res = await fetch(`${API_BASE_URL}/admin/couriers/${courierId}/pin`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const deleteCourier = async (token: string, courierId: number): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/admin/couriers/${courierId}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
};

// ---------------------------
// Analytics API
// ---------------------------
export type Analytics = {
  start_date: string;
  end_date: string;
  total_orders: number;
  total_proofs: number;
  proof_completion_rate: number;
  notification_success_rate: number;
  total_notifications: number;
  daily_trends: Array<{
    date: string;
    orders: number;
    proofs: number;
  }>;
  channel_breakdown: {
    alimtalk_sent: number;
    alimtalk_failed: number;
    sms_sent: number;
    sms_failed: number;
  };
  proof_timing: {
    avg_minutes: number | null;
    median_minutes: number | null;
    min_minutes: number | null;
    max_minutes: number | null;
  };
};

export const getAnalytics = async (
  token: string,
  params: { start_date: string; end_date: string }
): Promise<Analytics> => {
  const qs = new URLSearchParams();
  qs.set('start_date', params.start_date);
  qs.set('end_date', params.end_date);
  const url = `${API_BASE_URL}/admin/analytics?${qs.toString()}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ---------------------------
// Notifications API
// ---------------------------
export type NotificationListItem = {
  id: number;
  order_id: number;
  order_number: string;
  type: string;
  channel: string;
  status: string;
  phone_hash: string;
  provider_request_id?: string | null;
  message_url?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
  sent_at?: string | null;
};

export type NotificationStats = {
  total: number;
  success: number;
  sent: number;
  failed: number;
  pending: number;
  by_channel: {
    alimtalk: { sent: number; failed: number };
    sms: { sent: number; failed: number };
  };
};

export const listNotifications = async (
  token: string,
  params?: {
    start_date?: string;
    end_date?: string;
    status?: string;
    channel?: string;
    limit?: number;
    page?: number;
  }
): Promise<{ items: NotificationListItem[]; total: number; total_pages: number }> => {
  const qs = new URLSearchParams();
  if (params?.start_date) qs.set('start_date', params.start_date);
  if (params?.end_date) qs.set('end_date', params.end_date);
  if (params?.status) qs.set('status', params.status);
  if (params?.channel) qs.set('channel', params.channel);
  const limit = params?.limit ?? 50;
  qs.set('limit', String(limit));
  if (params?.page && params.page > 1) {
    qs.set('offset', String((params.page - 1) * limit));
  }
  const url = `${API_BASE_URL}/admin/notifications${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  // Calculate total_pages from total and limit
  const total_pages = Math.ceil((data.total || 0) / limit);
  return { ...data, total_pages };
};

export const getNotificationStats = async (
  token: string,
  params?: { start_date?: string; end_date?: string }
): Promise<NotificationStats> => {
  const qs = new URLSearchParams();
  if (params?.start_date) qs.set('start_date', params.start_date);
  if (params?.end_date) qs.set('end_date', params.end_date);
  const url = `${API_BASE_URL}/admin/notifications/stats${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ---------------------------
// Reminders API
// ---------------------------
export type PendingReminders = {
  orders: Array<{
    order_id: number;
    order_number: string;
    context?: string | null;
    sender_name: string;
    recipient_name?: string | null;
    created_at: string;
    hours_since_token: number;
    reminder_count: number;
  }>;
  total: number;
};

export type ReminderResponse = {
  total: number;
  sent_count: number;
  skipped_count: number;
  failed_count: number;
  order_ids: number[];
  results: Array<{
    order_id: number;
    order_number: string;
    status: 'sent' | 'skipped' | 'failed';
    error?: string | null;
  }>;
};

export const getPendingReminders = async (
  token: string,
  params?: { hours_since_token?: number }
): Promise<PendingReminders> => {
  const qs = new URLSearchParams();
  if (params?.hours_since_token) qs.set('hours_since_token', String(params.hours_since_token));
  const url = `${API_BASE_URL}/admin/reminders/pending${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const sendReminders = async (
  token: string,
  params: { order_ids?: number[]; hours_since_token?: number; max_reminders?: number }
): Promise<ReminderResponse> => {
  const res = await fetch(`${API_BASE_URL}/admin/reminders/send`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
