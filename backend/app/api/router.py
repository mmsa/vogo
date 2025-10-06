"""Main API router that includes all sub-routers."""

from fastapi import APIRouter
from app.api import (
    auth,
    admin,
    users,
    memberships,
    memberships_discover,
    memberships_validate,
    user_memberships,
    recommendations,
    check,
    llm,
    benefits,
)

api_router = APIRouter()

# Authentication & Admin
api_router.include_router(auth.router)
api_router.include_router(admin.router)

# Core APIs
api_router.include_router(users.router)
api_router.include_router(memberships.router)
api_router.include_router(memberships_discover.router)
api_router.include_router(memberships_validate.router)
api_router.include_router(user_memberships.router)
api_router.include_router(recommendations.router)
api_router.include_router(check.router)
api_router.include_router(llm.router)
api_router.include_router(benefits.router)
