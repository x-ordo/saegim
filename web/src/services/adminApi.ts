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

export type OrderListResult = {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export const listOrders = async (
  token: string,
  params?: {
    organization_id?: number;
    q?: string;
    status?: string;
    day?: string; // YYYY-MM-DD (Asia/Seoul)
    today?: boolean;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }
): Promise<OrderListResult> => {
  const qs = new URLSearchParams();
  if (params?.organization_id) qs.set('organization_id', String(params.organization_id));
  if (params?.q) qs.set('q', params.q);
  if (params?.status) qs.set('status', params.status);
  if (params?.day) qs.set('day', params.day);
  if (params?.today) qs.set('today', 'true');
  if (params?.start_date) qs.set('start_date', params.start_date);
  if (params?.end_date) qs.set('end_date', params.end_date);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
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

// --- Dashboard ---
export type DashboardKPI = {
  total_orders: number;
  proof_pending: number;
  proof_completed: number;
  notification_failed: number;
};

export type RecentProof = {
  order_id: number;
  order_number: string;
  context?: string | null;
  proof_type?: string | null;
  uploaded_at: string;
};

export type Dashboard = {
  kpi: DashboardKPI;
  recent_proofs: RecentProof[];
};

export const getDashboard = async (
  token: string,
  params?: { start_date?: string; end_date?: string }
): Promise<Dashboard> => {
  const qs = new URLSearchParams();
  if (params?.start_date) qs.set('start_date', params.start_date);
  if (params?.end_date) qs.set('end_date', params.end_date);
  const url = `${API_BASE_URL}/admin/dashboard${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// --- Order Update/Delete ---
export type OrderUpdate = {
  order_number?: string;
  context?: string;
  sender_name?: string;
  sender_phone?: string;
  recipient_name?: string;
  recipient_phone?: string;
};

export const updateOrder = async (
  token: string,
  orderId: number,
  payload: OrderUpdate
): Promise<Order> => {
  const res = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const deleteOrder = async (
  token: string,
  orderId: number
): Promise<{ status: string; deleted_order_id: number }> => {
  const res = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// --- Notifications ---
export type NotificationListItem = {
  id: number;
  order_id: number;
  order_number: string;
  type: string;
  channel: string;
  status: string;
  message_url?: string | null;
  error_message?: string | null;
  created_at: string;
  sent_at?: string | null;
};

export type NotificationList = {
  items: NotificationListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type NotificationStats = {
  success: number;
  failed: number;
  pending: number;
};

export const listNotifications = async (
  token: string,
  params?: {
    page?: number;
    limit?: number;
    status?: string;
    channel?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<NotificationList> => {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.status) qs.set('status', params.status);
  if (params?.channel) qs.set('channel', params.channel);
  if (params?.start_date) qs.set('start_date', params.start_date);
  if (params?.end_date) qs.set('end_date', params.end_date);
  const url = `${API_BASE_URL}/admin/notifications${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
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

// --- Bulk Token Generation ---
export type BulkTokenResult = {
  order_id: number;
  order_number: string;
  success: boolean;
  token?: string | null;
  token_valid: boolean;
  upload_url?: string | null;
  public_proof_url?: string | null;
  error?: string | null;
};

export type BulkTokenResponse = {
  total: number;
  success_count: number;
  failed_count: number;
  results: BulkTokenResult[];
};

export const bulkGenerateTokens = async (
  token: string,
  payload: { order_ids: number[]; force?: boolean }
): Promise<BulkTokenResponse> => {
  const res = await fetch(`${API_BASE_URL}/admin/orders/bulk-tokens`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      order_ids: payload.order_ids,
      force: payload.force ?? false,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// --- CSV Export ---
export const exportOrdersCsv = async (
  token: string,
  params?: { status?: string; start_date?: string; end_date?: string }
): Promise<Blob> => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.start_date) qs.set('start_date', params.start_date);
  if (params?.end_date) qs.set('end_date', params.end_date);
  const url = `${API_BASE_URL}/admin/orders/export/csv${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
};

// --- Analytics ---
export type DailyTrend = {
  date: string;
  orders: number;
  proofs: number;
  notifications_sent: number;
  notifications_failed: number;
};

export type ChannelBreakdown = {
  alimtalk_sent: number;
  alimtalk_failed: number;
  sms_sent: number;
  sms_failed: number;
};

export type ProofTiming = {
  avg_minutes?: number | null;
  min_minutes?: number | null;
  max_minutes?: number | null;
  median_minutes?: number | null;
};

export type Analytics = {
  total_orders: number;
  total_proofs: number;
  proof_completion_rate: number;
  total_notifications: number;
  notification_success_rate: number;
  channel_breakdown: ChannelBreakdown;
  proof_timing: ProofTiming;
  daily_trends: DailyTrend[];
  start_date: string;
  end_date: string;
};

export const getAnalytics = async (
  token: string,
  params?: { start_date?: string; end_date?: string }
): Promise<Analytics> => {
  const qs = new URLSearchParams();
  if (params?.start_date) qs.set('start_date', params.start_date);
  if (params?.end_date) qs.set('end_date', params.end_date);
  const url = `${API_BASE_URL}/admin/analytics${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// --- Reminders ---
export type PendingReminderOrder = {
  order_id: number;
  order_number: string;
  context?: string | null;
  sender_name: string;
  token_created_at?: string | null;
  hours_since_token?: number | null;
  reminder_count: number;
};

export type PendingReminders = {
  total: number;
  orders: PendingReminderOrder[];
};

export type ReminderResult = {
  order_id: number;
  order_number: string;
  success: boolean;
  message?: string | null;
  error?: string | null;
};

export type ReminderResponse = {
  total: number;
  sent_count: number;
  skipped_count: number;
  failed_count: number;
  results: ReminderResult[];
};

export const getPendingReminders = async (
  token: string,
  params?: { hours_since_token?: number }
): Promise<PendingReminders> => {
  const qs = new URLSearchParams();
  if (params?.hours_since_token) qs.set('hours_since_token', String(params.hours_since_token));
  const url = `${API_BASE_URL}/admin/orders/pending-reminders${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const sendReminders = async (
  token: string,
  payload: { order_ids?: number[]; hours_since_token?: number; max_reminders?: number }
): Promise<ReminderResponse> => {
  const res = await fetch(`${API_BASE_URL}/admin/orders/reminders`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
