import os
import logging
from typing import Optional
from datetime import datetime

from fastapi import UploadFile, BackgroundTasks
from sqlalchemy.orm import Session

from src.models import Proof, Order, OrderStatus
from src.core.config import settings
from src.services.token_service import TokenService
from src.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class ProofService:
    """Service for managing proof uploads."""

    def __init__(self, db: Session):
        self.db = db
        self.upload_dir = settings.LOCAL_UPLOAD_DIR
        self.token_service = TokenService(db)
        self.notification_service = NotificationService(db)
        # Ensure the upload directory exists
        os.makedirs(self.upload_dir, exist_ok=True)

    async def create_proof(
        self,
        token: str,
        file: UploadFile,
        background_tasks: BackgroundTasks,
    ) -> dict:
        """
        Validates the token, saves the uploaded file, creates a proof record,
        and triggers dual notifications.
        """
        # Validate token and get order
        order = self.token_service.get_order_by_token(token)
        if not order:
            raise ValueError("Invalid or expired token.")

        # Check if proof already exists for this order
        existing_proof = self.db.query(Proof).filter(Proof.order_id == order.id).first()
        if existing_proof:
            raise ValueError("Proof already uploaded for this order.")

        # Generate unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{order.id}_{timestamp}_{file.filename}"
        file_path = os.path.join(self.upload_dir, safe_filename)

        # Save file
        try:
            contents = await file.read()
            with open(file_path, "wb") as buffer:
                buffer.write(contents)
        except Exception as e:
            logger.error(f"Failed to save file for order {order.id}: {e}")
            raise IOError(f"Failed to save file: {e}") from e

        # Create proof record
        proof = Proof(
            order_id=order.id,
            file_path=safe_filename,  # Store relative path
            file_size=len(contents),
            mime_type=file.content_type,
        )
        self.db.add(proof)

        # Update order status
        order.status = OrderStatus.PROOF_UPLOADED

        # Invalidate token (one-time use)
        self.token_service.invalidate_token_after_proof(token)

        self.db.commit()
        self.db.refresh(proof)

        logger.info(f"Created proof {proof.id} for order {order.id}")

        # Trigger notifications (non-blocking)
        await self.notification_service.send_dual_notification(
            order=order,
            background_tasks=background_tasks,
        )

        return {
            "status": "success",
            "proof_id": proof.id,
            "message": "Proof of delivery uploaded successfully.",
        }

    def get_proof_by_order_id(self, order_id: int) -> Optional[Proof]:
        """Get proof for a specific order."""
        return self.db.query(Proof).filter(Proof.order_id == order_id).first()
