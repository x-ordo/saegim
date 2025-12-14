# 02. MVP 범위 (Scope)

## In Scope (v1)
### Vendor Backoffice
- Order CRUD (manual)
- CSV import (recommended)
- Generate/print QR token
- View proof status (thumbnail + timestamp)
- Resend notifications (buyer/recipient)
- Audit log view (minimal)

### Proof Mobile Web
- QR token landing (order summary)
- One-tap camera → capture → upload
- Client-side Retry (Local Storage / Background Sync)
- Done page

### Public Proof Page
- No login
- Show photo + minimal context + timestamp
- Vendor branding (logo; domain later)

### Messaging
- Provider abstraction (mock first)
- Alimtalk template send (v1.5 if needed)
- SMS fallback enabled

## Out of Scope (v1)
- Dispatch/TMS
- Payments/billing automation
- Multi-photo/video
- OCR/AI
- Partner portal, complex RBAC
