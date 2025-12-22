# CLAUDE.md — Agent Instructions (ProofLink)

## Goal
Build v1 MVP of ProofLink: QR 증빙(사진) + 자동 메시지 + 공개 링크 확인 + 업체 대시보드.

## Non-Negotiables
- QR에는 token만. **PII 금지**
- Proof 플로우는 30초 컷(원탭 카메라 → 업로드)
- Public proof page: 로그인 없음, token만
- 메시지: 알림톡(정보성) + 실패 시 SMS 폴백
- v1 범위는 `docs/02_mvp_scope.md` 기준

## Architecture Baseline
- API: FastAPI + Postgres
- Web: Next.js (Pages Router) + Tailwind + Shadcn UI
- Auth: Clerk (JWT/JWKS)
- Storage: local upload (v1) → S3 presign (v1.5)

## Security Rules
- **절대 금지**: API 키, 비밀번호, 토큰 등 시크릿을 코드에 하드코딩
- 모든 시크릿은 환경변수(.env) 또는 시크릿 매니저 사용
- .env 파일은 절대 커밋하지 않음 (.gitignore 확인)
- SQL Injection, XSS, CSRF 등 OWASP Top 10 취약점 방지
- 사용자 입력은 항상 검증 및 sanitize
- JWT 토큰 만료 시간 적절히 설정
- HTTPS 필수 (production)
- 전화번호는 AES-256 암호화 저장

## Copyright & Attribution
- **본 프로젝트는 비즈니스 저작권 (Proprietary License) 적용**
- 무단 복제, 배포, 수정 금지
- 라이선스 문의: parkdavid31@gmail.com
- 커밋 메시지에 "Generated with Claude Code" 또는 "Co-Authored-By: Claude" 포함 금지
- AI 생성 코드임을 명시적으로 표기하지 않음
- 외부 라이브러리 사용 시 라이선스 호환성 확인 (상용 프로젝트에 적합한지 검토)
- GPL 라이선스 사용 금지 (copyleft 전파 위험)

## Git Branch Policy
- **절대 금지**: `main` 브랜치로 직접 push
- 모든 변경사항은 feature 브랜치에서 작업 후 PR을 통해 병합
- 브랜치 네이밍: `feat/`, `fix/`, `docs/`, `chore/` 접두사 사용
- 예시: `feat/qr-proof-upload`, `fix/auth-token-expiry`

## Git Commit Rules
- Conventional Commits 형식 사용:
  - `feat`: 새로운 기능
  - `fix`: 버그 수정
  - `docs`: 문서 변경
  - `style`: 코드 포맷팅
  - `refactor`: 리팩토링
  - `test`: 테스트 추가/수정
  - `chore`: 빌드, 설정 변경
- 커밋 메시지는 한글 또는 영어로 명확하게 작성
- 하나의 커밋에는 하나의 논리적 변경만 포함

## Code Style
- Python: PEP 8, Type hints 사용, ruff 린터
- TypeScript: ESLint + Prettier 준수
- 함수/변수명은 명확하고 의미 있게
- 매직 넘버 금지 (상수로 정의)
- 주석은 "왜"를 설명, "무엇"은 코드로

## Work Loop (Vibe Coding)
1) Read docs: 01~10
2) Implement smallest slice end-to-end
3) Write minimal tests
4) Update docs/ADR when decisions change

## Project Structure
```
saegim/
├── .github/                    # GitHub Actions CI/CD
│   ├── workflows/ci.yml
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── server/                     # FastAPI Backend
│   ├── src/
│   │   ├── api/
│   │   │   ├── main.py         # FastAPI app entry
│   │   │   ├── auth.py         # JWT/JWKS authentication
│   │   │   ├── deps.py         # Dependency injection
│   │   │   └── routes/
│   │   │       ├── admin.py    # Admin API endpoints
│   │   │       └── public.py   # Public API endpoints
│   │   ├── core/
│   │   │   ├── config.py       # Settings/env config
│   │   │   ├── database.py     # SQLAlchemy setup
│   │   │   └── security.py     # Encryption utilities
│   │   ├── models/             # SQLAlchemy ORM models
│   │   │   ├── organization.py
│   │   │   ├── order.py
│   │   │   ├── proof.py
│   │   │   ├── qr_token.py
│   │   │   ├── notification.py
│   │   │   └── short_link.py
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   │   ├── admin_service.py
│   │   │   ├── proof_service.py
│   │   │   ├── token_service.py
│   │   │   ├── notification_service.py
│   │   │   ├── short_link_service.py
│   │   │   └── message_render.py
│   │   ├── integrations/       # External providers
│   │   │   └── messaging/
│   │   │       ├── base.py
│   │   │       ├── mock.py
│   │   │       ├── kakao_i_connect.py
│   │   │       ├── naver_sens_sms.py
│   │   │       └── factory.py
│   │   └── utils/
│   │       └── rate_limiter.py
│   ├── alembic/                # DB migrations
│   ├── scripts/                # Utility scripts
│   ├── requirements.txt
│   └── Dockerfile
├── web/                        # Next.js Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── app/            # Admin dashboard (protected)
│   │   │   │   ├── orders/
│   │   │   │   ├── settings/
│   │   │   │   └── labels.tsx
│   │   │   ├── proof/[token].tsx   # Public upload
│   │   │   ├── p/[token].tsx       # Public verification
│   │   │   └── s/[code].tsx        # Short URL resolver
│   │   ├── components/
│   │   │   ├── ui/             # Shadcn UI components
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── UploadForm.tsx
│   │   │   └── BeforeAfterSlider.tsx
│   │   ├── services/
│   │   │   ├── api.ts          # Public API client
│   │   │   ├── adminApi.ts     # Admin API client
│   │   │   └── useAdminToken.ts
│   │   └── styles/
│   ├── middleware.ts           # Clerk auth middleware
│   ├── package.json
│   └── Dockerfile
├── docs/                       # Documentation (01-10)
├── specs/                      # Feature specifications
├── data/                       # Local data (gitignored)
├── docker-compose.yml
├── CLAUDE.md                   # This file
└── README.md
```

## Key Modules
| Module | Responsibility |
|--------|---------------|
| `server/src/services/proof_service.py` | 파일 업로드, 증빙 생성, 알림 트리거 |
| `server/src/services/token_service.py` | QR 토큰 생성/검증/무효화 |
| `server/src/services/notification_service.py` | 알림톡/SMS 발송, 폴백 처리 |
| `server/src/services/admin_service.py` | 주문/조직 CRUD, CSV 임포트 |
| `web/src/pages/proof/[token].tsx` | 공개 증빙 업로드 UI |
| `web/src/pages/p/[token].tsx` | 공개 증빙 확인 페이지 |

## Commands
```bash
# Backend
cd server && uvicorn src.api.main:app --reload

# Frontend
cd web && npm run dev

# Database
docker-compose up -d postgres

# Migrations
docker-compose exec api alembic upgrade head

# Lint (Backend)
cd server && ruff check src/

# Lint (Frontend)
cd web && npm run lint

# Type Check (Frontend)
cd web && npx tsc --noEmit
```

## API Endpoints
### Public (`/api/v1/public`)
- `GET /order/{token}` - 주문 요약 조회
- `POST /proof/{token}/upload` - 증빙 사진 업로드
- `GET /proof/{token}` - 증빙 데이터 조회
- `GET /s/{code}` - 단축 URL 리졸브

### Admin (`/api/v1/admin`)
- `GET /me` - 현재 사용자 정보
- `GET|PUT /org` - 조직 설정
- `GET|POST /orders` - 주문 목록/생성
- `GET /orders/{id}` - 주문 상세
- `POST /orders/{id}/token` - 토큰 발급
- `POST /orders/{id}/notify` - 알림 재발송

## Environment Variables
### Backend (server/.env)
```
DATABASE_URL=postgresql://...
ENCRYPTION_KEY=...          # AES-256 키
AUTH_JWKS_URL=...           # Clerk JWKS URL
MESSAGING_PROVIDER=mock     # mock|kakao_i_connect|sens_sms
```

### Frontend (web/.env.local)
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```
