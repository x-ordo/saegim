"""Driver (courier) app API routes.

Phase 3: Courier PWA
- PIN authentication
- Delivery list/detail
- QR token lookup
- Upload history
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Header, HTTPException
from sqlalchemy.orm import Session

from src.api.deps import get_db
from src.services.driver_service import DriverService
from src.schemas.driver import (
    DriverLoginRequest,
    DriverLoginResponse,
    DriverMeResponse,
    DeliveryListResponse,
    DeliveryDetailResponse,
    UploadHistoryResponse,
)


router = APIRouter(prefix="/driver", tags=["driver"])


def get_driver_auth(
    authorization: str = Header(..., description="Bearer token"),
    db: Session = Depends(get_db),
):
    """Dependency to validate driver session token."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="INVALID_AUTH_HEADER")

    token = authorization[7:]  # Remove "Bearer " prefix
    service = DriverService(db)
    courier, org = service.validate_session(token)
    return {"courier": courier, "org": org, "token": token, "db": db}


@router.post("/auth/login", response_model=DriverLoginResponse)
def login(
    payload: DriverLoginRequest,
    user_agent: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Authenticate courier with phone + PIN."""
    return DriverService(db).login_with_pin(
        phone=payload.phone,
        pin=payload.pin,
        device_info=user_agent,
    )


@router.post("/auth/logout")
def logout(
    auth: dict = Depends(get_driver_auth),
):
    """Logout and invalidate session."""
    DriverService(auth["db"]).logout(auth["token"])
    return {"status": "ok"}


@router.get("/me", response_model=DriverMeResponse)
def get_me(
    auth: dict = Depends(get_driver_auth),
):
    """Get current courier info."""
    return DriverService(auth["db"]).get_me(
        courier=auth["courier"],
        org=auth["org"],
    )


@router.get("/deliveries", response_model=DeliveryListResponse)
def list_deliveries(
    today_only: bool = Query(True, description="Show only today's deliveries"),
    status: Optional[str] = Query(None, description="Filter by status"),
    auth: dict = Depends(get_driver_auth),
):
    """List deliveries for the courier's organization."""
    return DriverService(auth["db"]).list_deliveries(
        organization_id=auth["org"].id,
        today_only=today_only,
        status_filter=status,
    )


@router.get("/deliveries/{order_id}", response_model=DeliveryDetailResponse)
def get_delivery(
    order_id: int,
    auth: dict = Depends(get_driver_auth),
):
    """Get delivery detail by order ID."""
    return DriverService(auth["db"]).get_delivery_detail(
        order_id=order_id,
        organization_id=auth["org"].id,
    )


@router.get("/deliveries/token/{token}", response_model=DeliveryDetailResponse)
def get_delivery_by_token(
    token: str,
    auth: dict = Depends(get_driver_auth),
):
    """Get delivery detail by QR token (from scan)."""
    return DriverService(auth["db"]).get_delivery_by_token(
        token=token,
        organization_id=auth["org"].id,
    )


@router.get("/history", response_model=UploadHistoryResponse)
def get_upload_history(
    limit: int = Query(50, ge=1, le=100, description="Max items to return"),
    auth: dict = Depends(get_driver_auth),
):
    """Get recent upload history."""
    return DriverService(auth["db"]).get_upload_history(
        organization_id=auth["org"].id,
        limit=limit,
    )
