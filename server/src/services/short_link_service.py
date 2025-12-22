import secrets
from typing import Optional

from sqlalchemy.orm import Session

from src.models.short_link import ShortLink


_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"  # no ambiguous 0/O/1/I


def _generate_code(length: int = 7) -> str:
    return "".join(_ALPHABET[secrets.randbelow(len(_ALPHABET))] for _ in range(length))


class ShortLinkService:
    """Create/resolve short links.

    v1 rules
    - one short link per order (uq_short_links_order_id)
    - target is always public proof page (/p/{token})
    """

    def __init__(self, db: Session):
        self.db = db

    def get_existing_for_order(self, order_id: int) -> Optional[ShortLink]:
        return self.db.query(ShortLink).filter(ShortLink.order_id == order_id).first()

    def get_or_create_public_proof(self, order_id: int, token: str) -> ShortLink:
        existing = self.get_existing_for_order(order_id)
        if existing:
            # if token changed (force reissue), update target
            if existing.target_token != token:
                existing.target_token = token
                self.db.commit()
                self.db.refresh(existing)
            return existing

        # create unique code (retry a few times on collision)
        for _ in range(12):
            code = _generate_code(7)
            if not self.db.query(ShortLink).filter(ShortLink.code == code).first():
                link = ShortLink(code=code, order_id=order_id, target_token=token, target_path="/p")
                self.db.add(link)
                self.db.commit()
                self.db.refresh(link)
                return link

        # last resort
        code = _generate_code(9)
        link = ShortLink(code=code, order_id=order_id, target_token=token, target_path="/p")
        self.db.add(link)
        self.db.commit()
        self.db.refresh(link)
        return link

    def resolve(self, code: str) -> Optional[ShortLink]:
        if not code:
            return None
        link = self.db.query(ShortLink).filter(ShortLink.code == code).first()
        if not link:
            return None

        # best-effort metrics
        link.click_count = int(link.click_count or 0) + 1
        # use server timestamp
        try:
            from sqlalchemy import func

            link.last_clicked_at = func.now()
        except Exception:
            pass
        self.db.commit()
        return link
