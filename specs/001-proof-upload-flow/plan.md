# Implementation Plan: Public Proof Landing & Upload (MVP Slice 1)

**Branch**: `001-proof-upload-flow` | **Date**: 2025-12-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-proof-upload-flow/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.claude/commands/speckit.plan.md` for the execution workflow.

## Summary

Implement the core end-to-end flow for couriers to upload proof of delivery via QR code. This is the first vertical slice of the product, involving a Next.js frontend for the mobile web interface and a FastAPI backend to handle the image upload and association with an order.

## Technical Context

**Language/Version**: Python 3.11+ (for FastAPI), TypeScript (for Next.js)
**Primary Dependencies**: FastAPI, Next.js, Uvicorn
**Storage**: Local filesystem (mock for v1 in `data/uploads/`)
**Testing**: pytest (for backend), Jest/React Testing Library (for frontend)
**Target Platform**: Mobile Web (for frontend), Linux Server (for backend)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Sub-30-second completion time for the entire courier upload flow.
**Constraints**: Must support retry on upload failure without losing the captured photo. Use a simple Service Layer pattern as per the constitution.
**Scale/Scope**: MVP for the single-user (courier) proof-of-delivery flow.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [X] **I. Core Domain Logic First**: This feature will use a standard Service Layer pattern in the FastAPI backend, which is aligned.
- [X] **II. API-First (HTTP/JSON)**: The interaction between the Next.js frontend and FastAPI backend will be a pure HTTP/JSON API. No CLI is required.
- [X] **III. Test-First (NON-NEGOTIABLE)**: TDD will be followed for both backend and frontend components.
- [X] **IV. Integration Testing**: An integration test will be created to validate the full flow from a token-based URL to a successful upload.
- [X] **V. Observability**: Structured logging will be implemented in the FastAPI backend.
- [X] **VI. Pragmatism over Purity**: The focus is on delivering this core vertical slice quickly, using mocked storage and a simple architecture.

## Project Structure

### Documentation (this feature)

```text
specs/001-proof-upload-flow/
├── plan.md              # This file
├── research.md          # Phase 0 output (skipped for this well-defined feature)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

web/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/
```

**Structure Decision**: The project will use the existing monorepo structure with a `server/` directory for the FastAPI backend and a `web/` directory for the Next.js frontend. This aligns with the existing `README.md` files in those directories and the "Web application" project type.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (No violations) | N/A        | N/A                                 |