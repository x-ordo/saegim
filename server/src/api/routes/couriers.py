"""Courier management API routes.

Phase 2: Courier Management
- CRUD for couriers (delivery drivers)
- PIN management
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from src.api.deps import AuthContext, get_auth_context, get_db
from src.services.courier_service import CourierService
from src.schemas.courier import (
    CourierCreate,
    CourierUpdate,
    CourierUpdatePin,
    CourierResponse,
    CourierListResponse,
)


router = APIRouter(prefix="/admin/couriers", tags=["couriers"])


@router.get("", response_model=CourierListResponse)
def list_couriers(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    q: Optional[str] = Query(None, description="Search by name or vehicle number"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List couriers with filtering and pagination."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    items, total = CourierService(db).list_couriers(
        organization_id=ctx.organization_id,
        is_active=is_active,
        q=q,
        page=page,
        page_size=page_size,
    )
    return CourierListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{courier_id}", response_model=CourierResponse)
def get_courier(
    courier_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get a courier by ID."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    return CourierService(db).get_courier_response(
        courier_id=courier_id,
        organization_id=ctx.organization_id,
    )


@router.post("", response_model=CourierResponse)
def create_courier(
    payload: CourierCreate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Create a new courier."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    return CourierService(db).create_courier(
        payload=payload,
        organization_id=ctx.organization_id,
    )


@router.put("/{courier_id}", response_model=CourierResponse)
def update_courier(
    courier_id: int,
    payload: CourierUpdate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Update a courier."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    return CourierService(db).update_courier(
        courier_id=courier_id,
        payload=payload,
        organization_id=ctx.organization_id,
    )


@router.put("/{courier_id}/pin", response_model=CourierResponse)
def update_courier_pin(
    courier_id: int,
    payload: CourierUpdatePin,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Update a courier's PIN."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    return CourierService(db).update_courier_pin(
        courier_id=courier_id,
        pin=payload.pin,
        organization_id=ctx.organization_id,
    )


@router.delete("/{courier_id}")
def delete_courier(
    courier_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Delete a courier."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    CourierService(db).delete_courier(
        courier_id=courier_id,
        organization_id=ctx.organization_id,
    )
    return {"status": "ok"}
