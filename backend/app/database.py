"""SQLAlchemy engine, session factory and metadata for user + history storage."""
from __future__ import annotations

import logging
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

logger = logging.getLogger("resume_aid")

settings = get_settings()


def _normalize_url(url: str) -> str:
    """Render/Heroku hand out `postgres://`; SQLAlchemy 2.x needs `postgresql://`."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


DATABASE_URL = _normalize_url(settings.database_url)
_IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _IS_SQLITE else {},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Iterator[Session]:
    """FastAPI dependency yielding a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_history_columns() -> None:
    """Add columns introduced after the initial release to existing databases."""
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    if "history_items" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("history_items")}
    if "deleted_at" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE history_items ADD COLUMN deleted_at TIMESTAMP"))


def init_db() -> None:
    """Create tables on startup (no-op if they already exist).

    On read-only serverless filesystems (e.g. Vercel) a local SQLite file cannot
    be created. That must not take the whole API down: customization works
    without a database, so we log a warning and continue. Set DATABASE_URL to a
    Postgres DSN to keep accounts and history.
    """
    from . import models  # noqa: F401  (register models before create_all)

    try:
        Base.metadata.create_all(bind=engine)
        _ensure_history_columns()
    except Exception as exc:  # noqa: BLE001 - never block startup on the database
        logger.warning(
            "Database initialisation skipped (%s). Auth and history need a "
            "writable DATABASE_URL such as a Postgres DSN.",
            exc,
        )
