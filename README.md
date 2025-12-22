# ProofLink (새김)

배송/화환/수리 현장 사진 인증 + 자동 알림을 위한 B2B SaaS.

## Overview

- 업체가 주문 등록 → QR 토큰 발급
- 현장 직원이 링크/QR로 접속 → 사진 업로드 (Before/After)
- 고객에게 카카오 알림톡/SMS로 사진 인증 링크 전송
- 관리자용 웹 대시보드 제공

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, PostgreSQL, SQLAlchemy |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Shadcn UI |
| Auth | Clerk (JWT/JWKS) |
| Messaging | Kakao AlimTalk, NAVER SENS SMS |

## Quick Start

### Docker (권장)

```bash
# 환경 설정
cp server/.env.example server/.env

# 컨테이너 실행
docker compose up --build

# DB 마이그레이션
docker compose exec api alembic upgrade head

# 테스트 데이터 생성
docker compose exec api python -m scripts.seed_test_data
```

### 로컬 개발

```bash
# Backend
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.api.main:app --reload

# Frontend
cd web
npm install
npm run dev
```

## URLs

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API Docs | http://localhost:8000/docs |
| Public API | http://localhost:8000/api/v1/public |
| Admin API | http://localhost:8000/api/v1/admin |

## Project Structure

```
saegim/
├── server/             # FastAPI Backend
│   ├── src/
│   │   ├── api/        # Routes, auth
│   │   ├── core/       # Config, database
│   │   ├── models/     # SQLAlchemy models
│   │   ├── schemas/    # Pydantic schemas
│   │   ├── services/   # Business logic
│   │   └── integrations/  # External APIs
│   └── alembic/        # DB migrations
├── web/                # Next.js Frontend
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # UI components
│   │   └── services/   # API clients
│   └── middleware.ts   # Auth middleware
├── docs/               # Documentation
└── docker-compose.yml
```

## Key Features

### Public Flow
- `/proof/{token}` - 사진 업로드 페이지
- `/p/{token}` - 사진 확인 페이지 (Before/After 슬라이더)
- `/s/{code}` - 단축 URL 리다이렉트

### Admin Dashboard
- `/app/orders` - 주문 목록
- `/app/orders/new` - 주문 생성
- `/app/orders/{id}` - 주문 상세 (토큰 발급, 알림 재발송)
- `/app/settings/branding` - 화이트라벨 설정
- `/app/settings/messaging` - 메시지 템플릿 설정
- `/app/labels` - 라벨 일괄 출력

## Authentication

### Clerk 설정

1. [Clerk Dashboard](https://dashboard.clerk.com)에서 앱 생성
2. 환경 변수 설정:

```bash
# web/.env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# server/.env
AUTH_JWKS_URL=https://{your-clerk-domain}/.well-known/jwks.json
AUTH_ISSUER=https://{your-clerk-domain}
```

### 개발용 API Key (fallback)

```bash
# server/.env
ALLOW_ADMIN_API_KEY=true
ADMIN_API_KEY=your-dev-key
```

요청 헤더: `X-Admin-Key: your-dev-key`

## Environment Variables

### Backend (server/.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | Yes |
| `ENCRYPTION_KEY` | 전화번호 암호화 키 (32자) | Yes |
| `AUTH_JWKS_URL` | Clerk JWKS URL | Yes |
| `MESSAGING_PROVIDER` | `mock`, `kakao_i_connect`, `sens_sms` | No (default: mock) |

### Frontend (web/.env.local)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | API 서버 URL | Yes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk 공개 키 | Yes |
| `CLERK_SECRET_KEY` | Clerk 비밀 키 | Yes |

## License

Proprietary License - All rights reserved.

라이선스 문의: parkdavid31@gmail.com
