# 07. 보안/프라이버시

## Must
- QR/token: PII 금지
- Public endpoints: token only + rate limiting
- Token revoke/reissue supported
- Logs: phone number는 마스킹/해시 중심
- contacts.phone_e164 encryption at rest

## Recommended (v1.5)
- short-lived upload URL (S3 presign)
- signed URLs for proof images

## Threats
- token brute force → 충분히 긴 랜덤 token + rate limit
- screenshot leakage → token revoke
- malicious reuse of old photo → (v2) duplicate detection
