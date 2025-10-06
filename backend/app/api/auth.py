"""Authentication API endpoints."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.core.db import get_db
from app.core.auth import get_current_user, get_optional_user
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models import User, Session as SessionModel
from app.schemas import (
    UserCreate,
    UserRead,
    LoginIn,
    TokenOut,
    RefreshIn,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create new user
    user = User(
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post("/login", response_model=TokenOut)
def login(credentials: LoginIn, db: Session = Depends(get_db)):
    """Authenticate user and return JWT tokens."""
    # Find user
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    # Create tokens
    access_token = create_access_token(user_id=user.id, role=user.role)
    refresh_jti = str(uuid.uuid4())
    refresh_token, _ = create_refresh_token(user_id=user.id, jti=refresh_jti)

    # Store refresh token session
    session = SessionModel(
        user_id=user.id,
        refresh_token_jti=refresh_jti,
        user_agent="web",  # Could extract from request headers
        revoked=False,
    )
    db.add(session)
    db.commit()

    return TokenOut(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenOut)
def refresh_token(refresh_in: RefreshIn, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    try:
        payload = decode_token(refresh_in.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        jti = payload.get("jti")
        user_id = payload.get("sub")

        # Check if session exists and is not revoked
        session = (
            db.query(SessionModel)
            .filter(
                SessionModel.refresh_token_jti == jti,
                SessionModel.user_id == user_id,
                SessionModel.revoked == False,
            )
            .first()
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or revoked refresh token",
            )

        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not found or deactivated",
            )

        # Create new tokens
        access_token = create_access_token(user_id=user.id, role=user.role)
        new_refresh_jti = str(uuid.uuid4())
        new_refresh_token, _ = create_refresh_token(
            user_id=user.id, jti=new_refresh_jti
        )

        # Revoke old session and create new one
        session.revoked = True
        new_session = SessionModel(
            user_id=user.id,
            refresh_token_jti=new_refresh_jti,
            user_agent=session.user_agent,
            revoked=False,
        )
        db.add(new_session)
        db.commit()

        return TokenOut(
            access_token=access_token,
            refresh_token=new_refresh_token,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    refresh_in: RefreshIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Logout user by revoking refresh token."""
    try:
        payload = decode_token(refresh_in.refresh_token)
        jti = payload.get("jti")

        # Revoke session
        session = (
            db.query(SessionModel)
            .filter(
                SessionModel.refresh_token_jti == jti,
                SessionModel.user_id == current_user.id,
            )
            .first()
        )

        if session:
            session.revoked = True
            db.commit()
    except Exception:
        pass  # Silently fail for logout

    return None


@router.get("/me", response_model=UserRead)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user
