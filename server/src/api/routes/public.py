import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, BackgroundTasks
from sqlalchemy.orm import Session
from starlette.status import HTTP_404_NOT_FOUND, HTTP_422_UNPROCESSABLE_ENTITY, HTTP_429_TOO_MANY_REQUESTS

from src.core.database import get_db
from src.services.token_service import TokenService
from src.services.proof_service import ProofService
from src.schemas import PublicOrderSummary, ProofUploadResponse, PublicProofResponse
from src.utils.rate_limiter import limiter, get_rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/order/{token}", response_model=PublicOrderSummary)
@limiter.limit(get_rate_limit())
async def get_order_by_token(
    request: Request,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Get order summary by QR token.
    This is the landing page for proof upload flow.
    Rate limited to prevent brute-force attacks.
    """
    token_service = TokenService(db)
    order = token_service.get_order_by_token(token)

    if not order:
        logger.warning(f"Invalid token access attempt: {token[:8]}...")
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail="TOKEN_INVALID",
        )

    return PublicOrderSummary(
        order_number=order.order_number,
        context=order.context,
        organization_name=order.organization.name,
        organization_logo=order.organization.logo_url,
    )


@router.post("/proof/{token}/upload", response_model=ProofUploadResponse)
@limiter.limit(get_rate_limit())
async def upload_proof(
    request: Request,
    token: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload proof of delivery image.
    Triggers dual notifications (sender + recipient) on success.
    Rate limited to prevent abuse.
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        logger.warning(f"Invalid file type for token {token[:8]}...: {file.content_type}")
        raise HTTPException(
            status_code=HTTP_422_UNPROCESSABLE_ENTITY,
            detail="UPLOAD_FAILED: Invalid file type. Only images are allowed.",
        )

    # Check file size (10MB limit)
    file_size = 0
    contents = await file.read()
    file_size = len(contents)
    await file.seek(0)  # Reset file position

    if file_size > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=HTTP_422_UNPROCESSABLE_ENTITY,
            detail="UPLOAD_FAILED: File too large. Maximum size is 10MB.",
        )

    proof_service = ProofService(db)

    try:
        result = await proof_service.create_proof(
            token=token,
            file=file,
            background_tasks=background_tasks,
        )
        logger.info(f"Proof uploaded successfully for token {token[:8]}...")
        return ProofUploadResponse(
            status=result["status"],
            proof_id=result["proof_id"],
            message=result["message"],
        )
    except ValueError as e:
        logger.warning(f"Token validation failed: {token[:8]}... - {e}")
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except IOError as e:
        logger.error(f"File save failed for token {token[:8]}...: {e}")
        raise HTTPException(
            status_code=500,
            detail="UPLOAD_FAILED: Failed to save file.",
        )
    except Exception as e:
        logger.exception(f"Unexpected error during proof upload for token {token[:8]}...")
        raise HTTPException(
            status_code=500,
            detail="UPLOAD_FAILED: An unexpected error occurred.",
        )


@router.get("/proof/{token}", response_model=PublicProofResponse)
@limiter.limit(get_rate_limit())
async def get_proof(
    request: Request,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Get proof data for public proof page.
    Shows proof photo with minimal order context (no PII).
    Rate limited.
    """
    token_service = TokenService(db)
    proof_data = token_service.get_proof_by_token(token)

    if not proof_data:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail="TOKEN_INVALID",
        )

    return PublicProofResponse(
        order_number=proof_data["order_number"],
        context=proof_data["context"],
        organization_name=proof_data["organization_name"],
        organization_logo=proof_data["organization_logo"],
        proof_url=proof_data["proof_url"],
        uploaded_at=proof_data["uploaded_at"],
    )
