# Tasks: Public Proof Landing & Upload (MVP Slice 1)

**Input**: Design documents from `/specs/001-proof-upload-flow/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: Which user story this task belongs to (US1)

---

## Phase 1: Backend Setup (FastAPI)

**Purpose**: Prepare the server-side environment for the new feature.

- [X] T001 [P] Create Pydantic models for `Order`, `Proof`, and `QR_Token` in `server/src/models/`.
- [X] T002 Create a mock database service in `server/src/services/mock_db.py` that can retrieve an order by token and save a proof record.
- [X] T003 Set up the main API router in `server/src/api/main.py`.
- [X] T004 [P] Configure structured logging for the FastAPI application.

---

## Phase 2: Frontend Setup (Next.js)

**Purpose**: Prepare the client-side environment for the new feature.

- [X] T005 [P] Create the page file `web/src/pages/proof/[token].tsx`.
- [X] T006 Set up a service module in `web/src/services/api.ts` for making requests to the backend.
- [X] T007 [P] Create basic UI components in `web/src/components/` for the upload page (e.g., OrderSummary, UploadButton, StatusMessage).

---

## Phase 3: User Story 1 - Backend Implementation (Priority: P1) 🎯 MVP

**Goal**: Implement the backend logic to securely receive and store the proof of delivery.
**Independent Test**: The `/proof/{token}` endpoint can be tested independently using an HTTP client like `curl` or `pytest-httpserv`.

### Tests for User Story 1 (Backend) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T008 [P] [US1] Write a contract test in `server/tests/contract/test_proof_upload.py` for the `POST /proof/{token}` endpoint, covering success, invalid token (404), and missing file (422) cases.
- [X] T009 [P] [US1] Write a unit test in `server/tests/unit/test_proof_service.py` for the service that handles file saving and associating it with an order.

### Implementation for User Story 1 (Backend)

- [X] T010 [US1] Implement the proof upload service in `server/src/services/proof_service.py` that takes a file and a token, saves the file to the mock storage (`data/uploads/`), and updates the mock DB.
- [X] T011 [US1] Implement the `POST /proof/{token}` endpoint in `server/src/api/main.py`, using the `proof_service`. Ensure it handles file uploads (`UploadFile`) correctly.
- [X] T012 [US1] Add validation and error handling to the endpoint for invalid tokens and file types.

**Checkpoint**: At this point, the backend API should be fully functional and testable independently.

---

## Phase 4: User Story 1 - Frontend Implementation (Priority: P1) 🎯 MVP

**Goal**: Implement the client-side experience for the courier to upload the proof.
**Independent Test**: The frontend page can be tested with a mocked backend API to verify all UI states and the retry logic.

### Tests for User Story 1 (Frontend) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T013 [P] [US1] Write a component test for the main upload page in `web/tests/components/ProofPage.test.tsx`, testing the initial render, button clicks, and state changes.
- [X] T014 [P] [US1] Write a test for the upload retry logic, simulating a network failure and verifying the UI allows a retry.

### Implementation for User Story 1 (Frontend)

- [X] T015 [P] [US1] Implement the `OrderSummary` component in `web/src/components/OrderSummary.tsx` to display data fetched from a (mocked) order context.
- [X] T016 [US1] Implement the core logic in `web/src/pages/proof/[token].tsx` to fetch order data based on the token from the URL.
- [X] T017 [US1] Add the camera/file input functionality to the page, allowing a user to select a file.
- [X] T018 [US1] Implement the file upload logic in `web/src/services/api.ts`, including the state management for loading, success, and error states.
- [X] T019 [US1] **CRITICAL**: Implement the upload failure and retry mechanism. If an upload fails, store the file in the component's state and display a "Retry" button.
- [X] T020 [US1] Implement the final success and error message components (`StatusMessage`) and render them based on the upload state.

**Checkpoint**: The full end-to-end user flow should be functional.

---

## Dependencies & Execution Order

- **Phase 1 & 2 (Setup)** can run in parallel.
- **Phase 3 (Backend)** depends on Phase 1.
- **Phase 4 (Frontend)** depends on Phase 2.
- Backend and Frontend implementation (Phase 3 & 4) can happen in parallel, but frontend development will be easier if the real backend API is available.
- Within each phase, **Tests** MUST be written and fail before **Implementation**.
