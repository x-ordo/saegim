# 05. API 계약 (Contract)

## Auth
- POST /auth/login
- GET /auth/me

## Orders
- GET /orders?q=&status=
- POST /orders
- GET /orders/{id}
- PATCH /orders/{id}
- POST /orders/import (CSV)

## Token / QR
- POST /orders/{id}/token
- POST /orders/{id}/token/revoke
- GET /public/proof/{token}  # public proof page data
- GET /public/order/{token}  # proof landing order summary

## Proof
- POST /public/proof/{token}/upload (multipart)
- GET /orders/{id}/proof

## Notifications
- POST /orders/{id}/notify (buyer/recipient; resend)
- GET /orders/{id}/notifications

## Error Codes (minimum)
- TOKEN_INVALID
- TOKEN_REVOKED
- UPLOAD_FAILED
- NOTIFY_FAILED
- RATE_LIMITED
