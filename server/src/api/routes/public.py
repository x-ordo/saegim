import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from starlette.status import HTTP_404_NOT_FOUND, HTTP_422_UNPROCESSABLE_ENTITY, HTTP_429_TOO_MANY_REQUESTS

from src.core.database import get_db
from src.core.config import settings
from src.services.token_service import TokenService
from src.services.proof_service import ProofService
from src.services.short_link_service import ShortLinkService
from src.services.short_link_service import ShortLinkService
from src.schemas import PublicOrderSummary, ProofUploadResponse, PublicProofResponse, ProofItem
from src.models import ProofType
from src.utils.rate_limiter import limiter, get_rate_limit
from src.core.config import settings

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

    # Check proof status
    has_before = any(p.proof_type == ProofType.BEFORE for p in order.proofs)
    has_after = any(p.proof_type == ProofType.AFTER for p in order.proofs)

    return PublicOrderSummary(
        order_number=order.order_number,
        context=order.context,
        organization_name=(order.organization.brand_name or order.organization.name),
        organization_logo=(order.organization.brand_logo_url or order.organization.logo_url),
        hide_saegim=bool(order.organization.hide_saegim),
        asset_meta=order.asset_meta,
        has_before_proof=has_before,
        has_after_proof=has_after,
    )


@router.post("/proof/{token}/upload", response_model=ProofUploadResponse)
@limiter.limit(get_rate_limit())
async def upload_proof(
    request: Request,
    token: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    proof_type: ProofType = ProofType.AFTER,
    db: Session = Depends(get_db),
):
    """
    Upload proof image with type (BEFORE, AFTER, RECEIPT, DAMAGE, OTHER).
    Triggers dual notifications only for AFTER type.
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
            proof_type=proof_type,
        )
        logger.info(f"{proof_type.value} proof uploaded successfully for token {token[:8]}...")
        return ProofUploadResponse(
            status=result["status"],
            proof_id=result["proof_id"],
            proof_type=result["proof_type"],
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
        hide_saegim=proof_data.get("hide_saegim", False),
        asset_meta=proof_data.get("asset_meta"),
        proofs=[ProofItem(**p) for p in proof_data["proofs"]],
        # Backward compatibility
        proof_url=proof_data.get("proof_url"),
        uploaded_at=proof_data.get("uploaded_at"),
    )


@router.get("/s/{code}")
@limiter.limit(get_rate_limit())
async def resolve_short(
    request: Request,
    code: str,
    db: Session = Depends(get_db),
):
    """Resolve short code to canonical public proof URL.

    - Returns JSON by default: {"target_url": ...}
    - If the client prefers HTML, returns 302 redirect.
    """
    code = (code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=HTTP_422_UNPROCESSABLE_ENTITY, detail="SHORT_CODE_REQUIRED")

    link = ShortLinkService(db).resolve(code)
    if not link:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="SHORT_NOT_FOUND")

    # Prefer request host for white-label domain routing, fallback to WEB_BASE_URL
    xf_proto = request.headers.get("x-forwarded-proto")
    xf_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    if xf_host:
        proto = (xf_proto or request.url.scheme or "https").split(",")[0].strip()
        host = xf_host.split(",")[0].strip()
        base = f"{proto}://{host}".rstrip("/")
    else:
        base = settings.WEB_BASE_URL.rstrip("/")
    target_url = f"{base}{link.target_path}/{link.target_token}"

    accept = request.headers.get("accept", "")
    if "text/html" in accept and "application/json" not in accept:
        return RedirectResponse(url=target_url, status_code=302)

    return {"target_url": target_url}
