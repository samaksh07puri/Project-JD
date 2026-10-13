"""Auth router: signup, login, current-user and password recovery endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models import User
from ..schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserRead,
)
from ..security import (
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    get_current_user,
    hash_password,
    verify_password,
)
from ..services.email import EmailSendError, send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


def _token_for(user: User) -> TokenResponse:
    return TokenResponse(access_token=create_access_token(user.id), user=UserRead.model_validate(user))


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)) -> TokenResponse:
    email = payload.email.lower()
    existing = db.scalar(select(User).where(func.lower(User.email) == email))
    if existing is not None:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(email=email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_for(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    email = payload.email.lower()
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return _token_for(user)


@router.get("/me", response_model=UserRead)
def me(current: User = Depends(get_current_user)) -> User:
    return current


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest, db: Session = Depends(get_db)
) -> ForgotPasswordResponse:
    """Email a password reset link, but only for a registered address."""
    email = payload.email.lower()
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if user is None:
        raise HTTPException(
            status_code=404, detail="No account found with that email address."
        )

    token = create_password_reset_token(user.id)
    reset_url = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"

    try:
        delivered = send_password_reset_email(user.email, reset_url)
    except EmailSendError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return ForgotPasswordResponse(
        message="A password recovery email has been sent to your inbox.",
        dev_reset_url=None if delivered else reset_url,
    )


@router.post("/reset-password", response_model=ForgotPasswordResponse)
def reset_password(
    payload: ResetPasswordRequest, db: Session = Depends(get_db)
) -> ForgotPasswordResponse:
    """Set a new password using the token from the recovery email."""
    user_id = decode_password_reset_token(payload.token)
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=400, detail="This reset link is no longer valid.")

    user.hashed_password = hash_password(payload.password)
    db.add(user)
    db.commit()
    return ForgotPasswordResponse(message="Your password has been reset. You can now log in.")
