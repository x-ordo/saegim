# 03. 사용자 플로우 (User Flows)

## Vendor CS / Ops
1) Create or Import Order
2) Issue token → Print QR label → Attach to product
3) Monitor proof status
4) On issue: resend / request re-proof / revoke token

## Courier / Partner Shop (On-site)
1) Scan QR
2) Tap "Start camera"
3) Take 1 photo
4) Upload → Done

## Buyer / Recipient
1) Receive Kakao/SMS
2) Open link (no login)
3) View photo + context

## Failure Flows
- Token invalid/revoked → show error + call vendor
- On upload failure, save photo locally and retry automatically/manually. Do NOT force retake.
- Messaging fails → fallback SMS (log both)
