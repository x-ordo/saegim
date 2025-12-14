# Feature Specification: Public Proof Landing & Upload (MVP Slice 1)

**Feature Branch**: `001-proof-upload-flow`
**Created**: 2025-12-14
**Status**: Draft
**Input**: User description: "Implement the core end-to-end flow for couriers to upload proof of delivery via QR code."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Courier Proof Upload (Priority: P1)

A courier with no prior login or setup scans a QR code on a delivery item. They are taken to a simple, fast-loading mobile web page. The page displays essential order details to confirm they have the right item. The courier uses their phone's camera to take a photo of the delivered item and uploads it. Upon successful upload, they see a clear confirmation message. The entire process is designed to be completed in under 30 seconds with minimal friction.

**Why this priority**: This is the absolute core "First Vertical Slice" of the product. Without this flow, the entire value proposition of automated proof of delivery is blocked.

**Independent Test**: This flow can be tested end-to-end by generating a single QR token and having a tester (acting as the courier) scan it, upload an image, and verify the success confirmation. The backend can then be checked to confirm the image was received and associated with the correct token.

**Acceptance Scenarios**:

1.  **Given** a valid QR token for an active order, **When** the courier scans the QR code and navigates to the URL, **Then** the system MUST display a public landing page with the corresponding order number and context.
2.  **Given** the courier is on the public landing page, **When** they tap the "Camera" button, **Then** the device's native camera interface MUST open.
3.  **Given** the courier has taken a photo, **When** they confirm the photo and tap "Upload", **Then** the system MUST upload the image file and associate it with the order.
4.  **Given** the upload is successful, **When** the processing is complete, **Then** the UI MUST display a "Success" confirmation message.
5.  **Given** the upload fails due to a network error, **When** the failure is detected, **Then** the UI MUST show a "Retry Upload" button and preserve the selected photo file in the local state.

---

### Edge Cases

-   **Invalid/Expired Token**: What happens when a courier scans a QR code with an invalid, expired, or already-used token? → The system should display a clear error page with a message like "Invalid or Expired Link. Please contact support." and should NOT allow any upload action.
-   **Large File Size**: How does the system handle an unusually large photo file? → For v1, we can enforce a reasonable client-side file size limit (e.g., 10MB) before upload begins. If the file is too large, the UI should display a warning.
-   **Unsupported File Type**: What if the user tries to upload a non-image file? → The file selector should be configured to only accept image types (`image/*`). Client-side validation should prevent the upload of non-image files.

## Requirements *(mandatory)*

### Functional Requirements

-   **FR-001**: The system MUST provide a public, unauthenticated web page accessible via a unique token-based URL.
-   **FR-002**: The landing page MUST display a minimal order summary (e.g., Order No, Context) based on the token.
-   **FR-003**: The UI MUST present a clear call-to-action for the user to take a photo or select an image file.
-   **FR-004**: The system MUST handle image uploads from the user's device.
-   **FR-005**: Upon successful upload, the system MUST associate the uploaded image with the correct order via the token.
-   **FR-006**: The UI MUST provide clear visual feedback for success and failure states of the upload process.
-   **FR-007**: In case of a network-related upload failure, the UI MUST allow the user to retry the upload without forcing them to retake the photo. The image data should be retained in the client's state.
-   **FR-008**: Access to the upload page and the ability to upload MUST be granted strictly based on the validity of the token in the URL.

### Key Entities *(include if feature involves data)*

-   **Order**: Represents the delivery order. Contains information like `order_number` and `context` that are displayed on the landing page. It is associated with a `qr_token`.
-   **Proof**: Represents the uploaded proof of delivery. Contains a reference to the `order`, the `file_path` of the uploaded image (mocked as a local path for v1), and a `timestamp`.
-   **QR_Token**: A unique, secure token that links a physical QR code to a specific `order`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

-   **SC-001**: The end-to-end flow, from scanning the QR code to seeing the "Success" confirmation, can be completed in under 30 seconds on a standard 4G mobile connection.
-   **SC-002**: The user satisfaction rate for the upload flow, measured by a simple post-upload survey (e.g., a "Was this easy?" prompt), should be above 95% "Yes".
-   **SC-003**: The rate of upload failures that are successfully recovered using the "Retry" mechanism should be tracked. A successful implementation will see a high recovery rate, indicating the retry feature is working as intended.
-   **SC-004**: The system must successfully process 100 concurrent upload requests without errors or significant performance degradation.