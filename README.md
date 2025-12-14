# ProofLink

QR 스캔 → 사진 1장 업로드 → 자동 메시지 발송(알림톡/SMS) → 로그인 없이 링크 확인(화이트라벨)까지 이어지는 **배송/배치 증빙 자동화 SaaS**.

- **Target**: 화환/꽃배달 업체(온라인몰·콜센터·도매 네트워크) → 이후 행사/납품 전반 확장
- **Core**: `Order → QR Token → Proof → Notify → Public Proof Page`
- **v1**: 웹(PWA) 우선, 앱은 v2

## Quick Start (Local)

```bash
cp .env.example .env
docker compose up -d --build
# API: http://localhost:8000
# Web: http://localhost:3000
```

## Repo Docs
- 제품/범위: `docs/01_product_overview.md`, `docs/02_mvp_scope.md`
- 사용자 플로우: `docs/03_user_flows.md`
- 데이터/ERD: `docs/04_data_model.md`
- API 계약: `docs/05_api_contract.md`
- 메시지 템플릿: `docs/06_message_templates.md`
- 보안/프라이버시: `docs/07_security_privacy.md`
- 운영/런북: `docs/08_ops_runbook.md`
- 로드맵: `docs/09_roadmap.md`
- 1인 바이브코딩 루프: `docs/10_vibe_coding_loop.md`
- 에이전트 지시서: `CLAUDE.md`, `CODEX.md`, `SPECKIT_PROMPT.md`
- **Foundational Development Principles**: `.specify/memory/constitution.md`

## Product Principles (Non-Negotiable)
- 구매자/수신자: **로그인 0, 토큰 링크만**
- QR에는 **PII(개인정보) 절대 금지**
- 증빙 등록 플로우는 **30초 컷**
- 알림톡 실패 시 **SMS 폴백 기본 ON**
- v1은 “증빙 자동화”에만 집중 (정산/배차/AI/OCR은 v2)

## License
TBD (default: private).
