# Saegim 업그레이드 로드맵

> MVP 이후 단계별 업그레이드 계획 및 우선순위

---

## 1. 현재 상태 분석

### 1.1 MVP 완료 항목

| 항목 | 상태 | 관련 파일 |
|------|------|-----------|
| 주문 CRUD + CSV 가져오기 | ✅ 완료 | `server/src/api/routes/orders.py` |
| QR 토큰 생성 | ✅ 완료 | `server/src/services/qr_token_service.py` |
| 증빙 업로드 (로컬 스토리지) | ✅ 완료 | `server/src/api/routes/public.py` |
| 공개 증빙 조회 (비로그인) | ✅ 완료 | `web/src/pages/p/[token].tsx` |
| 알림 로깅 (mock) | ✅ 완료 | `server/src/services/notification_service.py` |
| 관리자 대시보드 | ✅ 완료 | `web/src/pages/app/dashboard/` |
| 오프라인 재시도 | ✅ 완료 | `web/src/components/UploadForm.tsx` |

### 1.2 주요 Gap

| 항목 | 현재 | 목표 |
|------|------|------|
| 메시징 | Mock Provider | 실제 알림톡/SMS |
| 스토리지 | 로컬 파일 | S3 Presigned URL |
| 테스트 | 없음 | 70%+ 커버리지 |
| 보안 | 기본 설정 | 프로덕션 레벨 |
| 인증 | Clerk (미연동) | 실제 JWKS 검증 |

---

## 2. 업그레이드 로드맵

### Phase 1: v1.1 - 프로덕션 준비

#### 1.1 보안 강화 [CRITICAL]

| 작업 | 난이도 | 영향 | 파일 |
|------|--------|------|------|
| 시크릿 키 환경변수 필수화 | 낮음 | 높음 | `server/src/core/config.py` |
| 암호화 salt 랜덤화 | 중간 | 높음 | `server/src/core/security.py` |
| CORS 프로덕션 설정 | 낮음 | 중간 | `server/src/main.py` |
| Rate Limit 조정 | 낮음 | 중간 | `server/src/main.py` |

**구현 상세:**

```python
# config.py - 시크릿 필수화
class Settings(BaseSettings):
    SECRET_KEY: str  # 기본값 제거, 필수 환경변수
    ENCRYPTION_KEY: str  # 필수

    @validator('SECRET_KEY', 'ENCRYPTION_KEY')
    def validate_secrets(cls, v):
        if len(v) < 32:
            raise ValueError('Secret must be at least 32 characters')
        return v
```

```python
# security.py - 동적 salt
def encrypt_phone(phone: str, context: str) -> str:
    salt = hashlib.sha256(f"{settings.ENCRYPTION_SALT}:{context}".encode()).digest()
    # ... 암호화 로직
```

#### 1.2 실제 메시징 연동 [HIGH]

| 작업 | 난이도 | 영향 | 파일 |
|------|--------|------|------|
| 카카오 알림톡 연동 | 중간 | 높음 | `server/src/services/messaging_service.py` |
| SMS 폴백 완성 | 중간 | 높음 | `server/src/services/messaging_service.py` |
| 알림 재시도 로직 (3회) | 낮음 | 중간 | `server/src/services/notification_service.py` |
| 알림 상태 대시보드 | 중간 | 중간 | `web/src/pages/app/notifications/` |

**구현 상세:**

```python
# messaging_service.py
class KakaoAlimTalkProvider(MessagingProvider):
    async def send(self, phone: str, template_code: str, variables: dict) -> bool:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/alimtalk/v2/sender/{self.sender_key}/message",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "recipientNo": phone,
                    "templateCode": template_code,
                    "templateParameter": variables
                }
            )
            return response.status_code == 200
```

#### 1.3 에러 추적 시스템 [MEDIUM]

| 작업 | 난이도 | 영향 | 파일 |
|------|--------|------|------|
| Sentry 백엔드 연동 | 낮음 | 중간 | `server/src/main.py` |
| Sentry 프론트엔드 연동 | 낮음 | 중간 | `web/src/pages/_app.tsx` |
| React Error Boundary | 낮음 | 중간 | `web/src/components/ErrorBoundary.tsx` |
| 구조화된 로깅 | 중간 | 중간 | `server/src/core/logging.py` |

---

### Phase 2: v1.2 - 스케일 준비

#### 2.1 S3 마이그레이션 [HIGH]

| 작업 | 난이도 | 영향 | 파일 |
|------|--------|------|------|
| S3 Presigned URL 생성 | 중간 | 높음 | `server/src/services/storage_service.py` (신규) |
| 클라이언트 직접 업로드 | 중간 | 높음 | `web/src/components/UploadForm.tsx` |
| 업로드 진행률 표시 | 낮음 | 중간 | `web/src/components/UploadForm.tsx` |
| CDN 연동 | 낮음 | 중간 | 인프라 설정 |

**구현 상세:**

```python
# storage_service.py
class S3StorageService:
    def generate_presigned_upload(self, key: str, content_type: str) -> dict:
        return self.s3_client.generate_presigned_post(
            Bucket=settings.S3_BUCKET,
            Key=key,
            Fields={"Content-Type": content_type},
            Conditions=[
                {"Content-Type": content_type},
                ["content-length-range", 1, 10 * 1024 * 1024]  # 10MB
            ],
            ExpiresIn=300  # 5분
        )
```

```typescript
// UploadForm.tsx - 직접 업로드
const uploadToS3 = async (file: File, presignedData: PresignedPost) => {
  const formData = new FormData();
  Object.entries(presignedData.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append('file', file);

  await fetch(presignedData.url, {
    method: 'POST',
    body: formData,
  });
};
```

#### 2.2 테스트 인프라 구축 [HIGH]

| 작업 | 난이도 | 영향 | 파일 |
|------|--------|------|------|
| pytest 설정 + 픽스처 | 중간 | 높음 | `server/tests/conftest.py` |
| API 엔드포인트 테스트 | 높음 | 높음 | `server/tests/api/` |
| Jest/React 컴포넌트 테스트 | 중간 | 중간 | `web/__tests__/` |
| CI/CD 파이프라인 | 중간 | 중간 | `.github/workflows/test.yml` |

**디렉토리 구조:**

```
server/tests/
├── conftest.py          # 공통 픽스처
├── api/
│   ├── test_orders.py
│   ├── test_public.py
│   └── test_notifications.py
├── services/
│   ├── test_qr_token_service.py
│   └── test_notification_service.py
└── integration/
    └── test_upload_flow.py

web/__tests__/
├── components/
│   ├── UploadForm.test.tsx
│   └── OrderTable.test.tsx
└── pages/
    └── public-proof.test.tsx
```

#### 2.3 멀티테넌트 보안 [HIGH]

| 작업 | 난이도 | 영향 | 파일 |
|------|--------|------|------|
| PostgreSQL RLS 설정 | 중간 | 높음 | `server/alembic/versions/` |
| 조직 격리 테스트 | 중간 | 높음 | `server/tests/security/` |
| 테넌트 컨텍스트 검증 | 낮음 | 중간 | `server/src/api/deps.py` |

**구현 상세:**

```sql
-- RLS 정책
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_isolation ON orders
    USING (organization_id = current_setting('app.current_org_id')::uuid);
```

---

### Phase 3: v1.3 - 기능 확장

#### 3.1 고급 주문 관리

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 벌크 토큰 생성 | 선택한 주문 일괄 토큰 발급 | 높음 |
| 주문 템플릿 | 반복 고객용 템플릿 저장 | 중간 |
| 라벨 예약 출력 | 스케줄된 라벨 생성 | 낮음 |
| CSV 내보내기 | 주문/증빙 데이터 내보내기 | 중간 |

#### 3.2 분석 대시보드

| 메트릭 | 설명 | 시각화 |
|--------|------|--------|
| 증빙 완료율 | 주문 대비 업로드 비율 | 도넛 차트 |
| 평균 업로드 시간 | 토큰 발급~업로드 소요 시간 | 라인 차트 |
| 알림 성공률 | 채널별 발송 성공률 | 바 차트 |
| 일/주/월 트렌드 | 사용량 추이 | 라인 차트 |

#### 3.3 알림 고도화

| 기능 | 설명 | 복잡도 |
|------|------|--------|
| 템플릿 편집기 | 조직별 메시지 커스터마이징 | 높음 |
| 리마인더 알림 | 업로드 전 미리 알림 | 중간 |
| 자동 재시도 | 실패 시 자동 3회 재시도 | 낮음 |

---

### Phase 4: v2.0 - 명품 수선 피벗

#### 4.1 자산 패스포트 확장

| 기능 | 설명 |
|------|------|
| 브랜드/모델/소재 필드 | 명품 메타데이터 확장 |
| 이력 관리 | 수선 이력 타임라인 |
| 인증서 생성 | PDF 인증서 다운로드 |

**데이터 모델 확장:**

```python
class AssetPassport(BaseModel):
    # 기존 필드
    order_id: UUID
    customer_phone_encrypted: str

    # 확장 필드
    brand: Optional[str]  # "LOUIS VUITTON", "HERMES"
    model: Optional[str]  # "Speedy 30", "Birkin 25"
    material: Optional[str]  # "Monogram Canvas", "Togo Leather"
    color: Optional[str]
    serial_number: Optional[str]
    purchase_date: Optional[date]

    # 수선 이력
    repair_history: List[RepairRecord]
```

#### 4.2 수선 워크플로우

```
접수 → 진단 → 견적 → 승인 → 수선 중 → 완료 → 발송
  │       │       │       │        │        │       │
  ▼       ▼       ▼       ▼        ▼        ▼       ▼
알림    사진    금액    고객     진행     완료    발송
발송   업로드  산정    확인    상황     사진    추적
```

#### 4.3 고객 포털

| 화면 | 기능 |
|------|------|
| 현황 조회 | 수선 진행 상태 확인 |
| 견적 승인 | 온라인 견적 확인/승인 |
| 결제 | Stripe/토스 연동 |

#### 4.4 결제 연동

| 항목 | 용도 | 우선순위 |
|------|------|----------|
| 토스페이먼츠 | 국내 결제 | 높음 |
| Stripe | 해외 결제 | 중간 |
| 정기결제 | SaaS 구독 모델 | 낮음 |

---

## 3. 기술 부채 해결

### 3.1 즉시 해결 필요 [CRITICAL]

| 항목 | 현재 | 해결 방안 | 파일 |
|------|------|-----------|------|
| 하드코딩된 시크릿 | `.env.example`에 기본값 | 환경변수 필수화, 검증 추가 | `config.py` |
| 정적 암호화 salt | 고정값 | 랜덤 salt + context 추가 | `security.py` |
| 테스트 없음 | 0% | 최소 70% 커버리지 목표 | `tests/` |

### 3.2 중기 해결 [HIGH]

| 항목 | 현재 | 해결 방안 |
|------|------|-----------|
| 로컬 파일 스토리지 | `/data/uploads` | S3 마이그레이션 |
| N+1 쿼리 | 비최적화 | SQLAlchemy selectinload 적용 |
| 페이지네이션 | 하드코딩 limit | 동적 pagination + cursor 기반 |

### 3.3 장기 해결 [MEDIUM]

| 항목 | 현재 | 해결 방안 |
|------|------|-----------|
| 모놀리식 서비스 | 단일 앱 | 도메인별 모듈 분리 |
| 동기 알림 발송 | Background task | 메시지 큐 (Redis/SQS) |
| 모니터링 | 없음 | Prometheus + Grafana |

---

## 4. 우선순위 매트릭스

```
         높음 ↑
              │  [보안강화]    [메시징연동]    [S3마이그레이션]
              │
    영향도    │  [테스트]      [분석대시보드]   [알림고도화]
              │
              │  [에러추적]    [고급주문관리]   [명품피벗]
         낮음 │
              └─────────────────────────────────────────────→
                  낮음              난이도              높음
```

### 즉시 착수 (v1.1)
1. ⚠️ 보안 강화 (시크릿, 암호화)
2. 📱 실제 메시징 연동
3. 🔍 에러 추적 (Sentry)

### 다음 스프린트 (v1.2)
1. ☁️ S3 마이그레이션
2. 🧪 테스트 인프라
3. 🔐 멀티테넌트 보안

### 분기 목표 (v1.3)
1. 📊 분석 대시보드
2. 🔔 알림 고도화
3. 📦 고급 주문 관리

---

## 5. 마일스톤 정의

### v1.1 마일스톤

- [ ] 시크릿 키 환경변수 필수화
- [ ] 암호화 salt 동적화
- [ ] CORS 프로덕션 설정
- [ ] 카카오 알림톡 연동
- [ ] SMS 폴백 구현
- [ ] Sentry 연동

### v1.2 마일스톤

- [ ] S3 Presigned URL 구현
- [ ] 클라이언트 직접 업로드
- [ ] pytest 테스트 70% 커버리지
- [ ] CI/CD 파이프라인
- [ ] PostgreSQL RLS 적용

### v1.3 마일스톤

- [ ] 벌크 토큰 생성
- [ ] CSV 내보내기
- [ ] 증빙 완료율 대시보드
- [ ] 템플릿 편집기

### v2.0 마일스톤

- [ ] 자산 패스포트 스키마 확장
- [ ] 수선 워크플로우 구현
- [ ] 고객 포털
- [ ] 결제 연동

---

## 6. 관련 문서

| 문서 | 설명 |
|------|------|
| [01_overview.md](./01_overview.md) | 프로젝트 개요 |
| [02_mvp_scope.md](./02_mvp_scope.md) | MVP 범위 정의 |
| [10_api_reference.md](./10_api_reference.md) | API 레퍼런스 |
| [12_design_tokens.md](./12_design_tokens.md) | 디자인 토큰 |
| [13_user_flows.md](./13_user_flows.md) | 사용자 플로우 |

---

## 변경 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 1.0 | 2025-12-22 | 초안 작성 |
