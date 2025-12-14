# 10. 1인 바이브코딩 루프 (Solo Loop)

For foundational development principles, refer to the project constitution: `.specify/memory/constitution.md`

## Loop
1) Define 1 vertical slice (end-to-end)
2) Update docs (scope + API + data)
3) Implement
4) Minimal tests
5) Demo on localhost (docker compose)
6) Commit with message: `feat(slice): ...`

## Slice Order (recommended)
1) Public token landing + proof upload (mock storage)
2) Backoffice: create order + issue token + view proof status
3) Notification log + resend (mock provider)
4) CSV import
5) Rate limiting + revoke/reissue tokens

## Guardrails
- If a feature doesn't reduce CS, it’s probably v2.
- Every public link must be revocable.
