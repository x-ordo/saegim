import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import { getOrgSettings, updateOrgSettings, Organization } from '../../../services/adminApi';
import { useAdminToken } from '../../../services/useAdminToken';

// Force SSR to ensure ClerkProvider is available
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

const isOrgAdmin = (role?: string | null) => {
  const r = (role || '').toLowerCase();
  if (!r) return false;
  if (r === 'admin' || r === 'owner') return true;
  if (r.endsWith(':admin') || r.endsWith(':owner')) return true;
  return false;
};

const sampleVars = {
  brand: '새김',
  url: 'https://saegim.kr/s/AbCdE12',
  order: 'SGM-20251219-0001',
  context: '근조화환 / 고인 홍길동 / 빈소 3호',
  sender: '홍길동',
  recipient: '새김장례식장',
};

const renderTemplate = (tpl: string, vars: Record<string, string>) => {
  if (!tpl) return '';
  // very small {key} replacer; unknown keys => empty
  return tpl.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => (vars[k] ?? ''));
};

export default function MessagingSettingsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { getAdminToken, orgRole: role } = useAdminToken();

  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [alimSender, setAlimSender] = useState('');
  const [alimRecipient, setAlimRecipient] = useState('');
  const [smsSender, setSmsSender] = useState('');
  const [smsRecipient, setSmsRecipient] = useState('');
  const [kakaoTemplateCode, setKakaoTemplateCode] = useState('');
  const [fallbackSmsEnabled, setFallbackSmsEnabled] = useState<boolean | null>(null);

  const canEdit = useMemo(() => isOrgAdmin(role), [role]);

  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !isSignedIn) return;
      setLoading(true);
      try {
        const token = await getAdminToken();
        const data = await getOrgSettings(token);
        setOrg(data);

        setAlimSender((data.msg_alimtalk_template_sender || '').toString());
        setAlimRecipient((data.msg_alimtalk_template_recipient || '').toString());
        setSmsSender((data.msg_sms_template_sender || '').toString());
        setSmsRecipient((data.msg_sms_template_recipient || '').toString());
        setKakaoTemplateCode((data.msg_kakao_template_code || '').toString());
        setFallbackSmsEnabled(
          typeof data.msg_fallback_sms_enabled === 'boolean' ? data.msg_fallback_sms_enabled : null
        );

        setErr(null);
      } catch (e: any) {
        setErr(e?.message || '설정을 불러오지 못했습니다');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [getAdminToken, isLoaded, isSignedIn]);

  const preview = useMemo(() => {
    const useAlim = alimSender || '(기본값 사용)';
    const useSms = smsSender || '(기본값 사용)';
    return {
      alim_sender: renderTemplate(useAlim, sampleVars),
      alim_recipient: renderTemplate(alimRecipient || useAlim, sampleVars),
      sms_sender: renderTemplate(useSms, sampleVars),
      sms_recipient: renderTemplate(smsRecipient || useSms, sampleVars),
    };
  }, [alimSender, alimRecipient, smsSender, smsRecipient]);

  const onSave = async () => {
    try {
      setErr(null);
      const token = await getAdminToken();
      const updated = await updateOrgSettings(token, {
        msg_alimtalk_template_sender: alimSender,
        msg_alimtalk_template_recipient: alimRecipient,
        msg_sms_template_sender: smsSender,
        msg_sms_template_recipient: smsRecipient,
        msg_kakao_template_code: kakaoTemplateCode,
        msg_fallback_sms_enabled: fallbackSmsEnabled,
      });
      setOrg(updated);
      alert('저장 완료');
    } catch (e: any) {
      setErr(e?.message || '저장 실패');
    }
  };

  const onReset = () => {
    // reset to "inherit defaults": keep empty strings and null override
    setAlimSender('');
    setAlimRecipient('');
    setSmsSender('');
    setSmsRecipient('');
    setKakaoTemplateCode('');
    setFallbackSmsEnabled(null);
  };

  return (
    <AdminLayout title="설정 - 메시지">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <Link className="btn ghost" href="/app/settings/branding">
            브랜딩
          </Link>
          <Link className="btn secondary" href="/app/settings/messaging">
            메시지
          </Link>
        </div>

        {loading ? (
          <div className="card">로딩 중...</div>
        ) : err ? (
          <div className="card">
            <div style={{ color: '#b00020' }}>{err}</div>
          </div>
        ) : (
          <div className="grid2">
            <div className="card">
              <div className="h2">메시지 템플릿</div>
              <div className="muted" style={{ marginTop: 6 }}>
                지원 변수: <code>{'{brand}'}</code> <code>{'{url}'}</code> <code>{'{order}'}</code>{' '}
                <code>{'{context}'}</code> <code>{'{sender}'}</code> <code>{'{recipient}'}</code>
              </div>

              <div style={{ height: 14 }} />

              <div className="h3">알림톡 템플릿(선택)</div>
              <div className="muted" style={{ marginTop: 4 }}>
                카카오 알림톡은 <b>등록된 템플릿 코드</b>와 메시지 내용이 일치해야 발송됩니다.
                (비워두면 기본값 사용)
              </div>
              <div style={{ height: 8 }} />
              <label className="label">템플릿 코드</label>
              <input
                className="input"
                value={kakaoTemplateCode}
                onChange={(e) => setKakaoTemplateCode(e.target.value)}
                placeholder="예: SGM_PROOF_DONE"
                disabled={!canEdit}
              />

              <div style={{ height: 14 }} />

              <label className="label">알림톡 문구 (발주자)</label>
              <textarea
                className="textarea"
                value={alimSender}
                onChange={(e) => setAlimSender(e.target.value)}
                placeholder="비워두면 기본 템플릿 사용"
                disabled={!canEdit}
              />

              <div style={{ height: 10 }} />

              <label className="label">알림톡 문구 (수령인)</label>
              <textarea
                className="textarea"
                value={alimRecipient}
                onChange={(e) => setAlimRecipient(e.target.value)}
                placeholder="비워두면 발주자 문구/기본 템플릿 사용"
                disabled={!canEdit}
              />

              <div style={{ height: 14 }} />

              <div className="h3">SMS 폴백</div>
              <div className="muted" style={{ marginTop: 4 }}>
                알림톡 실패 시 SMS로 재발송합니다. (조직 단위로 켜고 끌 수 있음)
              </div>

              <div style={{ height: 10 }} />

              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={fallbackSmsEnabled === true}
                  onChange={(e) => setFallbackSmsEnabled(e.target.checked)}
                  disabled={!canEdit}
                />
                <span>SMS 폴백 사용(조직 override)</span>
                <button
                  className="btn"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => setFallbackSmsEnabled(null)}
                  disabled={!canEdit}
                >
                  기본값(상속)
                </button>
              </label>

              <div style={{ height: 12 }} />

              <label className="label">SMS 문구 (발주자)</label>
              <textarea
                className="textarea"
                value={smsSender}
                onChange={(e) => setSmsSender(e.target.value)}
                placeholder="비워두면 기본 템플릿 사용"
                disabled={!canEdit}
              />

              <div style={{ height: 10 }} />

              <label className="label">SMS 문구 (수령인)</label>
              <textarea
                className="textarea"
                value={smsRecipient}
                onChange={(e) => setSmsRecipient(e.target.value)}
                placeholder="비워두면 발주자 문구/기본 템플릿 사용"
                disabled={!canEdit}
              />

              <div style={{ height: 16 }} />

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={onSave} disabled={!canEdit}>
                  저장
                </button>
                <button className="btn ghost" onClick={onReset} disabled={!canEdit}>
                  비우기(상속)
                </button>
              </div>

              {!canEdit ? (
                <div className="muted" style={{ marginTop: 12 }}>
                  조직 관리자만 수정할 수 있습니다.
                </div>
              ) : null}
            </div>

            <div className="card">
              <div className="h2">미리보기</div>
              <div className="muted" style={{ marginTop: 6 }}>
                샘플 데이터로 치환된 결과입니다.
              </div>

              <div style={{ height: 14 }} />

              <div className="h3">알림톡(발주자)</div>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.5 }}>{preview.alim_sender}</pre>

              <div style={{ height: 10 }} />

              <div className="h3">알림톡(수령인)</div>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.5 }}>{preview.alim_recipient}</pre>

              <div style={{ height: 14 }} />

              <div className="h3">SMS(발주자)</div>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.5 }}>{preview.sms_sender}</pre>

              <div style={{ height: 10 }} />

              <div className="h3">SMS(수령인)</div>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.5 }}>{preview.sms_recipient}</pre>

              <div style={{ height: 14 }} />

              <div className="h3">치환 변수</div>
              <div className="muted" style={{ marginTop: 6 }}>
                brand={sampleVars.brand} / order={sampleVars.order}
                <br />
                context={sampleVars.context}
                <br />
                url={sampleVars.url}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
