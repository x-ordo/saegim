# CLAUDE.md — Agent Instructions (ProofLink)

## Goal
Build v1 MVP of ProofLink: QR 증빙(사진) + 자동 메시지 + 공개 링크 확인 + 업체 대시보드.

## Non‑Negotiables
- QR에는 token만. **PII 금지**
- Proof 플로우는 30초 컷(원탭 카메라 → 업로드)
- Public proof page: 로그인 없음, token만
- 메시지: 알림톡(정보성) + 실패 시 SMS 폴백
- v1 범위는 `docs/02_mvp_scope.md` 기준

## Architecture Baseline
- API: FastAPI + Postgres
- Web: Next.js (App Router) + minimal UI
- Storage: local upload (v1) → S3 presign (v1.5)

## Work Loop (Vibe Coding)
1) Read docs: 01~10
2) Implement smallest slice end-to-end
3) Write minimal tests
4) Update docs/ADR when decisions change
