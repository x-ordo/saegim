import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String, Text, func
from sqlalchemy.orm import relationship

from src.core.database import Base


class PlanType(str, enum.Enum):
    BASIC = "BASIC"
    PRO = "PRO"


class Organization(Base):
    """Organization (업체) model.

    Multi-tenant scope unit.

    White-labeling:
      - brand_name / brand_logo_url: 공개 페이지에 표시할 값 (없으면 name/logo_url로 fallback)
      - brand_domain: 향후 커스텀 도메인 연결용 (v1 저장만)
      - hide_saegim: 공개 페이지에서 '새김' 노출을 최소화
    """

    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)

    # internal
    name = Column(String(255), nullable=False)
    plan_type = Column(Enum(PlanType), default=PlanType.BASIC, nullable=False)
    logo_url = Column(String(500), nullable=True)

    # public/white-label
    brand_name = Column(String(255), nullable=True)
    brand_logo_url = Column(String(500), nullable=True)
    brand_domain = Column(String(255), nullable=True)
    hide_saegim = Column(Boolean, default=False, nullable=False)

    # messaging templates (org override)
    # Placeholders supported: {brand}, {url}, {order}, {context}, {sender}, {recipient}
    msg_alimtalk_template_sender = Column(Text, nullable=True)
    msg_alimtalk_template_recipient = Column(Text, nullable=True)
    msg_sms_template_sender = Column(Text, nullable=True)
    msg_sms_template_recipient = Column(Text, nullable=True)

    # Optional per-org Kakao template code (must match registered template)
    msg_kakao_template_code = Column(String(100), nullable=True)

    # Optional per-org fallback override (None => use global)
    msg_fallback_sms_enabled = Column(Boolean, nullable=True)

    # external tenant id (e.g. Clerk organization id)
    external_org_id = Column(String(255), nullable=True, unique=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    orders = relationship("Order", back_populates="organization")
    products = relationship("Product", back_populates="organization")
    product_categories = relationship("ProductCategory", back_populates="organization")
    couriers = relationship("Courier", back_populates="organization")
