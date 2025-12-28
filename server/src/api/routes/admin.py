from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, Query, HTTPException, UploadFile, File
import csv
import io
from sqlalchemy.orm import Session

from src.api.deps import AuthContext, get_auth_context, get_db
from src.services.admin_service import AdminService
from src.schemas.admin import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationOut,
    OrderDetailOut,
    MeOut,
    LabelsIn,
    LabelOut,
    CsvImportOut,
)
from src.schemas.order import OrderCreate, OrderOut
from src.models.organization import Organization

router = APIRouter(prefix="/admin", tags=["admin"])


def _is_org_admin(role: Optional[str]) -> bool:
    if not role:
        return False
    r = role.strip().lower()
    if r in {"admin", "owner"}:
        return True
    # Clerk often uses "org:admin" / "org:basic_member"
    if r.endswith(":admin") or r.endswith(":owner"):
        return True
    return False


@router.get("/me", response_model=MeOut)
def get_me(
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    org = None
    if ctx.organization_id is not None:
        org = db.query(Organization).filter(Organization.id == ctx.organization_id).first()
    return MeOut(
        sub=ctx.sub,
        org_external_id=ctx.org_external_id,
        org_role=ctx.org_role,
        organization=org,
    )


@router.get("/org", response_model=OrganizationOut)
def get_org_settings(
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    org = db.query(Organization).filter(Organization.id == ctx.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="ORG_NOT_FOUND")
    return org


@router.put("/org", response_model=OrganizationOut)
def update_org_settings(
    payload: OrganizationUpdate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    # Admin-key always allowed; otherwise only org admins.
    if not (ctx.is_admin_key or _is_org_admin(ctx.org_role)):
        raise HTTPException(status_code=403, detail="FORBIDDEN")
    return AdminService(db).update_organization(ctx.organization_id, payload)


@router.get("/organizations", response_model=list[OrganizationOut])
def list_organizations(
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    # Bearer token users get their own org only (multi-tenant).
    # Admin-key without X-Org-Id can see all orgs (dev/platform).
    return AdminService(db).list_organizations(scope_org_id=ctx.organization_id)


@router.post("/organizations", response_model=OrganizationOut)
def create_organization(
    payload: OrganizationCreate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    if not ctx.is_admin_key:
        # In production, org is provisioned via external IdP (e.g. Clerk Organizations).
        # Keep this endpoint for admin-key only.
        raise HTTPException(status_code=403, detail="FORBIDDEN")
    return AdminService(db).create_organization(payload)


@router.get("/orders", response_model=list[OrderOut])
def list_orders(
    organization_id: Optional[int] = Query(default=None),
    q: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    day: Optional[str] = Query(default=None, description="YYYY-MM-DD (Asia/Seoul)"),
    today: bool = Query(default=False),
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    # Tenant scoping: bearer token forces ctx.organization_id.
    org_id = ctx.organization_id if ctx.organization_id is not None else organization_id
    return AdminService(db).list_orders(organization_id=org_id, q=q, status=status, day=day, today=today)


@router.post("/orders/import/csv", response_model=CsvImportOut)
def import_orders_csv(
    file: UploadFile = File(...),
    strict: bool = Query(default=False),
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Import orders from a CSV file.

    Expected header columns (case-insensitive):
      - order_number (or order_no)
      - context (optional)
      - sender_name (or buyer_name)
      - sender_phone (or buyer_phone)
      - recipient_name (or receiver_name) (optional)
      - recipient_phone (or receiver_phone) (optional)
    """

    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="CSV_FILE_REQUIRED")

    raw = file.file.read()
    try:
        text = raw.decode("utf-8-sig")
    except Exception:
        # allow cp949 in KR field ops
        text = raw.decode("cp949", errors="replace")

    reader = csv.DictReader(io.StringIO(text))
    rows: list[dict] = []
    for r in reader:
        # normalize keys to snake_lower
        nr = {str(k).strip().lower(): (v.strip() if isinstance(v, str) else v) for k, v in (r or {}).items()}
        rows.append(nr)

    created_ids, errors = AdminService(db).import_orders_csv(rows=rows, organization_id=ctx.organization_id, strict=strict)
    return {
        "created_count": len(created_ids),
        "created_order_ids": created_ids,
        "errors": errors,
    }


@router.post("/orders", response_model=OrderOut)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    return AdminService(db).create_order(payload, organization_id=ctx.organization_id)


@router.get("/orders/{order_id}", response_model=OrderDetailOut)
def get_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    return AdminService(db).get_order_detail(order_id, scope_org_id=ctx.organization_id)


@router.post("/orders/{order_id}/token")
def issue_order_token(
    order_id: int,
    force: bool = Query(default=False),
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    return AdminService(db).issue_token(order_id, scope_org_id=ctx.organization_id, force=force)


@router.post("/orders/{order_id}/notify")
async def resend_notification(
    order_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    return await AdminService(db).resend_notification(order_id, background_tasks, scope_org_id=ctx.organization_id)


@router.post("/orders/labels", response_model=list[LabelOut])
def get_labels(
    payload: LabelsIn,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    return AdminService(db).get_labels(
        order_ids=payload.order_ids,
        scope_org_id=ctx.organization_id,
        ensure_tokens=payload.ensure_tokens,
        force=payload.force,
    )
