# 04. 데이터 모델 (ERD)

## Tables (v1)
- organizations
- users
- contacts
- orders
- qr_tokens
- proofs
- notifications
- audit_logs

## Key Policies
- QR contains only `qr_tokens.token`
- `contacts.phone_e164` MUST be stored encrypted at rest (application-side or DB-side).
- `notifications` keeps provider response + fallback info

## Indexes (minimum)
- orders(organization_id, created_at desc)
- qr_tokens(token unique)
- proofs(order_id unique)  # v1: single proof per order
- notifications(order_id, created_at desc)
