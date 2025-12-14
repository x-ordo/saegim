# SPECKIT_PROMPT.md — 1인 바이브코딩 명령 템플릿

## Context
We are building a B2B SaaS for proof-of-delivery using QR → photo → notification → public link.
MVP scope is strictly defined in docs/02_mvp_scope.md.

## Rules
- Ship end-to-end vertical slices.
- No scope creep.
- Keep tokens secure (no PII in QR).
- Favor web-first, app later.
- Write docs as you code.

## Task Template
### Objective
(what to ship)

### User Story
(as Vendor CS / Courier / Buyer)

### Acceptance Criteria
- [ ]
- [ ]

### API
List endpoints to create/update.

### DB
List tables/fields to create/update.

### UI
List screens/components.

### Edge Cases
- network failure
- duplicate photo
- token revoked

### Done Definition
- working on localhost via docker compose
- minimal tests pass
- docs updated
