# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Goal
ProofLink v1 MVP: QR 증빙(사진) + 자동 메시지 + 공개 링크 확인 + 업체 대시보드.

## Non-Negotiables
- QR에는 token만. **PII 금지**
- Proof 플로우는 30초 컷(원탭 카메라 → 업로드)
- Public proof page: 로그인 없음, token만
- 메시지: 알림톡(정보성) + 실패 시 SMS 폴백
- v1 범위는 `docs/02_mvp_scope.md` 기준

## Architecture
- API: FastAPI + Postgres + SQLAlchemy
- Web: Next.js 14 (Pages Router) + Tailwind + Shadcn UI
- Auth: Clerk (JWT/JWKS)
- Storage: local upload (v1) → S3 presign (v1.5)
- Clean Architecture: API → Service → Repository

## Commands

```bash
# Backend
cd server && uvicorn src.api.main:app --reload

# Frontend
cd web && npm run dev

# Database
docker-compose up -d postgres
docker-compose exec api alembic upgrade head

# Backend Tests
cd server && pytest                           # All tests
cd server && pytest tests/services/           # Service tests only
cd server && pytest tests/api/test_public.py  # Single file
cd server && pytest -k "test_token"           # Pattern match
cd server && pytest --cov=src                 # With coverage

# Backend Lint
cd server && ruff check src/
cd server && ruff format --check src/
cd server && ruff format src/                 # Auto-fix

# Frontend
cd web && npm run lint
cd web && npx tsc --noEmit
cd web && npm run build
```

## Project Structure

```
saegim/
├── server/                     # FastAPI Backend
│   ├── src/
│   │   ├── api/
│   │   │   ├── main.py         # FastAPI entry
│   │   │   ├── auth.py         # JWT/JWKS auth
│   │   │   ├── deps.py         # Dependency injection
│   │   │   └── routes/         # admin.py, public.py
│   │   ├── core/               # config.py, database.py, security.py
│   │   ├── models/             # SQLAlchemy ORM
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   └── integrations/       # External APIs (messaging/)
│   ├── tests/                  # pytest tests
│   └── alembic/                # DB migrations
├── web/                        # Next.js Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── app/            # Admin dashboard (protected)
│   │   │   ├── proof/[token].tsx   # Public upload
│   │   │   ├── p/[token].tsx       # Public verification
│   │   │   └── s/[code].tsx        # Short URL resolver
│   │   ├── components/ui/      # Shadcn UI
│   │   └── services/           # API clients
│   └── middleware.ts           # Clerk auth
├── docs/                       # Documentation (01-10)
└── specs/                      # Feature specifications
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
ENCRYPTION_KEY=...          # AES-256 키 (32자)
AUTH_JWKS_URL=...           # Clerk JWKS URL
MESSAGING_PROVIDER=mock     # mock|kakao_i_connect|sens_sms
```

### Frontend (web/.env.local)
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

## Security Rules
- **절대 금지**: API 키, 비밀번호, 토큰 등 시크릿을 코드에 하드코딩
- 전화번호는 AES-256 암호화 저장
- SQL Injection, XSS 등 OWASP Top 10 취약점 방지

## Copyright & Attribution
- **Proprietary License** - 무단 복제/배포/수정 금지
- 커밋 메시지에 "Generated with Claude Code" 또는 "Co-Authored-By: Claude" 포함 금지
- GPL 라이선스 사용 금지 (copyleft 전파 위험)

## Git Rules
- **절대 금지**: `main` 브랜치로 직접 push
- 브랜치 네이밍: `feat/`, `fix/`, `docs/`, `chore/` 접두사
- Conventional Commits 사용 (feat, fix, docs, refactor, test, chore)

## Development Principles
- **TDD**: 테스트 먼저 작성 → Red/Green/Refactor
- **Clean Architecture**: 계층 분리 (API → Service → Repository)
- **Dependency Injection**: 테스트 용이성 확보

## Work Loop
1. Read docs: 01~10
2. Write tests first (TDD)
3. Implement smallest slice end-to-end
4. Update docs/ADR when decisions change

## Response Principles
- **결정 중심**: 옵션 나열 X, 최선의 결정 제시
- **우선순위 표기**: P0 (필수) / P1 (중요) / P2 (개선)
- **근거 확보**: 공식 문서 참조, 코드 라인 명시 (예: `file.py:123`)
- **금지 표현**: "아마도...", "~일 것 같습니다", 출처 없는 주장
