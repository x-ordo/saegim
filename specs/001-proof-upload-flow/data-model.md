# Data Model: Public Proof Landing & Upload

This document outlines the data entities involved in the proof of delivery upload flow.

## Key Entities

### Order
- **Description**: Represents a customer's order that requires proof of delivery.
- **Attributes**:
    - `id` (PK): Unique identifier for the order.
    - `order_number` (String): A human-readable order identifier.
    - `context` (String): A brief description of the order contents or delivery instructions.
    - `created_at` (Timestamp): When the order was created.
- **Relationships**:
    - Has one `qr_token`.
    - Has one `proof`.

### QR_Token
- **Description**: A unique, secure token that links a physical QR code to a specific `Order`.
- **Attributes**:
    - `id` (PK): Unique identifier.
    - `token` (String, Unique): The secure, random string used in the URL.
    - `order_id` (FK): A reference to the `Order` this token is for.
    - `is_valid` (Boolean): A flag to indicate if the token can be used. Defaults to `true`.
    - `created_at` (Timestamp): When the token was generated.
- **Relationships**:
    - Belongs to one `Order`.

### Proof
- **Description**: Represents the proof of delivery uploaded by the courier.
- **Attributes**:
    - `id` (PK): Unique identifier for the proof record.
    - `order_id` (FK): A reference to the `Order` this proof is for.
    - `file_path` (String): The path to the uploaded image file on the local filesystem (for v1).
    - `uploaded_at` (Timestamp): When the proof was successfully uploaded.
- **Relationships**:
    - Belongs to one `Order`.
