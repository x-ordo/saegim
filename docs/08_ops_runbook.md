# 08. 운영 런북 (Runbook)

## Local
- `make up`
- seed admin user (TODO after auth implemented)

## Production (v1)
- DB backups daily
- Upload storage capacity monitoring
- Notification provider health check
- Audit log retention policy (e.g., 180 days)

## Incident Playbooks
### Token leaked
1) revoke token
2) reissue token
3) resend link

### Messaging outage
1) force SMS only
2) queue alimtalk retries
