import os
import logging
from typing import Optional, List
from datetime import datetime

from fastapi import UploadFile, BackgroundTasks
from sqlalchemy.orm import Session

from src.models import Proof, ProofType, OrderStatus
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
        proof_type: ProofType = ProofType.AFTER,
    ) -> dict:
        """
        Validates the token, saves the uploaded file, creates a proof record.
        Only triggers notifications and invalidates token when proof_type is AFTER.
        """
        # Validate token and get order
        order = self.token_service.get_order_by_token(token)
        if not order:
            raise ValueError("Invalid or expired token.")

        # Check if same proof_type already exists for this order
        existing_proof = (
            self.db.query(Proof)
            .filter(Proof.order_id == order.id, Proof.proof_type == proof_type)
            .first()
        )
        if existing_proof:
            raise ValueError(f"{proof_type.value} proof already uploaded for this order.")

        # Generate unique & safe filename (avoid user-supplied names)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        original = os.path.basename(file.filename or "")
        _, ext = os.path.splitext(original)
        ext = (ext or "").lower()
        allowed = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
        if ext not in allowed:
            # fallback based on mime
            if (file.content_type or "").lower() == "image/png":
                ext = ".png"
            else:
                ext = ".jpg"
        safe_filename = f"{order.id}_{proof_type.value}_{timestamp}{ext}"
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
            proof_type=proof_type,
            file_path=safe_filename,  # Store relative path
            file_size=len(contents),
            mime_type=file.content_type,
        )
        self.db.add(proof)

        # Only update status, invalidate token, and send notifications for AFTER proof
        if proof_type == ProofType.AFTER:
            order.status = OrderStatus.PROOF_UPLOADED
            self.token_service.invalidate_token_after_proof(token)

        self.db.commit()
        self.db.refresh(proof)

        logger.info(f"Created {proof_type.value} proof {proof.id} for order {order.id}")

        # Trigger notifications only for AFTER proof (non-blocking)
        if proof_type == ProofType.AFTER:
            await self.notification_service.send_dual_notification(
                order=order,
                background_tasks=background_tasks,
            )

        return {
            "status": "success",
            "proof_id": proof.id,
            "proof_type": proof_type,
            "message": f"{proof_type.value} proof uploaded successfully.",
        }

    def get_proofs_by_order_id(self, order_id: int) -> List[Proof]:
        """Get all proofs for a specific order."""
        return self.db.query(Proof).filter(Proof.order_id == order_id).all()

    def get_proof_by_order_id(self, order_id: int, proof_type: Optional[ProofType] = None) -> Optional[Proof]:
        """Get proof for a specific order, optionally filtered by type."""
        query = self.db.query(Proof).filter(Proof.order_id == order_id)
        if proof_type:
            query = query.filter(Proof.proof_type == proof_type)
        return query.first()
