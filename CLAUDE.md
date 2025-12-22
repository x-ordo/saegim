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
- Web: Next.js (App Router) + minimal UI
- Storage: local upload (v1) → S3 presign (v1.5)

## Security Rules
- **절대 금지**: API 키, 비밀번호, 토큰 등 시크릿을 코드에 하드코딩
- 모든 시크릿은 환경변수(.env) 또는 시크릿 매니저 사용
- .env 파일은 절대 커밋하지 않음 (.gitignore 확인)
- SQL Injection, XSS, CSRF 등 OWASP Top 10 취약점 방지
- 사용자 입력은 항상 검증 및 sanitize
- JWT 토큰 만료 시간 적절히 설정
- HTTPS 필수 (production)

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
- Python: PEP 8, Type hints 사용
- TypeScript: ESLint + Prettier 준수
- 함수/변수명은 명확하고 의미 있게
- 매직 넘버 금지 (상수로 정의)
- 주석은 "왜"를 설명, "무엇"은 코드로

## Work Loop (Vibe Coding)
1) Read docs: 01~10
2) Implement smallest slice end-to-end
3) Write minimal tests
4) Update docs/ADR when decisions change

## File Structure
```
server/         # FastAPI backend
  src/          # Source code
  alembic/      # DB migrations
web/            # Next.js frontend
  src/          # Source code
docs/           # Project documentation
specs/          # Feature specifications
```

## Commands
```bash
# Backend
cd server && uvicorn src.main:app --reload

# Frontend
cd web && npm run dev

# Database
docker-compose up -d postgres
```
