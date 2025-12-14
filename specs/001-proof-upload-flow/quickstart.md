# Quickstart: Testing the Proof Upload Flow

This guide provides the steps to test the end-to-end proof of delivery upload flow for MVP Slice 1.

## Prerequisites

1.  The application is running locally (`docker compose up`).
2.  An `Order` and a corresponding `QR_Token` exist in the database. For testing, you can create these manually or via a seed script.

## Testing Steps

### 1. Simulate the QR Code Scan

-   Assume you have a valid token, e.g., `abcdef123456`.
-   Open a mobile browser (or use your desktop browser's mobile simulator).
-   Navigate to the proof landing page URL: `http://localhost:3000/proof/abcdef123456`

### 2. Verify the Landing Page

-   The page should load quickly.
-   It should display the minimal order details corresponding to the token (e.g., "Order #12345").
-   A clear "Take Photo" or "Upload Proof" button should be visible.

### 3. Upload a Photo

-   Click the "Upload Proof" button.
-   Your device's camera should open, or a file selection dialog should appear.
-   Take a new photo or select an existing image file from your device.
-   Confirm the selection. The upload process will begin automatically.

### 4. Verify the Success State

-   Upon successful upload, the UI should change to a "Success!" confirmation screen.
-   The message should be clear and unambiguous.
-   There should be no further actions required from the user.

### 5. Test the Upload Failure and Retry Flow

-   **To simulate failure**: Before uploading, disconnect your device from the network or use browser developer tools to throttle the connection to "Offline".
-   Attempt to upload a photo.
-   The upload should fail.
-   **Expected Result**: The UI must display an error message and a "Retry Upload" button. The photo you selected should not be lost.
-   Reconnect to the network.
-   Click the "Retry Upload" button.
-   **Expected Result**: The upload should now succeed, and the "Success!" confirmation should appear.
