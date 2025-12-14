# API Contracts: Public Proof Upload

This document defines the API endpoints for the proof of delivery upload feature.

## Endpoints

### 1. Upload Proof of Delivery

- **HTTP Method**: `POST`
- **Endpoint**: `/proof/{token}`
- **Description**: Uploads a proof of delivery image for the order associated with the given token.
- **URL Parameters**:
    - `token` (String, Required): The unique token from the QR code URL.
- **Request Body**:
    - The request body should be `multipart/form-data`.
    - It must contain a single file field named `file`.
    - **Example field**: `file`: The image file to be uploaded.
- **Success Response (200 OK)**:
    ```json
    {
      "status": "success",
      "message": "Proof of delivery uploaded successfully.",
      "proof_id": 123
    }
    ```
- **Error Responses**:
    - **404 Not Found**: If the `token` is invalid, expired, or does not correspond to an active order.
        ```json
        {
          "detail": "Invalid or expired token."
        }
        ```
    - **422 Unprocessable Entity**: If the `file` part is missing from the request or is not an image.
        ```json
        {
          "detail": "File part missing or invalid file type."
        }
        ```
    - **500 Internal Server Error**: For unexpected server-side errors during file processing or database operations.
        ```json
        {
          "detail": "An unexpected error occurred while processing the upload."
        }
        ```
