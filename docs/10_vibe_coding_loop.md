# 10. 1인 바이브코딩 루프 (Solo Loop)

For foundational development principles, refer to the project constitution: `.specify/memory/constitution.md`

## Loop (Survival MVP Mode)

The goal is speed and direct value. Docs are for **Communication & Context**, not **Compilation**. They should be just enough to align, not a bureaucratic hurdle. Complex `speckit` script chains are optional; manual updates are fine.

1. **Define Spec (Docs)**: Quickly outline the user story, scope, and basic API/data needs. Keep it minimal.
2. **Code & Test (TDD)**: Write a failing test that captures the requirement, then write the code to make it pass.
3. **Update Docs (If Changed)**: If the implementation significantly diverged from the initial spec, update the docs to reflect the current state.

## Slice Order (recommended)
1) Public token landing + proof upload (mock storage)
2) Backoffice: create order + issue token + view proof status
3) Notification log + resend (mock provider)
4) CSV import
5) Rate limiting + revoke/reissue tokens

## Guardrails
- If a feature doesn't reduce CS, it’s probably v2.
- Every public link must be revocable.
