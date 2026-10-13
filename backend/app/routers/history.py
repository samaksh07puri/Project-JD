"""History router: per-user saved customization results."""
from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import HistoryItem, User
from ..schemas import HistoryCreate, HistoryIdsRequest, HistoryRead
from ..security import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])

MAX_ITEMS = 50


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime | None:
    """SQLite returns naive datetimes; tag them as UTC so clients convert correctly."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _to_read(item: HistoryItem) -> HistoryRead:
    try:
        response = json.loads(item.payload)
    except json.JSONDecodeError:
        response = {}
    return HistoryRead(
        id=item.id,
        created_at=_as_utc(item.created_at),
        file_name=item.file_name,
        score=item.score,
        jd_preview=item.jd_preview,
        provider=item.provider,
        model=item.model,
        response=response,
        deleted_at=_as_utc(item.deleted_at),
    )


@router.get("", response_model=list[HistoryRead])
def list_history(
    db: Session = Depends(get_db), current: User = Depends(get_current_user)
) -> list[HistoryRead]:
    items = db.scalars(
        select(HistoryItem)
        .where(HistoryItem.user_id == current.id, HistoryItem.deleted_at.is_(None))
        .order_by(HistoryItem.created_at.desc(), HistoryItem.id.desc())
        .limit(MAX_ITEMS)
    ).all()
    return [_to_read(item) for item in items]


@router.get("/deleted", response_model=list[HistoryRead])
def list_deleted_history(
    db: Session = Depends(get_db), current: User = Depends(get_current_user)
) -> list[HistoryRead]:
    items = db.scalars(
        select(HistoryItem)
        .where(HistoryItem.user_id == current.id, HistoryItem.deleted_at.is_not(None))
        .order_by(HistoryItem.deleted_at.desc(), HistoryItem.id.desc())
        .limit(MAX_ITEMS)
    ).all()
    return [_to_read(item) for item in items]


@router.post("/restore-all", response_model=list[HistoryRead])
def restore_all_history(
    db: Session = Depends(get_db), current: User = Depends(get_current_user)
) -> list[HistoryRead]:
    items = db.scalars(
        select(HistoryItem).where(
            HistoryItem.user_id == current.id, HistoryItem.deleted_at.is_not(None)
        )
    ).all()
    for item in items:
        item.deleted_at = None
    db.commit()
    return [_to_read(item) for item in items]


@router.post("/restore", response_model=list[HistoryRead])
def restore_history_bulk(
    payload: HistoryIdsRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[HistoryRead]:
    """Recover several recycle-bin items at once."""
    if not payload.ids:
        return []
    items = db.scalars(
        select(HistoryItem).where(
            HistoryItem.user_id == current.id, HistoryItem.id.in_(payload.ids)
        )
    ).all()
    for item in items:
        item.deleted_at = None
    db.commit()
    return [_to_read(item) for item in items]


@router.post("/delete", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_history_permanent(
    payload: HistoryIdsRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    """Permanently delete several recycle-bin items at once."""
    if not payload.ids:
        return
    items = db.scalars(
        select(HistoryItem).where(
            HistoryItem.user_id == current.id, HistoryItem.id.in_(payload.ids)
        )
    ).all()
    for item in items:
        db.delete(item)
    db.commit()


@router.post("/{item_id}/restore", response_model=HistoryRead)
def restore_history(
    item_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> HistoryRead:
    item = db.get(HistoryItem, item_id)
    if item is None or item.user_id != current.id:
        raise HTTPException(status_code=404, detail="History item not found.")
    item.deleted_at = None
    db.commit()
    db.refresh(item)
    return _to_read(item)


@router.post("", response_model=HistoryRead, status_code=status.HTTP_201_CREATED)
def create_history(
    payload: HistoryCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> HistoryRead:
    item = HistoryItem(
        user_id=current.id,
        file_name=payload.file_name[:255],
        score=payload.score,
        jd_preview=payload.jd_preview,
        provider=payload.provider[:64],
        model=payload.model[:128],
        payload=json.dumps(payload.response),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_read(item)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def clear_history(
    db: Session = Depends(get_db), current: User = Depends(get_current_user)
) -> None:
    """Move every active item to the recycle bin."""
    items = db.scalars(
        select(HistoryItem).where(
            HistoryItem.user_id == current.id, HistoryItem.deleted_at.is_(None)
        )
    ).all()
    now = _utcnow()
    for item in items:
        item.deleted_at = now
    db.commit()


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_history(
    item_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    """Move a single item to the recycle bin."""
    item = db.get(HistoryItem, item_id)
    if item is None or item.user_id != current.id:
        raise HTTPException(status_code=404, detail="History item not found.")
    item.deleted_at = _utcnow()
    db.commit()
