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
    check_semantic,
    llm,
    benefits,
    ai,
    chat,
    analytics,
    dev_admin,
    bank_statement,
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
api_router.include_router(check_semantic.router)  # Semantic matching
api_router.include_router(llm.router)
api_router.include_router(benefits.router)

# AI Services & Analytics
api_router.include_router(ai.router)
api_router.include_router(chat.router)
api_router.include_router(analytics.router)

# Bank Statement Processing
api_router.include_router(bank_statement.router)

# Development utilities (TODO: Remove in production)
api_router.include_router(dev_admin.router)
