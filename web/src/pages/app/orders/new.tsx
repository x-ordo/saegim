import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import { createOrder, listOrganizations, Organization } from '../../../services/adminApi';
import { useAdminToken } from '../../../services/useAdminToken';

// Force SSR to ensure ClerkProvider is available
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function NewOrderPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getAdminToken } = useAdminToken();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [organization_id, setOrgId] = useState<number>(1);

  const [order_number, setOrderNumber] = useState('');
  const [context, setContext] = useState('');
  const [sender_name, setSenderName] = useState('');
  const [sender_phone, setSenderPhone] = useState('');
  const [recipient_name, setRecipientName] = useState('');
  const [recipient_phone, setRecipientPhone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    (async () => {
      const token = await getAdminToken();
      const list = await listOrganizations(token);
      setOrgs(list);
      if (list[0]) setOrgId(list[0].id);
    })().catch((e) => setError((e as any)?.message || String(e)));
  }, [isLoaded, isSignedIn]);

  const submit = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!order_number.trim()) throw new Error('ORDER_NUMBER_REQUIRED');
      if (!sender_name.trim()) throw new Error('SENDER_NAME_REQUIRED');
      if (!sender_phone.trim().startsWith('+')) throw new Error('SENDER_PHONE_E164_REQUIRED');

      const token = await getAdminToken();
      const created = await createOrder(token, {
        organization_id,
        order_number: order_number.trim(),
        context: context.trim() || null,
        sender_name: sender_name.trim(),
        sender_phone: sender_phone.trim(),
        recipient_name: recipient_name.trim() || null,
        recipient_phone: recipient_phone.trim() || null,
      });
      // Simple operator flow: create → print label (new tab) → return to order detail
      window.open(`/app/labels?ids=${created.id}&template=12&cut=1&autoprint=1&mini=1`, '_blank', 'noopener,noreferrer');
      router.push(`/app/orders/${created.id}`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="New Order">
      <div className="stack">
        {!isLoaded && <div className="muted">Auth loading…</div>}
        {isLoaded && !isSignedIn && (
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>로그인이 필요합니다</div>
            <div className="muted">우측 상단의 로그인 버튼을 눌러주세요.</div>
          </div>
        )}

        {error && <div className="danger">{error}</div>}

        {isSignedIn && (
          <div className="card flat">
            <div className="grid2">
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="label">Organization</div>
                <select className="select" value={organization_id} onChange={(e) => setOrgId(Number(e.target.value))} disabled={orgs.length <= 1}>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name} (#{o.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="label">Order Number</div>
                <input className="input" value={order_number} onChange={(e) => setOrderNumber(e.target.value)} placeholder="ex) W-2025-0001" />
              </div>

              <div>
                <div className="label">Context (행사/비고)</div>
                <input className="input" value={context} onChange={(e) => setContext(e.target.value)} placeholder="ex) 근조 / 개업 / 결혼" />
              </div>

              <div>
                <div className="label">Sender Name</div>
                <input className="input" value={sender_name} onChange={(e) => setSenderName(e.target.value)} placeholder="발주자 이름/회사" />
              </div>

              <div>
                <div className="label">Sender Phone (E.164)</div>
                <input className="input" value={sender_phone} onChange={(e) => setSenderPhone(e.target.value)} placeholder="+8210..." />
                <div className="muted" style={{ marginTop: 6 }}>알림톡/SMS 대상. v1은 mock 모드로 DB에만 기록.</div>
              </div>

              <div>
                <div className="label">Recipient Name (optional)</div>
                <input className="input" value={recipient_name} onChange={(e) => setRecipientName(e.target.value)} placeholder="수령인(상주/담당자)" />
              </div>

              <div>
                <div className="label">Recipient Phone (optional)</div>
                <input className="input" value={recipient_phone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="+8210..." />
              </div>
            </div>

            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn" onClick={submit} disabled={saving}>
                {saving ? 'Saving…' : 'Create'}
              </button>
              <button className="btn secondary" onClick={() => router.push('/app/orders')} disabled={saving}>
                Cancel
              </button>
            </div>

            <div className="muted" style={{ marginTop: 10 }}>
              다음 단계: 주문 상세에서 <b>토큰 발급</b> → QR 출력 → 현장/기사 <b>촬영 업로드</b>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
