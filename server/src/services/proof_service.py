import os
from fastapi import UploadFile
from server.src.services.mock_db import MockDbService, mock_db_service
from server.src.models.schemas import Proof


class ProofService:
    def __init__(self, db_service: MockDbService):
        self.db_service = db_service
        self.upload_dir = "data/uploads"
        # Ensure the upload directory exists
        os.makedirs(self.upload_dir, exist_ok=True)

    async def create_proof(self, token: str, file: UploadFile) -> Proof:
        """
        Validates the token, saves the uploaded file, and creates a proof record.
        """
        order = self.db_service.get_order_by_token(token)
        if not order:
            raise ValueError("Invalid or expired token.")

        # Save the file to the mock storage
        file_path = os.path.join(self.upload_dir, f"{order.id}_{file.filename}")
        try:
            with open(file_path, "wb") as buffer:
                buffer.write(await file.read())
        except Exception as e:
            # Handle file saving errors
            raise IOError(f"Failed to save file: {e}") from e

        # Create a proof record in the mock database
        proof = self.db_service.save_proof(order_id=order.id, file_path=file_path)
        return proof


# Dependency injection
def get_proof_service() -> ProofService:
    return ProofService(db_service=mock_db_service)
