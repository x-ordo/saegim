import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { GetServerSideProps } from 'next';
import { AdminLayout } from '../../../components/AdminLayout';
import { getMe, getOrgSettings, updateOrgSettings, Organization } from '../../../services/adminApi';
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

export default function BrandingSettingsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { getAdminToken } = useAdminToken();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [meRole, setMeRole] = useState<string | null>(null);

  const [org, setOrg] = useState<Organization | null>(null);

  const [brandName, setBrandName] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [brandDomain, setBrandDomain] = useState('');
  const [hideSaegim, setHideSaegim] = useState(false);

  const canEdit = useMemo(() => isOrgAdmin(meRole), [meRole]);

  useEffect(() => {
    const run = async () => {
      if (!isLoaded) return;
      if (!isSignedIn) return;

      try {
        setLoading(true);
        const token = await getAdminToken();
        const me = await getMe(token);
        setMeRole(me.org_role || null);

        const data = await getOrgSettings(token);
        setOrg(data);

        setBrandName((data.brand_name || '').toString());
        setBrandLogoUrl((data.brand_logo_url || '').toString());
        setBrandDomain((data.brand_domain || '').toString());
        setHideSaegim(Boolean(data.hide_saegim));

        setErr(null);
      } catch (e: any) {
        setErr(e?.message || '설정을 불러오지 못했습니다');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [getAdminToken, isLoaded, isSignedIn]);

  const onSave = async () => {
    try {
      setErr(null);
      const token = await getAdminToken();
      const updated = await updateOrgSettings(token, {
        brand_name: brandName,
        brand_logo_url: brandLogoUrl,
        brand_domain: brandDomain,
        hide_saegim: hideSaegim,
      });
      setOrg(updated);
      alert('저장 완료');
    } catch (e: any) {
      setErr(e?.message || '저장 실패');
    }
  };

  const previewName = brandName || org?.name || '배송증빙';
  const previewLogo = brandLogoUrl || org?.logo_url || '';

  return (
    <AdminLayout title="설정 · 브랜딩">
      {loading && <div className="muted">로딩 중…</div>}
      {err && <div className="danger">{err}</div>}

      {!loading && !canEdit && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>권한이 없습니다</div>
          <div className="muted">
            브랜딩 설정은 조직 관리자(Org Admin)만 수정할 수 있습니다.
          </div>
        </div>
      )}

      {!loading && org && (
        <div className="grid2">
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>공개 페이지 브랜딩(화이트라벨)</div>

            <div className="muted" style={{ marginBottom: 12 }}>
              /proof(업로드)·/p(증빙조회) 페이지 상단에 노출되는 이름/로고를 설정합니다.
              비워두면 조직 기본값(name/logo)을 사용합니다.
            </div>

            <label className="label">공개 표시 이름</label>
            <input
              className="input"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder={org.name}
              disabled={!canEdit}
            />

            <div style={{ height: 10 }} />

            <label className="label">공개 로고 URL</label>
            <input
              className="input"
              value={brandLogoUrl}
              onChange={(e) => setBrandLogoUrl(e.target.value)}
              placeholder={org.logo_url || 'https://...'}
              disabled={!canEdit}
            />

            <div style={{ height: 10 }} />

            <label className="label">커스텀 도메인(선택)</label>
            <input
              className="input"
              value={brandDomain}
              onChange={(e) => setBrandDomain(e.target.value)}
              placeholder="proof.yourdomain.com"
              disabled={!canEdit}
            />

            <div style={{ height: 12 }} />

            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                checked={hideSaegim}
                onChange={(e) => setHideSaegim(e.target.checked)}
                disabled={!canEdit}
              />
              <span>공개 페이지에서 “Powered by 새김” 숨기기</span>
            </label>

            <div style={{ height: 16 }} />

            <button className="btn" onClick={onSave} disabled={!canEdit}>
              저장
            </button>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>미리보기</div>

            <div style={{ border: '1px solid #e6e6e6', borderRadius: 12, overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  background: '#fafafa',
                }}
              >
                {previewLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewLogo}
                    alt="logo"
                    style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: '#e6e6e6',
                    }}
                  />
                )}
                <div style={{ fontWeight: 800 }}>{previewName}</div>
                <div style={{ marginLeft: 'auto' }} className="muted">
                  {hideSaegim ? '' : 'Powered by 새김'}
                </div>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>배송 완료 증빙</div>
                <div className="muted">사진/문구/시간이 이 영역에 표시됩니다.</div>
              </div>
            </div>

            <div style={{ height: 10 }} />

            <div className="muted">
              * 커스텀 도메인은 v2에서 DNS 검증/SSL 자동발급까지 붙입니다.
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
