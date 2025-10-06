"""Authentication schemas."""

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserCreate(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    password: str = Field(
        ..., min_length=8, description="Password must be at least 8 characters"
    )


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)


class UserRead(BaseModel):
    """Schema for reading user data."""

    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginIn(BaseModel):
    """Schema for login request."""

    email: EmailStr
    password: str


class TokenOut(BaseModel):
    """Schema for authentication token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    """Schema for token refresh request."""

    refresh_token: str


class AdminUserUpdate(BaseModel):
    """Schema for admin updating user (role, active status)."""

    role: Optional[str] = Field(None, pattern="^(user|admin)$")
    is_active: Optional[bool] = None


class UserListResponse(BaseModel):
    """Schema for paginated user list."""

    users: list[UserRead]
    total: int
    page: int
    page_size: int
