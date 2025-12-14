# CODEX.md — Implementation Prompt

You are implementing the MVP. Follow these rules:
- Do NOT add features outside MVP scope.
- Keep UI extremely simple. Mobile-first for Proof pages.
- Prefer boring, reliable choices. No fancy frameworks.
- Add rate limiting on public token endpoints.
- Every endpoint must have clear request/response schemas.
- Log all notification attempts (requested/sent/failed/fallback).

Deliverables per task:
- code changes
- API updates in docs/05_api_contract.md
- DB migration notes in docs/04_data_model.md (or migrations folder)
