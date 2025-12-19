"""
API dependencies.
"""
from typing import Generator

from sqlalchemy.orm import Session

from src.core.database import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """
    Dependency for getting DB session.
    This is a copy of the one in core/database.py for convenience.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
