from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from src.models.organization import PlanType
from src.schemas.order import OrderOut
from src.schemas.notification import NotificationLog


class OrganizationCreate(BaseModel):
    name: str
    plan_type: PlanType = PlanType.BASIC
    logo_url: Optional[str] = None
    # white-label (optional at create)
    brand_name: Optional[str] = None
    brand_logo_url: Optional[str] = None
    brand_domain: Optional[str] = None
    hide_saegim: Optional[bool] = None

    external_org_id: Optional[str] = None  # optional manual mapping (admin-key only)


class OrganizationUpdate(BaseModel):
    # internal
    name: Optional[str] = None
    logo_url: Optional[str] = None

    # white-label
    brand_name: Optional[str] = None
    brand_logo_url: Optional[str] = None
    brand_domain: Optional[str] = None
    hide_saegim: Optional[bool] = None

    # messaging templates (org override; optional)
    msg_alimtalk_template_sender: Optional[str] = None
    msg_alimtalk_template_recipient: Optional[str] = None
    msg_sms_template_sender: Optional[str] = None
    msg_sms_template_recipient: Optional[str] = None
    msg_kakao_template_code: Optional[str] = None
    msg_fallback_sms_enabled: Optional[bool] = None


class OrganizationOut(BaseModel):
    id: int
    name: str
    plan_type: PlanType
    logo_url: Optional[str] = None

    brand_name: Optional[str] = None
    brand_logo_url: Optional[str] = None
    brand_domain: Optional[str] = None
    hide_saegim: bool = False

    # messaging templates
    msg_alimtalk_template_sender: Optional[str] = None
    msg_alimtalk_template_recipient: Optional[str] = None
    msg_sms_template_sender: Optional[str] = None
    msg_sms_template_recipient: Optional[str] = None
    msg_kakao_template_code: Optional[str] = None
    msg_fallback_sms_enabled: Optional[bool] = None

    external_org_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrganizationLite(BaseModel):
    id: int
    name: str
    plan_type: PlanType
    logo_url: Optional[str] = None

    brand_name: Optional[str] = None
    brand_logo_url: Optional[str] = None
    brand_domain: Optional[str] = None
    hide_saegim: bool = False

    # messaging templates
    msg_alimtalk_template_sender: Optional[str] = None
    msg_alimtalk_template_recipient: Optional[str] = None
    msg_sms_template_sender: Optional[str] = None
    msg_sms_template_recipient: Optional[str] = None
    msg_kakao_template_code: Optional[str] = None
    msg_fallback_sms_enabled: Optional[bool] = None

    external_org_id: Optional[str] = None

    class Config:
        from_attributes = True


class MeOut(BaseModel):
    sub: str
    org_external_id: Optional[str] = None
    org_role: Optional[str] = None
    organization: Optional[OrganizationLite] = None

    class Config:
        from_attributes = True


class OrderDetailOut(BaseModel):
    order: OrderOut
    organization: OrganizationLite

    token: Optional[str] = None
    token_valid: bool = False

    upload_url: Optional[str] = None
    public_proof_url: Optional[str] = None
    short_public_url: Optional[str] = None

    proof_url: Optional[str] = None
    proof_uploaded_at: Optional[datetime] = None

    notifications: list[NotificationLog] = []


class LabelsIn(BaseModel):
    """Bulk label data request."""

    order_ids: list[int]
    ensure_tokens: bool = True
    # WARNING: force replaces existing token (breaks previously shared links)
    force: bool = False


class LabelOut(BaseModel):
    order_id: int
    order_number: str
    context: Optional[str] = None
    status: str

    token: str
    token_valid: bool

    upload_url: str
    public_proof_url: str

    organization_name: str
    organization_logo: Optional[str] = None
    hide_saegim: bool = False


class CsvImportError(BaseModel):
    row: int
    message: str


class CsvImportOut(BaseModel):
    created_count: int
    created_order_ids: list[int]
    errors: list[CsvImportError] = []


# --- Order List (Paginated) ---
class OrderListOut(BaseModel):
    """Paginated order list response."""
    items: list  # Will contain OrderOut objects
    total: int
    page: int
    limit: int
    total_pages: int


# --- Dashboard ---
class DashboardKPI(BaseModel):
    """Dashboard KPI data."""
    total_orders: int = 0
    proof_pending: int = 0
    proof_completed: int = 0
    notification_failed: int = 0


class RecentProof(BaseModel):
    """Recent proof item for dashboard."""
    order_id: int
    order_number: str
    context: Optional[str] = None
    proof_type: Optional[str] = None
    uploaded_at: datetime


class DashboardOut(BaseModel):
    """Dashboard response."""
    kpi: DashboardKPI
    recent_proofs: list[RecentProof] = []


# --- Order Update ---
class OrderUpdate(BaseModel):
    """Schema for updating an order."""
    order_number: Optional[str] = None
    context: Optional[str] = None
    sender_name: Optional[str] = None
    sender_phone: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None


# --- Notifications List ---
class NotificationListItem(BaseModel):
    """Notification item for list view."""
    id: int
    order_id: int
    order_number: str
    type: str  # SENDER or RECIPIENT
    channel: str  # ALIMTALK or SMS
    status: str
    message_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None


class NotificationListOut(BaseModel):
    """Paginated notification list response."""
    items: list[NotificationListItem]
    total: int
    page: int
    limit: int
    total_pages: int


class NotificationStats(BaseModel):
    """Notification statistics."""
    success: int = 0
    failed: int = 0
    pending: int = 0


# --- Bulk Token Generation ---
class BulkTokenRequest(BaseModel):
    """Request for bulk token generation."""
    order_ids: list[int]
    force: bool = False  # WARNING: force replaces existing tokens


class BulkTokenResult(BaseModel):
    """Result for a single order in bulk token generation."""
    order_id: int
    order_number: str
    success: bool
    token: Optional[str] = None
    token_valid: bool = False
    upload_url: Optional[str] = None
    public_proof_url: Optional[str] = None
    error: Optional[str] = None


class BulkTokenResponse(BaseModel):
    """Response for bulk token generation."""
    total: int
    success_count: int
    failed_count: int
    results: list[BulkTokenResult]


# --- Analytics (Detailed Statistics) ---
class DailyTrend(BaseModel):
    """Daily trend data point."""
    date: str  # YYYY-MM-DD
    orders: int = 0
    proofs: int = 0
    notifications_sent: int = 0
    notifications_failed: int = 0


class ChannelBreakdown(BaseModel):
    """Notification breakdown by channel."""
    alimtalk_sent: int = 0
    alimtalk_failed: int = 0
    sms_sent: int = 0
    sms_failed: int = 0


class ProofTiming(BaseModel):
    """Proof upload timing statistics."""
    avg_minutes: Optional[float] = None  # Average time from token issue to upload
    min_minutes: Optional[float] = None
    max_minutes: Optional[float] = None
    median_minutes: Optional[float] = None


class AnalyticsOut(BaseModel):
    """Detailed analytics response."""
    # Summary
    total_orders: int = 0
    total_proofs: int = 0
    proof_completion_rate: float = 0.0  # 0.0 ~ 1.0

    # Notification stats
    total_notifications: int = 0
    notification_success_rate: float = 0.0  # 0.0 ~ 1.0
    channel_breakdown: ChannelBreakdown = ChannelBreakdown()

    # Timing
    proof_timing: ProofTiming = ProofTiming()

    # Trends (daily)
    daily_trends: list[DailyTrend] = []

    # Period info
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD


# --- Reminder Notifications ---
class ReminderRequest(BaseModel):
    """Request for sending reminder notifications."""
    order_ids: Optional[list[int]] = None  # Specific orders, or None for all pending
    hours_since_token: int = 24  # Only remind orders with tokens issued > N hours ago
    max_reminders: int = 1  # Max reminders per order (prevents spam)


class ReminderResult(BaseModel):
    """Result for a single reminder."""
    order_id: int
    order_number: str
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None


class ReminderResponse(BaseModel):
    """Response for bulk reminder sending."""
    total: int
    sent_count: int
    skipped_count: int
    failed_count: int
    results: list[ReminderResult]
